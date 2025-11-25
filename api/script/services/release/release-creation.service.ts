/**
 * Release Creation Service
 * 
 * Handles the complete release creation flow:
 * 1. Validate release config exists and belongs to tenant
 * 2. baseBranch resolution for hotfix
 * 3. create a release record
 * 4. link platforms and targets to release (with per-platform versioning)
 * 5. create cron job
 * 6. create stage 1 tasks
 * 7. state history for this release/cron
 */

import { v4 as uuidv4 } from 'uuid';
import { ReleaseRepository } from '../../models/release/release.repository';
import { ReleasePlatformTargetMappingRepository } from '../../models/release/release-platform-target-mapping.repository';
import { CronJobRepository } from '../../models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../models/release/release-task.repository';
import { StateHistoryRepository } from '../../models/release/state-history.repository';
import { ReleaseType, PlatformName, TargetName, TaskType, TaskStage, TaskIdentifier, StateChangeType } from '../../storage/release/release-models';
import type { CreateReleasePayload, CreateReleaseResult } from '~types/release';
import { hasSequelize } from '~types/release';
import type { StorageWithSequelize } from '~types/release';
import * as storageTypes from '../../storage/storage';
import { ReleaseConfigService } from '../release-configs/release-config.service';
import { validateReleaseCreation } from './release-creation.validation';

export class ReleaseCreationService {
  constructor(
    private readonly releaseRepo: ReleaseRepository,
    private readonly platformTargetMappingRepo: ReleasePlatformTargetMappingRepository,
    private readonly cronJobRepo: CronJobRepository,
    private readonly releaseTaskRepo: ReleaseTaskRepository,
    private readonly stateHistoryRepo: StateHistoryRepository,
    private readonly storage: storageTypes.Storage,
    private readonly releaseConfigService: ReleaseConfigService
  ) {}

  /**
   * Complete release creation flow
   */
  async createRelease(payload: CreateReleasePayload): Promise<CreateReleaseResult> {
    // Step 1: Service-layer validations (business rules and data integrity)
    const validationResult = await validateReleaseCreation(
      payload,
      this.releaseConfigService,
      this.releaseRepo
    );

    if (!validationResult.isValid) {
      throw new Error(validationResult.error);
    }

    // Step 2: baseBranch resolution for HOTFIX
    let baseBranch = payload.baseBranch;
    let baseReleaseId = payload.baseReleaseId;

    if (payload.type === 'HOTFIX' && payload.baseReleaseId) {
      const baseRelease = await this.releaseRepo.findByBaseReleaseId(payload.baseReleaseId, payload.tenantId);
      if (baseRelease) {
        baseBranch = baseRelease.branch || payload.baseBranch;
        baseReleaseId = baseRelease.id;
      }
    }

    // Step 3: Create release record
    const id = uuidv4();
    // Generate a unique user-facing release ID (e.g., "REL-ABC123")
    const releaseId = `REL-${uuidv4().substring(0, 8).toUpperCase()}`;

    const release = await this.releaseRepo.create({
      id,
      releaseId,
      releaseConfigId: payload.releaseConfigId || null,
      tenantId: payload.tenantId,
      type: payload.type,
      status: 'IN_PROGRESS',
      branch: payload.branch || null,
      baseBranch,
      baseReleaseId: baseReleaseId || null,
      kickOffReminderDate: payload.kickOffReminderDate || null,
      kickOffDate: payload.kickOffDate || null,
      targetReleaseDate: payload.targetReleaseDate || null,
      releaseDate: null, // Will be set when release is marked as COMPLETED
      hasManualBuildUpload: payload.hasManualBuildUpload,
      createdByAccountId: payload.accountId,
      releasePilotAccountId: payload.releasePilotAccountId?.trim() || payload.accountId,
      lastUpdatedByAccountId: payload.accountId
    });

    // Step 4: Link platform-target combinations to release
    const mappingRecords = await this.linkPlatformTargetsToRelease(id, payload.platformTargets);

    // Step 5: Create cron job
    const cronJobId = uuidv4();
    const cronConfig = payload.cronConfig || {
      kickOffReminder: true,
      preRegressionBuilds: false,
      automationBuilds: false,
      automationRuns: false
    };

    const cronJob = await this.cronJobRepo.create({
      id: cronJobId,
      releaseId: id,
      stage1Status: 'PENDING',
      stage2Status: 'PENDING',
      stage3Status: 'PENDING',
      cronStatus: 'PENDING',
      cronCreatedByAccountId: payload.accountId,
      cronConfig,
      upcomingRegressions: payload.regressionBuildSlots || null,
      autoTransitionToStage2: false, // Default to false, can be configured later
      stageData: {} // Initialize with empty object
    });

    // Step 6: Create Stage 1 tasks
    const stage1TaskIds = await this.createStage1Tasks(
      id,
      payload.accountId,
      cronConfig
    );

    // Step 7: Create state history
    await this.createStateHistory(id, payload.accountId, releaseId, payload.platformTargets);

    return {
      release,
      cronJob,
      stage1TaskIds
    };
  }

  /**
   * Step 4: Link platform-target combinations to release
   * Creates entries in release_platforms_targets_mapping table
   */
  private async linkPlatformTargetsToRelease(
    releaseId: string,
    platformTargets: Array<{ platform: string; target: string; version: string }>
  ): Promise<any[]> {
    const mappingRecords = [];
    
    for (const pt of platformTargets) {
      const record = await this.platformTargetMappingRepo.create({
        id: uuidv4(),
        releaseId,
        platform: pt.platform as PlatformName,
        target: pt.target as TargetName,
        version: pt.version,
        projectManagementRunId: null,
        testManagementRunId: null
      });
      mappingRecords.push(record);
    }

    return mappingRecords;
  }

  /**
   * Step 6: Create Stage 1 (Kickoff) tasks
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
   * Step 7: Create state history for release creation
   */
  private async createStateHistory(
    releaseId: string,
    accountId: string,
    userFacingReleaseId: string,
    platformTargets: Array<{ platform: string; target: string; version: string }>
  ): Promise<void> {
    const historyId = uuidv4();

    await this.stateHistoryRepo.create({
      id: historyId,
      releaseId,
      accountId,
      action: StateChangeType.CREATE
    });

    // TODO: If needed, create state history items in a separate table
    // For now, we just create the main state history record
  }
}

