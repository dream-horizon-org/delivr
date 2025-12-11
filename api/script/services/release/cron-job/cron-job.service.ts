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
import { CronJobStateMachine } from './cron-job-state-machine';
import { CronJobRepository } from '~models/release/cron-job.repository';
import { ReleaseRepository } from '~models/release/release.repository';
import { ReleaseTaskRepository } from '~models/release/release-task.repository';
import { RegressionCycleRepository } from '~models/release/regression-cycle.repository';
import { ReleasePlatformTargetMappingRepository } from '~models/release/release-platform-target-mapping.repository';
import { ReleaseUploadsRepository } from '~models/release/release-uploads.repository';
import { getTaskExecutor } from '~services/release/task-executor/task-executor-factory';
import { startCronJob, stopCronJob, isCronJobRunning } from './cron-scheduler';
import { StageStatus, CronStatus, CronJob } from '~models/release/release.interface';

export class CronJobService {
  constructor(
    private readonly cronJobRepo: CronJobRepository,
    private readonly releaseRepo: ReleaseRepository,
    private readonly releaseTaskRepo: ReleaseTaskRepository,
    private readonly regressionCycleRepo: RegressionCycleRepository,
    private readonly platformMappingRepo: ReleasePlatformTargetMappingRepository,
    private readonly storage: Storage,
    private readonly releaseUploadsRepo?: ReleaseUploadsRepository
  ) {}

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
    this.validateReleaseId(releaseId);

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
        console.error(`[CronJobService] Error executing state machine for release ${releaseId}:`, error);
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

    console.log(`[CronJobService] Cron job started for release ${releaseId}`);

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
    this.validateReleaseId(releaseId);

    const stopped = stopCronJob(releaseId);

    if (!stopped) {
      throw new Error(`No cron job running for release ${releaseId}`);
    }

    console.log(`[CronJobService] Cron job stopped for release ${releaseId}`);
  }

  /**
   * Check if cron job is running for a release
   */
  isCronJobRunning(releaseId: string): boolean {
    this.validateReleaseId(releaseId);
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
    this.validateReleaseId(releaseId);

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
    await this.cronJobRepo.update(cronJob.id, {
      autoTransitionToStage2: true,
      stage2Status: StageStatus.IN_PROGRESS,
      cronStatus: CronStatus.RUNNING
    });

    // Start the cron job
    await this.startCronJob(releaseId);

    console.log(`[CronJobService] Stage 2 triggered for release ${releaseId}`);

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
  async triggerStage3(releaseId: string, tenantId: string): Promise<TriggerStageResult> {
    this.validateReleaseId(releaseId);

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
    await this.cronJobRepo.update(cronJob.id, {
      autoTransitionToStage3: true,
      stage3Status: StageStatus.IN_PROGRESS
    });

    // Start the cron job
    await this.startCronJob(releaseId);

    console.log(`[CronJobService] Stage 3 triggered for release ${releaseId}`);

    return {
      success: true,
      data: {
        releaseId,
        stage3Status: StageStatus.IN_PROGRESS
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
    this.validateReleaseId(releaseId);

    // Get release
    const release = await this.releaseRepo.findById(releaseId);
    if (!release) {
      return { success: false, error: `Release not found: ${releaseId}`, statusCode: 404 };
    }

    // Check if already archived (idempotent)
    if (release.status === 'ARCHIVED') {
      console.log(`[CronJobService] Release ${releaseId} already archived`);
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

    console.log(`[CronJobService] Release ${releaseId} archived successfully`);

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
        console.log(`[CronJobService] Cron job ${cronJob.id} paused`);
        cronJobPaused = true;
      }

      // Stop cron job execution
      try {
        this.stopCronJob(releaseId);
        console.log(`[CronJobService] Cron job scheduler stopped for release ${releaseId}`);
      } catch {
        // Cron job might not be running - that's OK
        console.log(`[CronJobService] No running cron job to stop for release ${releaseId}`);
      }
    }

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
   * Validate release ID
   */
  private validateReleaseId(releaseId: string): void {
    if (!releaseId || typeof releaseId !== 'string') {
      throw new Error('Release ID is required and must be a string');
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
    archivedAt: string;
  };
} | {
  success: false;
  error: string;
  statusCode: number;
};

