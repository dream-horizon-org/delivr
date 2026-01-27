/**
 * Release Creation Service
 * 
 * Handles the complete release creation flow:
 * 1. Fetch release config (if releaseConfigId provided)
 * 2. Validate release config and business rules
 * 3. Extract hasManualBuildUpload from release config
 * 4. baseBranch resolution for hotfix
 * 5. Create release record
 * 6. Link platforms and targets to release (with per-platform versioning)
 * 7. Create cron job
 * 8. Create stage 1 tasks
 * 9. Create state history for this release/cron
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
import { validateReleaseCreation, validatePreRegressionWorkflows } from './release-creation.validation';
import { createStage1Tasks } from '../../utils/task-creation';
import { checkIntegrationAvailability } from '../../utils/integration-availability.utils';
import type { CronJobService } from './cron-job/cron-job.service';
import { ReleaseActivityLogService } from './release-activity-log.service';

export class ReleaseCreationService {
  private cronJobService: CronJobService | null = null;

  constructor(
    private readonly releaseRepo: ReleaseRepository,
    private readonly platformTargetMappingRepo: ReleasePlatformTargetMappingRepository,
    private readonly cronJobRepo: CronJobRepository,
    private readonly releaseTaskRepo: ReleaseTaskRepository,
    private readonly stateHistoryRepo: StateHistoryRepository,
    private readonly storage: storageTypes.Storage,
    private readonly releaseConfigService: ReleaseConfigService,
    private readonly releaseVersionService: ReleaseVersionService,
    private readonly activityLogService: ReleaseActivityLogService
  ) {}

  /**
   * Set CronJobService (for circular dependency resolution)
   * CronJobService is initialized after ReleaseCreationService
   */
  setCronJobService(service: CronJobService): void {
    this.cronJobService = service;
  }

  /**
   * Complete release creation flow
   */
  async createRelease(payload: CreateReleasePayload): Promise<CreateReleaseResult> {
    // Step 1: Fetch release config if provided (needed for validation and hasManualBuildUpload)
    let releaseConfig = null;
    if (payload.releaseConfigId) {
      releaseConfig = await this.releaseConfigService.getConfigById(payload.releaseConfigId);
    }

    // Step 2: Service-layer validations (business rules and data integrity)
    const validationResult = await validateReleaseCreation(
      payload,
      releaseConfig,
      this.releaseRepo,
      this.releaseVersionService
    );

    if (!validationResult.isValid) {
      throw new Error(validationResult.error);
    }

    // Step 3: Extract hasManualBuildUpload from release config
    const hasManualBuildUpload = releaseConfig?.hasManualBuildUpload ?? payload.hasManualBuildUpload ?? false;

    // Step 3.1: Determine cronConfig early (needed for pre-regression workflow validation)
    const cronConfig = payload.cronConfig || {
      kickOffReminder: true,
      preRegressionBuilds: true,
      automationBuilds: false,
      automationRuns: false,
      testFlightBuilds: true
    };

    // Step 3.2: Validate pre-regression workflows if enabled in CI/CD mode
    const preRegressionEnabled = cronConfig.preRegressionBuilds === true;
    const isCiCdMode = !hasManualBuildUpload;
    const shouldValidateWorkflows = preRegressionEnabled && isCiCdMode && payload.releaseConfigId;
    
    if (shouldValidateWorkflows) {
      const verboseConfig = await this.releaseConfigService.getConfigByIdVerbose(payload.releaseConfigId!);
      const workflowValidation = validatePreRegressionWorkflows(
        verboseConfig,
        payload.platformTargets,
        hasManualBuildUpload
      );
      
      if (!workflowValidation.isValid) {
        throw new Error(workflowValidation.error);
      }
    }

    // Step 4: baseBranch resolution for HOTFIX
    let baseBranch = payload.baseBranch;
    let baseReleaseId = payload.baseReleaseId;

    if (payload.type === 'HOTFIX' && payload.baseReleaseId) {
      const baseRelease = await this.releaseRepo.findByBaseReleaseId(payload.baseReleaseId, payload.appId);
      if (baseRelease) {
        baseBranch = baseRelease.branch || payload.baseBranch;
        baseReleaseId = baseRelease.id;
      }
    }

    // Step 5: Create release record
    const id = uuidv4();
    // Generate a unique user-facing release ID (e.g., "REL-ABC123")
    const releaseId = `REL-${uuidv4().substring(0, 8).toUpperCase()}`;

    const release = await this.releaseRepo.create({
      id,
      releaseId,
      releaseConfigId: payload.releaseConfigId || null,
      appId: payload.appId,
      type: payload.type,
      status: 'IN_PROGRESS',
      branch: payload.branch || null,
      baseBranch,
      baseReleaseId: baseReleaseId || null,
      kickOffReminderDate: payload.kickOffReminderDate || null,
      kickOffDate: payload.kickOffDate || null,
      targetReleaseDate: payload.targetReleaseDate || null,
      releaseDate: null, // Will be set when release is marked as COMPLETED
      hasManualBuildUpload,
      createdByAccountId: payload.accountId,
      releasePilotAccountId: payload.releasePilotAccountId?.trim() || payload.accountId,
      lastUpdatedByAccountId: payload.accountId
    });

    // Log release creation activity
    await this.activityLogService.registerActivityLogs(
      id,
      payload.accountId,
      new Date(),
      'RELEASE_CREATED',
      null, // No previous value for creation
      {
        releaseId,
        type: payload.type,
        branch: payload.branch,
        baseBranch,
        kickOffDate: payload.kickOffDate,
        targetReleaseDate: payload.targetReleaseDate,
        releasePilotAccountId: payload.releasePilotAccountId?.trim() || payload.accountId
      }
    );

    // Step 6: Link platform-target combinations to release
    await this.linkPlatformTargetsToRelease(id, payload.platformTargets);

    // Step 7: Create cron job (cronConfig already determined in Step 3.1)
    const cronJobId = uuidv4();

    // Determine autoTransitionToStage2 based on hasManualBuildUpload
    // If hasManualBuildUpload is true, we need manual intervention so autoTransition is false
    const autoTransitionToStage2 = true;

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

    // Step 8: Create Stage 1 tasks using utility
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

    // Step 9: Create state history
    await this.createStateHistory(id, payload.accountId, releaseId, payload.platformTargets);

    // Step 10: Auto-start cron job
    // Automatically start the cron job to begin release workflow
    // This ensures releases start executing even if user forgets to call start endpoint
    let cronJobStarted = false;
    let updatedCronJob = cronJob;

    if (this.cronJobService) {
      try {
        updatedCronJob = await this.cronJobService.startCronJob(id);
        cronJobStarted = true;
        console.log(`[ReleaseCreationService] Auto-started cron job for release ${id}`);
      } catch (cronError: unknown) {
        // Don't fail release creation if cron start fails - log and continue
        const errorMessage = cronError instanceof Error ? cronError.message : String(cronError);
        console.error(`[ReleaseCreationService] Failed to auto-start cron job for release ${id}:`, errorMessage);
        // Release is still created successfully, but cron job needs to be started manually
      }
    } else {
      console.warn(`[ReleaseCreationService] CronJobService not set - cannot auto-start cron job for release ${id}`);
    }

    return {
      release,
      cronJob: updatedCronJob,
      stage1TaskIds,
      cronJobStarted
    };
  }

  /**
   * Step 6: Link platform-target combinations to release
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

