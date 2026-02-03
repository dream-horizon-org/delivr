/**
 * Cron Job Service
 * 
 * Orchestrates cron job lifecycle using State Machine pattern.
 * 
 * Responsibilities:
 * - Input validation
 * - State Machine initialization
 * - Cron scheduler integration
 * - Error handling/formatting
 * 
 * The State Machine handles:
 * - Stage transitions
 * - Task execution
 * - Stage completion detection
 */

import type { Storage } from '~storage/storage';
import type { CronicleService } from '~services/cronicle';
import { CronJobStateMachine } from './cron-job-state-machine';
import { CronJobRepository } from '~models/release/cron-job.repository';
import { ReleaseRepository } from '~models/release/release.repository';
import { ReleaseTaskRepository } from '~models/release/release-task.repository';
import { RegressionCycleRepository } from '~models/release/regression-cycle.repository';
import { ReleasePlatformTargetMappingRepository } from '~models/release/release-platform-target-mapping.repository';
import { ReleaseUploadsRepository } from '~models/release/release-uploads.repository';
// Note: Per-release cron-scheduler is deprecated. Using global-scheduler instead.
// The cron-scheduler.ts file has been removed.
// Note: TaskExecutor is now accessed from storage instance (migrated from factory)
import { StageStatus, CronStatus, CronJob, PauseType } from '~models/release/release.interface';
import { hasTaskExecutor, type StorageWithReleaseServices } from '~types/release/storage-with-services.interface';
import {
  createWorkflowPollingJobs,
  deleteWorkflowPollingJobs
} from '~services/release/workflow-polling';
import { createScopedLogger } from '~utils/logger.utils';
const log = createScopedLogger('CronJobService');
import type { ReleaseStatusService } from '../release-status.service';
import type { UnifiedActivityLogService } from '../../activity-log';
import { EntityType } from '~models/activity-log/activity-log.interface';
import type { DistributionService } from '../../distribution/distribution.service';

export class CronJobService {
  private releaseStatusService: ReleaseStatusService;  // ✅ Required - set via setReleaseStatusService() for circular dependency resolution

  constructor(
    private readonly cronJobRepo: CronJobRepository,
    private readonly releaseRepo: ReleaseRepository,
    private readonly releaseTaskRepo: ReleaseTaskRepository,
    private readonly regressionCycleRepo: RegressionCycleRepository,
    private readonly platformMappingRepo: ReleasePlatformTargetMappingRepository,
    private readonly storage: Storage,
    private readonly releaseUploadsRepo: ReleaseUploadsRepository,  // ✅ Required - actively initialized in aws-storage.ts
    private readonly cronicleService: CronicleService | null,  // ✅ Can be null if Cronicle not configured, but actively initialized
    private readonly unifiedActivityLogService: UnifiedActivityLogService,  // ✅ Required - unified activity log service
    private readonly distributionService: DistributionService  // ✅ Required - actively initialized in aws-storage.ts
  ) {}

  /**
   * Set ReleaseStatusService (for circular dependency resolution)
   */
  setReleaseStatusService(service: ReleaseStatusService): void {
    this.releaseStatusService = service;
  }

  /**
   * Start cron job for a release
   * 
   * NEW ARCHITECTURE (Global Scheduler):
   * This method ONLY updates DB status. The global scheduler picks up
   * active releases (cronStatus=RUNNING, pauseType=NONE) on each tick.
   * 
   * Old: Created per-release setInterval
   * New: Updates DB status, global scheduler processes on next tick
   * 
   * @returns The updated CronJob record
   */
  async startCronJob(releaseId: string): Promise<CronJob> {
    // Get cron job record
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      throw new Error(`Cron job not found for release ${releaseId}`);
    }

    // Check if already running (DB-based check) - make it idempotent
    const isRunning = cronJob.cronStatus === CronStatus.RUNNING && cronJob.pauseType === PauseType.NONE;
    if (isRunning) {
      log.info('Cron job already running - returning current state', { releaseId });
      return cronJob; // Idempotent - just return current state
    }

