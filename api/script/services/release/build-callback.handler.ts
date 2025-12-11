/**
 * Build Callback Handler
 * 
 * This handler is called by the cron job to check build status and update
 * task/release status accordingly.
 * 
 * IMPORTANT: The build system updates buildUploadStatus directly in the builds table.
 * This handler READS that status and updates task/release status.
 * It does NOT update workflowStatus or buildUploadStatus itself.
 * 
 * Flow:
 * 1. Build system triggers CI/CD → workflowStatus = RUNNING
 * 2. Build system updates on completion → buildUploadStatus = UPLOADED/FAILED
 * 3. Cron calls this handler → reads buildUploadStatus → updates task/release
 */

import { BuildRepository } from '../../models/release/build.repository';
import { ReleaseTaskRepository } from '../../models/release/release-task.repository';
import { ReleaseRepository } from '../../models/release/release.repository';
import { CronJobRepository } from '../../models/release/cron-job.repository';
import { TaskStatus, ReleaseStatus, PauseType } from '../../models/release/release.interface';

export type BuildCallbackResult = {
  success: boolean;
  message: string;
  taskId?: string;
  previousStatus?: string;
  newStatus?: string;
};

/**
 * Handle build callback - check build status and update task/release
 * 
 * Called by cron job (NOT directly by CI/CD callback)
 * The build system updates buildUploadStatus directly in the builds table
 * This handler just reads the status and updates task/release
 * 
 * @param taskId - ID of the task to check
 * @param buildRepo - Build repository
 * @param taskRepo - Task repository
 * @param releaseRepo - Release repository
 * @param cronJobRepo - CronJob repository
 * @returns BuildCallbackResult with success status and message
 */
export const handleBuildCallback = async (
  taskId: string,
  buildRepo: BuildRepository,
  taskRepo: ReleaseTaskRepository,
  releaseRepo: ReleaseRepository,
  cronJobRepo: CronJobRepository
): Promise<BuildCallbackResult> => {
  // Step 1: Get aggregated build status for the task
  const buildStatus = await buildRepo.getTaskBuildStatus(taskId);
  
  // Step 2: Get the task
  const task = await taskRepo.findById(taskId);
  if (!task) {
    return { success: false, message: 'Task not found' };
  }
  
  const previousStatus = task.taskStatus;
  
  // Step 3: Handle FAILED status - pause release
  if (buildStatus === 'FAILED') {
    // Mark task as FAILED
    await taskRepo.update(taskId, { taskStatus: TaskStatus.FAILED });
    
    // Pause the release
    await releaseRepo.update(task.releaseId, { status: ReleaseStatus.PAUSED });
    
    // Set pauseType on cronJob
    const cronJob = await cronJobRepo.findByReleaseId(task.releaseId);
    if (cronJob) {
      await cronJobRepo.update(cronJob.id, { pauseType: PauseType.TASK_FAILURE });
    }
    
    console.log(
      `[BuildCallbackHandler] Task ${taskId} FAILED. ` +
      `Release ${task.releaseId} paused. Previous status: ${previousStatus}`
    );
    
    return { 
      success: true, 
      message: 'Build failed, release paused',
      taskId,
      previousStatus,
      newStatus: TaskStatus.FAILED
    };
  }
  
  // Step 4: Handle COMPLETED status - all builds uploaded
  if (buildStatus === 'COMPLETED') {
    await taskRepo.update(taskId, { taskStatus: TaskStatus.COMPLETED });
    
    console.log(
      `[BuildCallbackHandler] Task ${taskId} COMPLETED. ` +
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
  
  // Step 5: Still waiting (PENDING, RUNNING, NO_BUILDS)
  // No status change - cron will check again on next tick
  return { 
    success: true, 
    message: 'Waiting for builds',
    taskId,
    previousStatus,
    newStatus: previousStatus
  };
};

