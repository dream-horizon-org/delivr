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
import { PlatformName, TargetName, StateChangeType } from '../../models/release/release.interface';
import type { CreateReleasePayload, CreateReleaseResult } from '~types/release';
import { hasSequelize } from '~types/release';
import * as storageTypes from '../../storage/storage';
import { ReleaseConfigService } from '../release-configs/release-config.service';
import { ReleaseVersionService } from './release-version.service';
import { validateReleaseCreation } from './release-creation.validation';
import { createStage1Tasks } from '../../utils/task-creation';
import { checkIntegrationAvailability } from '../../utils/integration-availability.utils';

export class ReleaseCreationService {
  constructor(
    private readonly releaseRepo: ReleaseRepository,
    private readonly platformTargetMappingRepo: ReleasePlatformTargetMappingRepository,
    private readonly cronJobRepo: CronJobRepository,
    private readonly releaseTaskRepo: ReleaseTaskRepository,
    private readonly stateHistoryRepo: StateHistoryRepository,
    private readonly storage: storageTypes.Storage,
    private readonly releaseConfigService: ReleaseConfigService,
    private readonly releaseVersionService: ReleaseVersionService
  ) {}

  /**
   * Complete release creation flow
   */
  async createRelease(payload: CreateReleasePayload): Promise<CreateReleaseResult> {
    // Step 1: Service-layer validations (business rules and data integrity)
    const validationResult = await validateReleaseCreation(
      payload,
      this.releaseConfigService,
      this.releaseRepo,
      this.releaseVersionService
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
    await this.linkPlatformTargetsToRelease(id, payload.platformTargets);

    // Step 5: Create cron job
    const cronJobId = uuidv4();
    const cronConfig = payload.cronConfig || {
      kickOffReminder: true,
      preRegressionBuilds: true,
      automationBuilds: false,
      automationRuns: false,
      testFlightBuilds: true
    };

    // Determine autoTransitionToStage2 based on hasManualBuildUpload
    // If hasManualBuildUpload is true, we need manual intervention so autoTransition is false
    const autoTransitionToStage2 = payload.hasManualBuildUpload !== true;

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
      autoTransitionToStage2,
      stageData: {} // Initialize with empty object
    });

    // Step 6: Create Stage 1 tasks using utility
    // First, check integration availability from release configuration
    let integrationAvailability = {
      hasProjectManagementIntegration: false,
      hasTestPlatformIntegration: false
    };

    if (payload.releaseConfigId && hasSequelize(this.storage)) {
      integrationAvailability = await checkIntegrationAvailability(
        payload.releaseConfigId,
        this.storage.sequelize
      );
    }

    const stage1TaskIds = await createStage1Tasks(this.releaseTaskRepo, {
      releaseId: id,
      accountId: payload.accountId,
      cronConfig: {
        kickOffReminder: cronConfig.kickOffReminder === true,
        preRegressionBuilds: cronConfig.preRegressionBuilds === true
      },
      hasProjectManagementIntegration: integrationAvailability.hasProjectManagementIntegration,
      hasTestPlatformIntegration: integrationAvailability.hasTestPlatformIntegration
    });

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
   * Step 7: Create state history for release creation
   */
  private async createStateHistory(
    releaseId: string,
    accountId: string,
    _userFacingReleaseId: string,
    _platformTargets: Array<{ platform: string; target: string; version: string }>
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

