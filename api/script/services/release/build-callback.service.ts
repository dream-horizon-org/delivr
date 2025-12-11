/**
 * Build Callback Service
 * 
 * Service layer for handling CI/CD build callbacks.
 * Contains business logic for processing build status updates.
 * 
 * Flow:
 * 1. CI/CD system calls webhook with taskId
 * 2. Service reads buildUploadStatus from builds table
 * 3. Updates task/release status accordingly
 * 
 * IMPORTANT: The build system updates buildUploadStatus directly.
 * This service READS that status and updates task/release status.
 */

import { BuildRepository } from '../../models/release/build.repository';
import { ReleaseTaskRepository } from '../../models/release/release-task.repository';
import { ReleaseRepository } from '../../models/release/release.repository';
import { CronJobRepository } from '../../models/release/cron-job.repository';
import { TaskStatus, ReleaseStatus, PauseType } from '../../models/release/release.interface';

// ============================================================================
// TYPES
// ============================================================================

export type BuildCallbackResult = {
  success: boolean;
  message: string;
  taskId?: string;
  previousStatus?: string;
  newStatus?: string;
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class BuildCallbackService {
  constructor(
    private readonly buildRepo: BuildRepository,
    private readonly taskRepo: ReleaseTaskRepository,
    private readonly releaseRepo: ReleaseRepository,
    private readonly cronJobRepo: CronJobRepository
  ) {}

  /**
   * Process build callback for a task
   * 
   * Reads build status from builds table and updates task/release accordingly.
   * 
   * @param taskId - ID of the task to process
   * @returns BuildCallbackResult with success status and message
   */
  async processCallback(taskId: string): Promise<BuildCallbackResult> {
    // Step 1: Get aggregated build status for the task
    const buildStatus = await this.buildRepo.getTaskBuildStatus(taskId);
    
    // Step 2: Get the task
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      return { success: false, message: 'Task not found' };
    }
    
    const previousStatus = task.taskStatus;
    
    // Step 3: Handle FAILED status - pause release
    if (buildStatus === 'FAILED') {
      return await this.handleBuildFailure(taskId, task.releaseId, previousStatus);
    }
    
    // Step 4: Handle COMPLETED status - all builds uploaded
    if (buildStatus === 'COMPLETED') {
      return await this.handleBuildComplete(taskId, previousStatus);
    }
    
    // Step 5: Still waiting (PENDING, RUNNING, NO_BUILDS)
    // No status change - cron will check again on next tick
    return { 
      success: true, 
      message: 'Waiting for builds',
      taskId,
      previousStatus,
      newStatus: previousStatus
    };
  }

  /**
   * Handle build failure - mark task as failed and pause release
   */
  private async handleBuildFailure(
    taskId: string, 
    releaseId: string, 
    previousStatus: string
  ): Promise<BuildCallbackResult> {
    // Mark task as FAILED
    await this.taskRepo.update(taskId, { taskStatus: TaskStatus.FAILED });
    
    // Pause the release
    await this.releaseRepo.update(releaseId, { status: ReleaseStatus.PAUSED });
    
    // Set pauseType on cronJob
    const cronJob = await this.cronJobRepo.findByReleaseId(releaseId);
    if (cronJob) {
      await this.cronJobRepo.update(cronJob.id, { pauseType: PauseType.TASK_FAILURE });
    }
    
    console.log(
      `[BuildCallbackService] Task ${taskId} FAILED. ` +
      `Release ${releaseId} paused. Previous status: ${previousStatus}`
    );
    
    return { 
      success: true, 
      message: 'Build failed, release paused',
      taskId,
      previousStatus,
      newStatus: TaskStatus.FAILED
    };
  }

  /**
   * Handle build complete - mark task as completed
   */
  private async handleBuildComplete(
    taskId: string, 
    previousStatus: string
  ): Promise<BuildCallbackResult> {
    await this.taskRepo.update(taskId, { taskStatus: TaskStatus.COMPLETED });
    
    console.log(
      `[BuildCallbackService] Task ${taskId} COMPLETED. ` +
      `All builds uploaded. Previous status: ${previousStatus}`
    );
    
    return { 
      success: true, 
      message: 'All builds complete',
      taskId,
      previousStatus,
      newStatus: TaskStatus.COMPLETED
    };
  }
}

