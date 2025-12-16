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
import { getTaskExecutor } from '~services/release/task-executor/task-executor-factory';
import { startCronJob, stopCronJob, isCronJobRunning } from './cron-scheduler';
import { StageStatus, CronStatus, CronJob, PauseType } from '~models/release/release.interface';
import {
  createWorkflowPollingJobs,
  deleteWorkflowPollingJobs
} from '~services/release/workflow-polling';
import { createScopedLogger } from '~utils/logger.utils';
const log = createScopedLogger('CronJobService');
import type { ReleaseStatusService } from '../release-status.service';

export class CronJobService {
  private releaseStatusService?: ReleaseStatusService;

  constructor(
    private readonly cronJobRepo: CronJobRepository,
    private readonly releaseRepo: ReleaseRepository,
    private readonly releaseTaskRepo: ReleaseTaskRepository,
    private readonly regressionCycleRepo: RegressionCycleRepository,
    private readonly platformMappingRepo: ReleasePlatformTargetMappingRepository,
    private readonly storage: Storage,
    private readonly releaseUploadsRepo?: ReleaseUploadsRepository,
    private readonly cronicleService?: CronicleService | null
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
   * Uses State Machine to automatically handle stage transitions.
   * No need to specify stage - State Machine determines it from DB.
   * Also updates cron job status in DB to IN_PROGRESS.
   * 
   * @returns The updated CronJob record
   */
  async startCronJob(releaseId: string): Promise<CronJob> {
    // Check if cron job is already running
    if (isCronJobRunning(releaseId)) {
      throw new Error(`Cron job is already running for release ${releaseId}`);
    }

    // Get cron job record
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      throw new Error(`Cron job not found for release ${releaseId}`);
    }

    // Create State Machine instance
    const stateMachine = await this.createStateMachine(releaseId);

    // Start cron job with State Machine executor
    const started = startCronJob(releaseId, async () => {
      try {
        await stateMachine.execute();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error('Error executing state machine for release', { releaseId, error: errorMessage });
        // State Machine will handle retries and error states
        // Continue running to allow recovery
      }
    });

    if (!started) {
      throw new Error(`Failed to start cron job for release ${releaseId}`);
    }

    // Update cron job status in DB to indicate Stage 1 has started
    await this.cronJobRepo.update(cronJob.id, {
      stage1Status: StageStatus.IN_PROGRESS,
      cronStatus: CronStatus.RUNNING
    });

    log.info('Cron job started for release', { releaseId });

    // Create workflow polling Cronicle jobs (if Cronicle is available)
    await this.createWorkflowPollingJobsIfEnabled(releaseId);

    // Return updated cron job
    return {
      ...cronJob,
      stage1Status: StageStatus.IN_PROGRESS,
      cronStatus: CronStatus.RUNNING
    };
  }

  /**
   * Stop cron job for a release
   */
  stopCronJob(releaseId: string): void {
    const stopped = stopCronJob(releaseId);

    if (!stopped) {
      throw new Error(`No cron job running for release ${releaseId}`);
    }

    log.info('Cron job stopped for release', { releaseId });
  }

  /**
   * Check if cron job is running for a release
   */
  isCronJobRunning(releaseId: string): boolean {
    return isCronJobRunning(releaseId);
  }

  /**
   * Create and initialize State Machine for a release
   */
  private async createStateMachine(releaseId: string): Promise<CronJobStateMachine> {
    const taskExecutor = getTaskExecutor();

    const stateMachine = new CronJobStateMachine(
      releaseId,
      this.cronJobRepo,
      this.releaseRepo,
      this.releaseTaskRepo,
      this.regressionCycleRepo,
      taskExecutor,
      this.storage,
      this.platformMappingRepo,
      this.releaseUploadsRepo
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

    // Start the cron job
    await this.startCronJob(releaseId);

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

    // TODO: Register activity log
    // - Action: REGRESSION_STAGE_APPROVED
    // - Metadata: { approvedBy, comments, approvedAt: new Date().toISOString(), nextStage: 'PRE_RELEASE' }
    // - Service: ActivityLogService (not yet implemented)

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

    // Update release status to ARCHIVED
    await this.releaseRepo.update(releaseId, {
      status: 'ARCHIVED',
      lastUpdatedByAccountId: accountId
    });

    log.info('Release archived successfully', { releaseId });

    // Get and update cron job (if exists)
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    let cronJobPaused = false;

    if (cronJob) {
      // Only update if running
      if (cronJob.cronStatus === CronStatus.RUNNING) {
        await this.cronJobRepo.update(cronJob.id, {
          cronStatus: CronStatus.PAUSED,
          cronStoppedAt: new Date()
        });
        log.info('Cron job paused', { cronJobId: cronJob.id });
        cronJobPaused = true;
      }

      // Stop cron job execution
      try {
        this.stopCronJob(releaseId);
        log.info('Cron job scheduler stopped', { releaseId });
      } catch (stopError) {
        // Cron job might not be running - that's OK
        const errorMessage = stopError instanceof Error ? stopError.message : 'Unknown error';
        log.warn('No running cron job to stop', { releaseId, error: errorMessage });
      }
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
   * Pause a release (user-requested)
   * 
   * Sets pauseType to USER_REQUESTED. Scheduler keeps running but
   * state machine will skip execution until resumed.
   * 
   * Only allowed for:
   * - Active releases (not ARCHIVED or COMPLETED)
   * - Releases owned by the tenant
   */
  async pauseRelease(releaseId: string, tenantId: string): Promise<PauseReleaseResult> {
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

    // Update pauseType to USER_REQUESTED
    // Note: Scheduler keeps running, state machine will skip execution
    await this.cronJobRepo.update(cronJob.id, {
      pauseType: PauseType.USER_REQUESTED
    });

    console.log(`[CronJobService] Release ${releaseId} paused by user (pauseType = USER_REQUESTED)`);

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
   * Resume a user-paused release
   *
   * Sets pauseType back to NONE. Only allowed for releases
   * that were paused by the user (pauseType = USER_REQUESTED).
   *
   * Cannot resume:
   * - TASK_FAILURE paused releases (requires retry/fix)
   * - AWAITING_STAGE_TRIGGER paused releases (requires stage trigger API - "awaiting stage approval")
   */
  async resumeRelease(releaseId: string, tenantId: string): Promise<ResumeReleaseResult> {
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

    // Update pauseType to NONE
    await this.cronJobRepo.update(cronJob.id, {
      pauseType: PauseType.NONE
    });

    console.log(`[CronJobService] Release ${releaseId} resumed (pauseType = NONE)`);

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
    approvedBy?: string;
    approvedAt?: string;
    nextStage?: 'PRE_RELEASE';
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

