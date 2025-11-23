/**
 * Release Creation Service
 * 
 * Handles the complete release creation flow:
 * 1. Mandatory field validation
 * 2. Optional field validation  
 * 3. baseBranch resolution for hotfix
 * 4. create a release record
 * 5. link platforms and targets to release (with per-platform versioning)
 * 6. create cron job
 * 7. create stage 1 tasks
 * 8. state history for this release/cron
 */

import { v4 as uuidv4 } from 'uuid';
import { ReleaseRepository } from '../../models/release/release.repository';
import { ReleaseToPlatformsRepository } from '../../models/release/release-to-platforms.repository';
import { ReleaseToTargetsRepository } from '../../models/release/release-to-targets.repository';
import { CronJobRepository } from '../../models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../models/release/release-task.repository';
import { StateHistoryRepository } from '../../models/release/state-history.repository';
import { ReleaseType, PlatformName, TargetName, TaskType, TaskStage, TaskIdentifier, StateChangeType } from '../../storage/release/release-models';
import { hasSequelize, StorageWithSequelize } from '../../routes/release/release-types';
import * as storageTypes from '../../storage/storage';

export interface CreateReleasePayload {
  tenantId: string;
  accountId: string;
  platformVersions: Record<string, string>; // e.g., { "ANDROID": "v6.5.0", "IOS": "v6.3.0" }
  targets: string[]; // e.g., ["ANDROID_PLAYSTORE", "IOS_APPSTORE"]
  type: ReleaseType;
  targetReleaseDate: Date;
  plannedDate: Date;
  baseBranch: string;
  baseVersion?: string;
  parentId?: string;
  releasePilotAccountId?: string;
  kickOffReminderDate?: Date;
  customIntegrationConfigs?: Record<string, unknown>;
  regressionBuildSlots?: any[];
  preCreatedBuilds?: any[];
  cronConfig?: {
    kickOffReminder?: boolean;
    preRegressionBuilds?: boolean;
    automationBuilds?: boolean;
    automationRuns?: boolean;
    testFlightBuilds?: boolean;
  };
  regressionTimings?: string;
}

export interface CreateReleaseResult {
  release: any;
  cronJob: any;
  stage1TaskIds: string[];
}

export class ReleaseCreationService {
  constructor(
    private readonly releaseRepo: ReleaseRepository,
    private readonly releaseToPlatformsRepo: ReleaseToPlatformsRepository,
    private readonly releaseToTargetsRepo: ReleaseToTargetsRepository,
    private readonly cronJobRepo: CronJobRepository,
    private readonly releaseTaskRepo: ReleaseTaskRepository,
    private readonly stateHistoryRepo: StateHistoryRepository,
    private readonly storage: storageTypes.Storage
  ) {}

  /**
   * Complete release creation flow
   */
  async createRelease(payload: CreateReleasePayload): Promise<CreateReleaseResult> {
    // Step 3: baseBranch resolution for HOTFIX
    let baseBranch = payload.baseBranch;
    let parentId = payload.parentId;

    if (payload.type === ReleaseType.HOTFIX && payload.baseVersion) {
      const baseRelease = await this.releaseRepo.findByBaseVersion(payload.baseVersion, payload.tenantId);
      if (baseRelease) {
        baseBranch = baseRelease.branchRelease || payload.baseBranch;
        parentId = baseRelease.id;
      }
    }

    // Step 4: Create release record
    const releaseId = uuidv4();
    // Generate a unique release key (e.g., "REL-ABC123")
    const releaseKey = `REL-${uuidv4().substring(0, 8).toUpperCase()}`;
    const releasePilotAccountId = payload.releasePilotAccountId || payload.accountId;

    const release = await this.releaseRepo.create({
      id: releaseId,
      tenantId: payload.tenantId,
      accountId: payload.accountId,
      type: payload.type,
      targetReleaseDate: payload.targetReleaseDate,
      plannedDate: payload.plannedDate,
      baseBranch,
      baseVersion: payload.baseVersion,
      parentId: parentId || null,
      releasePilotAccountId,
      kickOffReminderDate: payload.kickOffReminderDate,
      customIntegrationConfigs: payload.customIntegrationConfigs,
      regressionBuildSlots: payload.regressionBuildSlots,
      preCreatedBuilds: payload.preCreatedBuilds,
      releaseKey
    });

    // Step 5: Link platforms and targets to release (with per-platform versioning)
    const platformRecords = await this.linkPlatformsToRelease(releaseId, payload.platformVersions);
    const targetRecords = await this.linkTargetsToRelease(releaseId, payload.targets);

    // Step 6: Create cron job
    const cronJobId = uuidv4();
    const cronConfig = payload.cronConfig || {
      kickOffReminder: true,
      preRegressionBuilds: false,
      automationBuilds: false,
      automationRuns: false
    };

    const cronJob = await this.cronJobRepo.create({
      id: cronJobId,
      releaseId,
      accountId: payload.accountId,
      cronConfig,
      upcomingRegressions: payload.regressionBuildSlots,
      regressionTimings: payload.regressionTimings
    });

    // Step 7: Create Stage 1 tasks
    const stage1TaskIds = await this.createStage1Tasks(
      releaseId,
      payload.accountId,
      cronConfig
    );

    // Step 8: Create state history
    await this.createStateHistory(releaseId, payload.accountId, releaseKey, payload.platformVersions);

    return {
      release,
      cronJob,
      stage1TaskIds
    };
  }