    // Update cron job status in DB
    // Global scheduler will pick this up on next tick
    await this.cronJobRepo.update(cronJob.id, {
      stage1Status: StageStatus.IN_PROGRESS,
      cronStatus: CronStatus.RUNNING,
      pauseType: PauseType.NONE  // Ensure not paused
    });

    log.info('Cron job started for release (DB-only, global scheduler will process)', { releaseId });

    // Create workflow polling Cronicle jobs (if Cronicle is available)
    await this.createWorkflowPollingJobsIfEnabled(releaseId);

    // Return updated cron job
    return {
      ...cronJob,
      stage1Status: StageStatus.IN_PROGRESS,
      cronStatus: CronStatus.RUNNING,
      pauseType: PauseType.NONE
    };
  }

  /**
   * Check if cron job is running for a release
   * 
   * NEW ARCHITECTURE: Checks DB status instead of in-memory Map
   */
  async isCronJobRunningForRelease(releaseId: string): Promise<boolean> {
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      return false;
    }
    return cronJob.cronStatus === CronStatus.RUNNING && cronJob.pauseType === PauseType.NONE;
  }

  /**
   * Create and initialize State Machine for a release
   */
  private async createStateMachine(releaseId: string): Promise<CronJobStateMachine> {
    // ✅ Use proper type guard instead of 'as any'
    if (!hasTaskExecutor(this.storage)) {
      throw new Error('TaskExecutor not available on storage instance');
    }
    
    // TypeScript now knows this.storage is StorageWithReleaseServices
    const storageWithServices: StorageWithReleaseServices = this.storage;
    const taskExecutor = storageWithServices.taskExecutor;
    const buildRepo = storageWithServices.buildRepository;  // ✅ Required - actively initialized in aws-storage.ts

    const stateMachine = new CronJobStateMachine(
      releaseId,
      this.cronJobRepo,
      this.releaseRepo,
      this.releaseTaskRepo,
      this.regressionCycleRepo,
      taskExecutor,
      this.storage,
      this.platformMappingRepo,
      this.releaseUploadsRepo,
      buildRepo  // ✅ Required - actively initialized in aws-storage.ts
    );

    // Initialize state machine (determines starting state from DB)
    await stateMachine.initialize();

    return stateMachine;
  }

  /**
   * Trigger Stage 2 (Regression Testing)
   * Used when hasManualBuildUpload = true
   * 
   * Requirements:
   * - Stage 1 must be COMPLETED
   * - Stage 2 must be PENDING
   */
  async triggerStage2(releaseId: string, tenantId: string): Promise<TriggerStageResult> {
    // Verify release exists and belongs to tenant
    const release = await this.releaseRepo.findById(releaseId);
    if (!release) {
      return { success: false, error: `Release not found: ${releaseId}`, statusCode: 404 };
    }
    if (release.tenantId !== tenantId) {
      return { success: false, error: 'Release does not belong to this tenant', statusCode: 403 };
    }

    // Get cron job
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      return { success: false, error: `Cron job not found for release: ${releaseId}`, statusCode: 404 };
    }

    // Validate Stage 1 is COMPLETED
    if (cronJob.stage1Status !== StageStatus.COMPLETED) {
      return {
        success: false,
        error: `Stage 1 must be COMPLETED before triggering Stage 2. Current status: ${cronJob.stage1Status}`,
        statusCode: 400
      };
    }

    // Validate Stage 2 is not already started
    if (cronJob.stage2Status === StageStatus.IN_PROGRESS) {
      return { success: false, error: 'Stage 2 is already in progress', statusCode: 400 };
    }
    if (cronJob.stage2Status === StageStatus.COMPLETED) {
      return { success: false, error: 'Stage 2 is already completed', statusCode: 400 };
    }

    // Update cron job and start Stage 2
    // Clear pauseType to allow state machine to resume execution
    await this.cronJobRepo.update(cronJob.id, {
      autoTransitionToStage2: true,
      stage2Status: StageStatus.IN_PROGRESS,
      cronStatus: CronStatus.RUNNING,
      pauseType: PauseType.NONE  // Clear AWAITING_STAGE_TRIGGER
    });


    log.info('Stage 2 triggered for release', { releaseId });

    return {
      success: true,
      data: {
        releaseId,
        stage2Status: StageStatus.IN_PROGRESS
      }
    };
  }

  /**
   * Trigger Stage 3 (Pre-Release)
   * 
   * Requirements:
   * - Stage 2 must be COMPLETED
   * - Stage 3 must be PENDING
   */

  async triggerStage3(
    releaseId: string, 
    tenantId: string,
    approvedBy: string,
    comments?: string,
    forceApprove?: boolean
  ): Promise<TriggerStageResult> {

    // Verify release exists and belongs to tenant
    const release = await this.releaseRepo.findById(releaseId);
    if (!release) {
      return { success: false, error: `Release not found: ${releaseId}`, statusCode: 404 };
    }
    if (release.tenantId !== tenantId) {
      return { success: false, error: 'Release does not belong to this tenant', statusCode: 403 };
    }

    // Get cron job
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      return { success: false, error: `Cron job not found for release: ${releaseId}`, statusCode: 404 };
    }

    // Validate approval requirements (unless forceApprove is true)
    if (!forceApprove && this.releaseStatusService) {
      // Check cherry pick status (must be OK - no pending cherry picks)
      const hasCherryPicks = await this.releaseStatusService.cherryPickAvailable(tenantId, releaseId);
      const cherryPickStatusOk = !hasCherryPicks;
      
      if (!cherryPickStatusOk) {
        return {
          success: false,
          error: 'Cherry pick status check failed: New cherry picks found. Please ensure all cherry picks are merged and atleast one cycle is completed before approval.',
          statusCode: 400
        };
      }

      // Check cycles completed (no active cycles and no upcoming slots)
      const allCycles = await this.regressionCycleRepo.findByReleaseId(releaseId);
      const hasActiveCycle = allCycles.some(c => c.status === 'IN_PROGRESS' || c.status === 'NOT_STARTED');
      const hasUpcomingSlots = cronJob.upcomingRegressions && cronJob.upcomingRegressions.length > 0;
      const cyclesCompleted = !hasActiveCycle && !hasUpcomingSlots;

      if (!cyclesCompleted) {
        return {
          success: false,
          error: 'Cycles not completed: Active cycles exist or upcoming slots are scheduled. Please complete/remove remaining cycles before approval.',
          statusCode: 400
        };
      }
    }

    // Validate Stage 2 is COMPLETED
    if (cronJob.stage2Status !== StageStatus.COMPLETED) {
      return {
        success: false,
        error: `Stage 2 must be COMPLETED before triggering Stage 3. Current status: ${cronJob.stage2Status}`,
        statusCode: 400
      };
    }

    // Validate Stage 3 is not already started
    if (cronJob.stage3Status === StageStatus.IN_PROGRESS) {
      return { success: false, error: 'Stage 3 is already in progress', statusCode: 400 };
    }
    if (cronJob.stage3Status === StageStatus.COMPLETED) {
      return { success: false, error: 'Stage 3 is already completed', statusCode: 400 };
    }

    // Update cron job and start Stage 3
    // Clear pauseType to allow state machine to resume execution
    await this.cronJobRepo.update(cronJob.id, {
      autoTransitionToStage3: true,
      stage3Status: StageStatus.IN_PROGRESS,
      cronStatus: CronStatus.RUNNING,
      pauseType: PauseType.NONE  // Clear AWAITING_STAGE_TRIGGER
    });

    console.log(`[CronJobService] Stage 3 triggered for release ${releaseId} (approved by: ${approvedBy})`);

    // Register activity log (use approvedBy as updatedBy)
    try {
      const release = await this.releaseRepo.findById(releaseId);
      if (release) {
        await this.unifiedActivityLogService.registerActivityLog({
          entityType: EntityType.RELEASE,
          entityId: releaseId,
          tenantId: release.tenantId,
          updatedBy: approvedBy,
          type: 'REGRESSION_STAGE_APPROVAL',
          previousValue: { currentActiveStage: 'REGRESSION' },
          newValue: { currentActiveStage: 'PRE_RELEASE' }
        });
      }
    } catch (error) {
      console.error(`[CronJobService] Failed to log stage 3 approval activity:`, error);
    }

    return {
      success: true,
      data: {
        releaseId,
        stage3Status: StageStatus.IN_PROGRESS,
        approvedBy,
        approvedAt: new Date().toISOString(),
        nextStage: 'PRE_RELEASE' as const
      }
    };
  }

  /**
   * Trigger Stage 4 (Distribution)
   * 
   * Requirements:
   * - Stage 3 must be COMPLETED
   * - Stage 4 must be PENDING
   * - Project Management tickets must be completed (unless forceApprove)
   */
  async triggerStage4(
    releaseId: string, 
    tenantId: string,
    approvedBy: string,
    comments?: string,
    forceApprove?: boolean
  ): Promise<TriggerStageResult> {

    // Verify release exists and belongs to tenant
    const release = await this.releaseRepo.findById(releaseId);
    if (!release) {
      return { success: false, error: `Release not found: ${releaseId}`, statusCode: 404 };
    }
    if (release.tenantId !== tenantId) {
      return { success: false, error: 'Release does not belong to this tenant', statusCode: 403 };
    }

    // Get cron job
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      return { success: false, error: `Cron job not found for release: ${releaseId}`, statusCode: 404 };
    }

    // Validate approval requirements (unless forceApprove is true)
    if (!forceApprove && this.releaseStatusService) {
      // Check project management status (all platforms must have completed tickets)
      const projectManagementPassed = await this.releaseStatusService.allPlatformsPassingProjectManagement(releaseId);
      
      if (!projectManagementPassed) {
        return {
          success: false,
          error: 'Project management check failed: Not all platform tickets are completed. Please ensure all project management tickets are marked as done before approval.',
          statusCode: 400
        };
      }
    }

    // Validate Stage 3 is COMPLETED
    if (cronJob.stage3Status !== StageStatus.COMPLETED) {
      return {
        success: false,
        error: `Stage 3 must be COMPLETED before triggering Stage 4. Current status: ${cronJob.stage3Status}`,
        statusCode: 400
      };
    }

    // Validate Stage 4 is not already started
    if (cronJob.stage4Status === StageStatus.IN_PROGRESS) {
      return { success: false, error: 'Stage 4 is already in progress', statusCode: 400 };
    }
    if (cronJob.stage4Status === StageStatus.COMPLETED) {
      return { success: false, error: 'Stage 4 is already completed', statusCode: 400 };
    }

    // Update cron job - Stage 4 is the final stage, so mark cron as COMPLETED
    await this.cronJobRepo.update(cronJob.id, {
      stage4Status: StageStatus.IN_PROGRESS,
      pauseType: PauseType.NONE,
      cronStatus: CronStatus.COMPLETED,
      cronStoppedAt: new Date()
    });

    log.info('Stage 4 triggered for release', { releaseId, approvedBy });

    // Register activity log for pre-release stage approval
    try {
      const release = await this.releaseRepo.findById(releaseId);
      if (release) {
        await this.unifiedActivityLogService.registerActivityLog({
          entityType: EntityType.RELEASE,
          entityId: releaseId,
          tenantId: release.tenantId,
          updatedBy: approvedBy,
          type: 'PRE_RELEASE_STAGE_APPROVAL',
          previousValue: { currentActiveStage: 'PRE_RELEASE' },
          newValue: { currentActiveStage: 'DISTRIBUTION' }
        });
      }
    } catch (error) {
      console.error(`[CronJobService] Failed to log stage 4 approval activity:`, error);
    }

    // Create distribution from release after cron is marked complete
    if (this.distributionService) {
      try {
        const distributionResult = await this.distributionService.createDistributionFromRelease(
          releaseId,
          tenantId
        );

        if (distributionResult.distributionId) {
          log.info('Distribution created successfully from release', {
            releaseId,
            distributionId: distributionResult.distributionId
          });
        } else {
          log.warn('Failed to create distribution from release', {
            releaseId,
            error: distributionResult.error
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error('Error creating distribution from release', {
          releaseId,
          error: errorMessage
        });
        // Don't fail the triggerStage4 call if distribution creation fails
      }
    } else {
      log.warn('DistributionService not available, skipping distribution creation', { releaseId });
    }

    return {
      success: true,
      data: {
        releaseId,
        stage4Status: StageStatus.IN_PROGRESS,
        approvedBy,
        approvedAt: new Date().toISOString(),
        nextStage: 'DISTRIBUTION' as const
      }
    };
  }

  /**
   * Archive (cancel) a release
   * 
   * Actions:
   * - Updates release status to ARCHIVED
   * - Pauses cron job if running
   * - Stops cron job scheduler
   */
  async archiveRelease(releaseId: string, accountId: string): Promise<ArchiveReleaseResult> {
    // Get release
    const release = await this.releaseRepo.findById(releaseId);
    if (!release) {
      return { success: false, error: `Release not found: ${releaseId}`, statusCode: 404 };
    }

    // Check if already archived (idempotent)
    if (release.status === 'ARCHIVED') {
      log.info('Release already archived', { releaseId });
      return {
        success: true,
        data: {
          releaseId,
          status: 'ARCHIVED',
          alreadyArchived: true,
          archivedAt: release.updatedAt.toISOString()
        }
      };
    }

    // Capture previous status before archiving
    const previousStatus = release.status;

    // Update release status to ARCHIVED
    await this.releaseRepo.update(releaseId, {
      status: 'ARCHIVED',
      lastUpdatedByAccountId: accountId
    });

    log.info('Release archived successfully', { releaseId });

    // Register activity log
    try {
      const release = await this.releaseRepo.findById(releaseId);
      if (release) {
        await this.unifiedActivityLogService.registerActivityLog({
          entityType: EntityType.RELEASE,
          entityId: releaseId,
          tenantId: release.tenantId,
          updatedBy: accountId,
          type: 'RELEASE_ARCHIVED',
          previousValue: { status: previousStatus },
          newValue: { status: 'ARCHIVED' }
        });
      }
    } catch (error) {
      console.error(`[CronJobService] Failed to log archive activity:`, error);
    }

    // Get and update cron job (if exists)
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    let cronJobPaused = false;

    if (cronJob) {
      // Only update if not already completed
      if (cronJob.cronStatus !== CronStatus.COMPLETED) {
        await this.cronJobRepo.update(cronJob.id, {
          cronStatus: CronStatus.COMPLETED,
          cronStoppedAt: new Date()
          // Note: ARCHIVED is terminal state - no comeback possible, so use COMPLETED
        });
        log.info('Cron job completed due to release archival (terminal state)', { cronJobId: cronJob.id });
        cronJobPaused = true;
      }

      // NEW ARCHITECTURE: DB status update is sufficient.
      // Global scheduler will skip this release since cronStatus != RUNNING.
    }

    // Delete workflow polling Cronicle jobs (release is ARCHIVED)
    await this.deleteWorkflowPollingJobsIfEnabled(releaseId);

    return {
      success: true,
      data: {
        releaseId,
        status: 'ARCHIVED',
        alreadyArchived: false,
        cronJobPaused,
        archivedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Complete a release
   * 
   * Marks the release as successfully COMPLETED and stops the cron job.
   * This is typically called when Stage 4 (submission) finishes successfully
   * or can be called manually via a callback API in the future.
   * 
   * Prerequisites:
   * - Stage 4 (submission) must be IN_PROGRESS
   * 
   * Actions:
   * - Validates stage4Status is IN_PROGRESS
   * - Updates release status to COMPLETED
   * - Updates stage4Status to COMPLETED
   * - Sets cronStatus to COMPLETED (terminal state)
   * - Deletes workflow polling jobs
   * 
   * @param releaseId - Release ID
   * @param accountId - Account ID for audit trail
   * @returns Success/failure result
   */
  async completeRelease(releaseId: string, accountId: string): Promise<CompleteReleaseResult> {
    // Get release
    const release = await this.releaseRepo.findById(releaseId);
    if (!release) {
      return { success: false, error: `Release not found: ${releaseId}`, statusCode: 404 };
    }

    // Check if already completed (idempotent)
    if (release.status === 'COMPLETED') {
      log.info('Release already completed', { releaseId });
      return {
        success: true,
        data: {
          releaseId,
          status: 'COMPLETED',
          alreadyCompleted: true,
          cronJobStopped: false,
          completedAt: release.updatedAt.toISOString()
        }
      };
    }

    // Get cron job (required)
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      return { 
        success: false, 
        error: `Cron job not found for release: ${releaseId}`, 
        statusCode: 404 
      };
    }

    // Validate: Stage 4 must be IN_PROGRESS
    if (cronJob.stage4Status !== StageStatus.IN_PROGRESS) {
      return {
        success: false,
        error: `Cannot complete release: Stage 4 must be IN_PROGRESS (current: ${cronJob.stage4Status})`,
        statusCode: 400
      };
    }

    // Update release status to COMPLETED
    await this.releaseRepo.update(releaseId, {
      status: 'COMPLETED',
      lastUpdatedByAccountId: accountId
    });

    log.info('Release marked as COMPLETED', { releaseId });

    // Update cron job: mark stage4 and cron as COMPLETED
    let cronJobStopped = false;
    
    if (cronJob.cronStatus !== CronStatus.COMPLETED) {
      await this.cronJobRepo.update(cronJob.id, {
        stage4Status: StageStatus.COMPLETED,
        cronStatus: CronStatus.COMPLETED,
        cronStoppedAt: new Date()
      });
      log.info('Stage 4 and cron job completed successfully', { 
        cronJobId: cronJob.id,
        stage4Status: 'COMPLETED'
      });
      cronJobStopped = true;
    } else {
      // Already completed, just update stage4
      await this.cronJobRepo.update(cronJob.id, {
        stage4Status: StageStatus.COMPLETED
      });
      log.info('Stage 4 marked as COMPLETED (cron was already stopped)', { 
        cronJobId: cronJob.id 
      });
    }

    // NEW ARCHITECTURE: DB status update is sufficient.
    // Global scheduler will skip this release since cronStatus = COMPLETED.

    // Delete workflow polling Cronicle jobs (release is COMPLETED)
    await this.deleteWorkflowPollingJobsIfEnabled(releaseId);

    return {
      success: true,
      data: {
        releaseId,
        status: 'COMPLETED',
        alreadyCompleted: false,
        cronJobStopped,
        completedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Pause a release (user-requested)
   * 
   * Sets pauseType to USER_REQUESTED. Scheduler keeps running but
   * state machine will skip execution until resumed.
   * 
   * Only allowed for:
   * - Active releases (not ARCHIVED or COMPLETED)
   * - Releases owned by the tenant
   */
  async pauseRelease(releaseId: string, tenantId: string, accountId: string): Promise<PauseReleaseResult> {
    // Verify release exists and belongs to tenant
    const release = await this.releaseRepo.findById(releaseId);
    if (!release) {
      return { success: false, error: `Release not found: ${releaseId}`, statusCode: 404 };
    }
    if (release.tenantId !== tenantId) {
      return { success: false, error: 'Release does not belong to this tenant', statusCode: 403 };
    }

    // Cannot pause archived or completed releases
    if (release.status === 'ARCHIVED') {
      return { success: false, error: 'Cannot pause an archived release', statusCode: 400 };
    }
    if (release.status === 'COMPLETED') {
      return { success: false, error: 'Cannot pause a completed release', statusCode: 400 };
    }

    // Get cron job
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      return { success: false, error: `Cron job not found for release: ${releaseId}`, statusCode: 404 };
    }

    // Check if already paused (idempotent)
    if (cronJob.pauseType === PauseType.USER_REQUESTED) {
      console.log(`[CronJobService] Release ${releaseId} already paused by user`);
      return {
        success: true,
        data: {
          releaseId,
          pauseType: PauseType.USER_REQUESTED,
          alreadyPaused: true
        }
      };
    }

    // Capture old pauseType before update
    const oldPauseType = cronJob.pauseType;

    // Update pauseType to USER_REQUESTED
    // Note: Scheduler keeps running, state machine will skip execution
    await this.cronJobRepo.update(cronJob.id, {
      pauseType: PauseType.USER_REQUESTED
    });

    console.log(`[CronJobService] Release ${releaseId} paused by user (pauseType = USER_REQUESTED)`);

    // Register activity log
    try {
      const release = await this.releaseRepo.findById(releaseId);
      if (release) {
        await this.unifiedActivityLogService.registerActivityLog({
          entityType: EntityType.RELEASE,
          entityId: releaseId,
          tenantId: release.tenantId,
          updatedBy: accountId,
          type: 'PAUSE_RELEASE',
          previousValue: { pauseType: oldPauseType },
          newValue: { pauseType: PauseType.USER_REQUESTED }
        });
      }
    } catch (error) {
      console.error(`[CronJobService] Failed to log pause activity:`, error);
    }

    return {
      success: true,
      data: {
        releaseId,
        pauseType: PauseType.USER_REQUESTED,
        alreadyPaused: false
      }
    };
  }

  /**
   * Resume cron job execution (internal method)
   * 
   * Simple resume that just sets cronStatus=RUNNING and pauseType=NONE
   * without any validation. Used when adding new regression slots to 
   * restart the scheduler without touching stage statuses.
   * 
   * This is different from resumeRelease() which has user-facing validations.
   */
  async resumeCronJob(releaseId: string): Promise<void> {
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      throw new Error(`Cron job not found for release ${releaseId}`);
    }

    // Check if already running - idempotent
    const isRunning = cronJob.cronStatus === CronStatus.RUNNING && cronJob.pauseType === PauseType.NONE;
    if (isRunning) {
      log.info('Cron job already running', { releaseId });
      return;
    }

    // Resume: set RUNNING + NONE without touching stage statuses
    await this.cronJobRepo.update(cronJob.id, {
      cronStatus: CronStatus.RUNNING,
      pauseType: PauseType.NONE
    });

    log.info('Cron job resumed (internal)', { releaseId });
  }

  /**
   * Resume a user-paused release
   *
   * Sets pauseType back to NONE. Only allowed for releases
   * that were paused by the user (pauseType = USER_REQUESTED).
   *
   * Cannot resume:
   * - TASK_FAILURE paused releases (requires retry/fix)
   * - AWAITING_STAGE_TRIGGER paused releases (requires stage trigger API - "awaiting stage approval")
   */
  async resumeRelease(releaseId: string, tenantId: string, accountId: string): Promise<ResumeReleaseResult> {
    // Verify release exists and belongs to tenant
    const release = await this.releaseRepo.findById(releaseId);
    if (!release) {
      return { success: false, error: `Release not found: ${releaseId}`, statusCode: 404 };
    }
    if (release.tenantId !== tenantId) {
      return { success: false, error: 'Release does not belong to this tenant', statusCode: 403 };
    }

    // Get cron job
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      return { success: false, error: `Cron job not found for release: ${releaseId}`, statusCode: 404 };
    }

    // Can only resume USER_REQUESTED paused releases
    if (cronJob.pauseType !== PauseType.USER_REQUESTED) {
      if (cronJob.pauseType === PauseType.TASK_FAILURE) {
        return {
          success: false,
          error: 'Cannot resume release paused due to TASK_FAILURE. Use retry API to resolve failed task.',
          statusCode: 400
        };
      }
      if (cronJob.pauseType === PauseType.AWAITING_STAGE_TRIGGER) {
        return {
          success: false,
          error: 'Cannot resume release awaiting stage approval. Use the stage trigger API to proceed to the next stage.',
          statusCode: 400
        };
      }
      return {
        success: false,
        error: `Release is not paused by user. Current pauseType: ${cronJob.pauseType}`,
        statusCode: 400
      };
    }

    // Capture old pauseType before update
    const oldPauseType = cronJob.pauseType;

    // Update pauseType to NONE
    await this.cronJobRepo.update(cronJob.id, {
      pauseType: PauseType.NONE
    });

    console.log(`[CronJobService] Release ${releaseId} resumed (pauseType = NONE)`);

    // Register activity log
    try {
      const release = await this.releaseRepo.findById(releaseId);
      if (release) {
        await this.unifiedActivityLogService.registerActivityLog({
          entityType: EntityType.RELEASE,
          entityId: releaseId,
          tenantId: release.tenantId,
          updatedBy: accountId,
          type: 'RESUME_RELEASE',
          previousValue: { pauseType: oldPauseType },
          newValue: { pauseType: PauseType.NONE }
        });
      }
    } catch (error) {
      console.error(`[CronJobService] Failed to log resume activity:`, error);
    }

    return {
      success: true,
      data: {
        releaseId,
        pauseType: PauseType.NONE
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Workflow Polling Job Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Create workflow polling Cronicle jobs for a release.
   * Only creates if Cronicle service is available.
   *
   * @param releaseId - The release to create jobs for
   */
  private async createWorkflowPollingJobsIfEnabled(releaseId: string): Promise<void> {
    const cronicleNotAvailable = !this.cronicleService;
    if (cronicleNotAvailable) {
      log.info('Cronicle not available, skipping workflow polling job creation', { releaseId });
      return;
    }

    // Get release to get tenantId
    const release = await this.releaseRepo.findById(releaseId);
    const releaseNotFound = !release;
    if (releaseNotFound) {
      log.warn('Release not found, cannot create workflow polling jobs', { releaseId });
      return;
    }

    try {
      const result = await createWorkflowPollingJobs({
        releaseId,
        tenantId: release.tenantId,
        cronicleService: this.cronicleService
      });

      const jobsCreated = result.success;
      if (jobsCreated) {
        log.info('Workflow polling jobs created', {
          releaseId,
          pendingJobId: result.pendingJobId,
          runningJobId: result.runningJobId
        });
      } else {
        log.warn('Failed to create workflow polling jobs', { releaseId, error: result.error });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Error creating workflow polling jobs', { releaseId, error: errorMessage });
      // Don't throw - workflow polling is optional, main cron job should continue
    }
  }

  /**
   * Delete workflow polling Cronicle jobs for a release.
   * Only deletes if Cronicle service is available.
   * Called when release is COMPLETED or ARCHIVED.
   *
   * @param releaseId - The release to delete jobs for
   */
  async deleteWorkflowPollingJobsIfEnabled(releaseId: string): Promise<void> {
    const cronicleNotAvailable = !this.cronicleService;
    if (cronicleNotAvailable) {
      log.info('Cronicle not available, skipping workflow polling job deletion', { releaseId });
      return;
    }

    try {
      const result = await deleteWorkflowPollingJobs({
        releaseId,
        cronicleService: this.cronicleService
      });

      log.info('Workflow polling jobs deletion completed', {
        releaseId,
        pendingDeleted: result.pendingDeleted,
        runningDeleted: result.runningDeleted
      });

      const hasErrors = result.errors.length > 0;
      if (hasErrors) {
        log.warn('Some workflow polling jobs could not be deleted', { errors: result.errors });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Error deleting workflow polling jobs', { releaseId, error: errorMessage });
      // Don't throw - cleanup failures shouldn't block release completion
    }
  }
}

// Result types for service methods
export type TriggerStageResult = {
  success: true;
  data: {
    releaseId: string;
    stage2Status?: string;
    stage3Status?: string;
    stage4Status?: string;
    approvedBy?: string;
    approvedAt?: string;
    nextStage?: 'PRE_RELEASE' | 'DISTRIBUTION';
  };
} | {
  success: false;
  error: string;
  statusCode: number;
};

export type ArchiveReleaseResult = {
  success: true;
  data: {
    releaseId: string;
    status: string;
    alreadyArchived: boolean;
    cronJobPaused?: boolean;
    archivedBy?: string;
    archivedAt: string;
  };
} | {
  success: false;
  error: string;
  statusCode: number;
};

export type PauseReleaseResult = {
  success: true;
  data: {
    releaseId: string;
    pauseType: string;
    alreadyPaused: boolean;
  };
} | {
  success: false;
  error: string;
  statusCode: number;
};

export type ResumeReleaseResult = {
  success: true;
  data: {
    releaseId: string;
    pauseType: string;
  };
} | {
  success: false;
  error: string;
  statusCode: number;
};

type CompleteReleaseResult = {
  success: true;
  data: {
    releaseId: string;
    status: 'COMPLETED';
    alreadyCompleted: boolean;
    cronJobStopped: boolean;
    completedAt: string;
  };
} | {
  success: false;
  error: string;
  statusCode: number;
};

