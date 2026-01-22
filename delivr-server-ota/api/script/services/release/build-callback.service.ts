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
import type { ReleaseTask } from '../../models/release/release.interface';
import type { Build } from '../../models/release/build.repository';
import { ReleaseNotificationService } from '../release-notification/release-notification.service';
import { BuildNotificationService } from './build/build-notification.service';
import { NotificationType } from '~types/release-notification';
import { getTaskNameWithStage } from './task-executor/task-executor.constants';
import { buildDelivrUrl } from './task-executor/task-executor.utils';

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
    private readonly cronJobRepo: CronJobRepository,
    private readonly releaseNotificationService: ReleaseNotificationService,
    private readonly buildNotificationService: BuildNotificationService
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
    // Step 1: Get the task
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      return { success: false, message: 'Task not found' };
    }
    
    // Step 2: Get aggregated build status for the task
    const buildStatus = await this.buildRepo.getTaskBuildStatus(taskId);
    
    // Step 3: Get builds for the task
    const builds = await this.buildRepo.findByTaskId(taskId);
    
    const previousStatus = task.taskStatus;
    
    // Step 4: Handle FAILED status - pause release
    if (buildStatus === 'FAILED') {
      return await this.handleBuildFailure(task, previousStatus);
    }
    
    // Step 5: Handle COMPLETED status - all builds uploaded
    if (buildStatus === 'COMPLETED') {
      return await this.handleBuildComplete(task, builds, previousStatus);
    }
    
    // Step 6: Still waiting (PENDING, RUNNING, NO_BUILDS)
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
    task: ReleaseTask,
    previousStatus: string
  ): Promise<BuildCallbackResult> {
    // Mark task as FAILED
    await this.taskRepo.update(task.id, { taskStatus: TaskStatus.FAILED });
    
    // Pause the release
    await this.releaseRepo.update(task.releaseId, { status: ReleaseStatus.PAUSED });
    
    // Set pauseType on cronJob
    const cronJob = await this.cronJobRepo.findByReleaseId(task.releaseId);
    if (cronJob) {
      await this.cronJobRepo.update(cronJob.id, { pauseType: PauseType.TASK_FAILURE });
    }
    
    console.log(
      `[BuildCallbackService] Task ${task.id} FAILED. ` +
      `Release ${task.releaseId} paused. Previous status: ${previousStatus}`
    );

    // Send TASK_FAILED notification
    await this.notifyTaskFailure(task);
    
    return { 
      success: true, 
      message: 'Build failed, release paused',
      taskId: task.id,
      previousStatus,
      newStatus: TaskStatus.FAILED
    };
  }

  /**
   * Send TASK_FAILED notification
   */
  private async notifyTaskFailure(task: ReleaseTask): Promise<void> {
    try {
      // Fetch release to get tenantId
      const release = await this.releaseRepo.findById(task.releaseId);
      if (!release) {
        console.log(`[BuildCallbackService] Release ${task.releaseId} not found, skipping notification`);
        return;
      }

      // Get task name with stage prefix (e.g., "Kickoff: Branch Forkout")
      const taskName = getTaskNameWithStage(task.taskType);
      
      // Build Delivr URL
      const delivrUrl = buildDelivrUrl(release.tenantId, task.releaseId);

      // Send notification
      await this.releaseNotificationService.notify({
        type: NotificationType.TASK_FAILED,
        tenantId: release.tenantId,
        releaseId: task.releaseId,
        taskName: taskName,
        delivrUrl: delivrUrl,
        isSystemGenerated: true
      });

      console.log(`[BuildCallbackService] Sent TASK_FAILED notification for task ${task.id}`);
    } catch (error) {
      // Log but don't throw - notification failure shouldn't break the flow
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `[BuildCallbackService] Failed to send TASK_FAILED notification: ` +
        `taskId=${task.id}, releaseId=${task.releaseId}, taskType=${task.taskType}, error=${errorMessage}`
      );
    }
  }

  /**
   * Handle build complete - mark task as completed and send notifications
   */
  private async handleBuildComplete(
    task: ReleaseTask,
    builds: Build[],
    previousStatus: string
  ): Promise<BuildCallbackResult> {
    // Mark task as completed
    await this.taskRepo.update(task.id, { taskStatus: TaskStatus.COMPLETED });
    
    console.log(
      `[BuildCallbackService] Task ${task.id} COMPLETED. ` +
      `All builds uploaded. Previous status: ${previousStatus}`
    );
    
    // Send notifications for each build
    await this.sendBuildNotifications(task, builds);
    
    return { 
      success: true, 
      message: 'All builds complete',
      taskId: task.id,
      previousStatus,
      newStatus: TaskStatus.COMPLETED
    };
  }

  /**
   * Send build completion notifications using BuildNotificationService
   * For pre-regression and regression: 1 notification per build
   * For test-flight and AAB: 1 notification per build (should be single build)
   */
  private async sendBuildNotifications(
    task: ReleaseTask,
    builds: Build[]
  ): Promise<void> {
    await this.buildNotificationService.notifyBuildCompletions(task, builds);
  }
}