  /**
   * Step 5a: Link platforms to release with per-platform versioning
   * Creates entries in releaseToPlatforms junction table
   */
  private async linkPlatformsToRelease(
    releaseId: string,
    platformVersions: Record<string, string>
  ): Promise<any[]> {
    const platformRecords = [];
    
    for (const [platformName, version] of Object.entries(platformVersions)) {
      const record = await this.releaseToPlatformsRepo.create({
        id: uuidv4(),
        releaseId,
        platform: platformName as PlatformName,
        version
      });
      platformRecords.push(record);
    }

    return platformRecords;
  }

  /**
   * Step 5b: Link targets to release
   * Creates entries in releaseToTargets junction table
   */
  private async linkTargetsToRelease(releaseId: string, targetNames: string[]): Promise<any[]> {
    const targetRecords = [];
    
    for (const targetName of targetNames) {
      const record = await this.releaseToTargetsRepo.create({
        id: uuidv4(),
        releaseId,
        target: targetName as TargetName
      });
      targetRecords.push(record);
    }

    return targetRecords;
  }

  /**
   * Step 7: Create Stage 1 (Kickoff) tasks
   * 
   * Tasks:
   * 1. PRE_KICK_OFF_REMINDER (optional - if cronConfig.kickOffReminder == true)
   * 2. FORK_BRANCH (always required)
   * 3. CREATE_PROJECT_MANAGEMENT_TICKET (optional - if integration exists)
   * 4. CREATE_TEST_SUITE (optional - if integration exists)
   * 5. TRIGGER_PRE_REGRESSION_BUILDS (optional - if cronConfig.preRegressionBuilds == true)
   */
  private async createStage1Tasks(
    releaseId: string,
    accountId: string,
    cronConfig: Record<string, unknown>
  ): Promise<string[]> {
    const tasksToCreate = [];

    // 1. PRE_KICK_OFF_REMINDER (optional)
    if (cronConfig.kickOffReminder === true) {
      tasksToCreate.push({
        id: uuidv4(),
        releaseId,
        taskId: `pre-kickoff-reminder-${releaseId}-${uuidv4()}`,
        taskType: TaskType.PRE_KICK_OFF_REMINDER,
        stage: TaskStage.KICKOFF,
        accountId,
        isReleaseKickOffTask: true,
        identifier: TaskIdentifier.PRE_REGRESSION
      });
    }

    // 2. FORK_BRANCH (always required)
    tasksToCreate.push({
      id: uuidv4(),
      releaseId,
      taskId: `fork-branch-${releaseId}-${uuidv4()}`,
      taskType: TaskType.FORK_BRANCH,
      stage: TaskStage.KICKOFF,
      accountId,
      isReleaseKickOffTask: true,
      identifier: TaskIdentifier.PRE_REGRESSION
    });

    // 3. CREATE_PROJECT_MANAGEMENT_TICKET (TODO: check if integration exists)
    // For now, we'll create it if JIRA integration is available
    // TODO: Add integration availability check
    const hasJiraIntegration = true; // Placeholder
    if (hasJiraIntegration) {
      tasksToCreate.push({
        id: uuidv4(),
        releaseId,
        taskId: `create-project-management-ticket-${releaseId}-${uuidv4()}`,
        taskType: TaskType.CREATE_PROJECT_MANAGEMENT_TICKET,
        stage: TaskStage.KICKOFF,
        accountId,
        isReleaseKickOffTask: true,
        identifier: TaskIdentifier.PRE_REGRESSION
      });
    }

    // 4. CREATE_TEST_SUITE (TODO: check if integration exists)
    const hasTestPlatformIntegration = true; // Placeholder
    if (hasTestPlatformIntegration) {
      tasksToCreate.push({
        id: uuidv4(),
        releaseId,
        taskId: `create-test-suite-${releaseId}-${uuidv4()}`,
        taskType: TaskType.CREATE_TEST_SUITE,
        stage: TaskStage.KICKOFF,
        accountId,
        isReleaseKickOffTask: true,
        identifier: TaskIdentifier.PRE_REGRESSION
      });
    }

    // 5. TRIGGER_PRE_REGRESSION_BUILDS (optional)
    if (cronConfig.preRegressionBuilds === true) {
      tasksToCreate.push({
        id: uuidv4(),
        releaseId,
        taskId: `trigger-pre-regression-builds-${releaseId}-${uuidv4()}`,
        taskType: TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
        stage: TaskStage.KICKOFF,
        accountId,
        isReleaseKickOffTask: true,
        identifier: TaskIdentifier.PRE_REGRESSION
      });
    }

    // Bulk create tasks
    const createdTasks = await this.releaseTaskRepo.bulkCreate(tasksToCreate);
    return createdTasks.map(t => t.id);
  }

  /**
   * Step 8: Create state history for release creation
   */
  private async createStateHistory(
    releaseId: string,
    accountId: string,
    releaseKey: string,
    platformVersions: Record<string, string>
  ): Promise<void> {
    const historyId = uuidv4();

    await this.stateHistoryRepo.create({
      id: historyId,
      releaseId,
      accountId,
      action: StateChangeType.CREATE
    });

    // Record release key
    await this.stateHistoryRepo.createHistoryItem({
      id: uuidv4(),
      historyId,
      group: 'creation',
      type: StateChangeType.CREATE,
      key: 'releaseKey',
      value: JSON.stringify(releaseKey),
      oldValue: null,
      metadata: null
    });

    // Record platform versions
    await this.stateHistoryRepo.createHistoryItem({
      id: uuidv4(),
      historyId,
      group: 'creation',
      type: StateChangeType.CREATE,
      key: 'platformVersions',
      value: JSON.stringify(platformVersions),
      oldValue: null,
      metadata: null
    });
  }
}

