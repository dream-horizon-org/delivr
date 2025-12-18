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
import { TaskStatus, ReleaseStatus, PauseType, TaskType, PlatformName, TargetName } from '../../models/release/release.interface';
import type { ReleaseTask } from '../../models/release/release.interface';
import type { Build } from '../../models/release/build.repository';
import { ReleaseRetrievalService } from './release-retrieval.service';
import { ReleaseNotificationService } from '../release-notification/release-notification.service';
import { BuildArtifactService } from './build/build-artifact.service';
import { NotificationType } from '~types/release-notification';

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
    private readonly releaseRetrievalService?: ReleaseRetrievalService,
    private readonly releaseNotificationService?: ReleaseNotificationService,
    private readonly buildArtifactService?: BuildArtifactService
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
      return await this.handleBuildFailure(taskId, task.releaseId, previousStatus);
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
    await this.notifyBuildCompletions(task, builds);
    
    return { 
      success: true, 
      message: 'All builds complete',
      taskId: task.id,
      previousStatus,
      newStatus: TaskStatus.COMPLETED
    };
  }

  /**
   * Send build completion notifications
   * For pre-regression and regression: 1 notification per build
   * For test-flight and AAB: 1 notification per build (should be single build)
   */
  private async notifyBuildCompletions(
    task: ReleaseTask,
    builds: Build[]
  ): Promise<void> {
    if (!this.releaseRetrievalService || !this.releaseNotificationService) {
      console.log('[BuildCallbackService] Notification services not available, skipping notifications');
      return;
    }

    if (builds.length === 0) {
      console.log('[BuildCallbackService] No builds to notify');
      return;
    }

    try {
      // Fetch release data with platform mappings
      const releaseData = await this.releaseRetrievalService.getReleaseById(task.releaseId);
      if (!releaseData) {
        console.error('[BuildCallbackService] Release not found, cannot send notifications');
        return;
      }

      // Map task type to notification type
      const notificationType = this.mapTaskTypeToNotificationType(task.taskType);
      if (!notificationType) {
        console.log(`[BuildCallbackService] No notification type for task ${task.taskType}`);
        return;
      }

      // Send notification for each build
      for (const build of builds) {
        await this.notifySingleBuild(task, build, releaseData, notificationType);
      }

      console.log(`[BuildCallbackService] Sent ${builds.length} build notification(s) for task ${task.id}`);
    } catch (error) {
      console.error('[BuildCallbackService] Error sending build notifications:', error);
      // Don't fail the task if notifications fail
    }
  }

  /**
   * Send notification for a single build
   */
  private async notifySingleBuild(
    task: ReleaseTask,
    build: Build,
    releaseData: any,
    notificationType: NotificationType
  ): Promise<void> {
    try {
      // Find matching platform-target mapping for version
      const mapping = releaseData.platformTargetMappings?.find((m: any) => 
        m.platform === build.platform && m.target === build.storeType
      );
      const version = mapping?.version ?? releaseData.branch ?? 'Unknown';

      // Generate URLs
      const { displayUrl, artifactDownloadUrl } = await this.generateBuildUrls(build);

      // Construct and send payload
      const payload: any = {
        type: notificationType,
        tenantId: releaseData.tenantId,
        releaseId: releaseData.id,
        taskId: task.id,
        version: version,
        branch: releaseData.branch ?? 'Unknown',
        isSystemGenerated: true
      };

      // Add platform/target for platform-specific notifications
      if (this.isPlatformSpecificNotification(notificationType)) {
        payload.platform = build.platform;
        payload.target = build.storeType;
        payload.displayUrl = displayUrl;
        payload.artifactDownloadUrl = artifactDownloadUrl;
      }

      await this.releaseNotificationService!.notify(payload);
      
      console.log(
        `[BuildCallbackService] Sent ${notificationType} notification for ` +
        `${build.platform}/${build.storeType}`
      );
    } catch (error) {
      console.error(`[BuildCallbackService] Error notifying build ${build.id}:`, error);
      // Continue with other builds even if one fails
    }
  }

  /**
   * Generate displayUrl and artifactDownloadUrl for a build
   */
  private async generateBuildUrls(build: Build): Promise<{
    displayUrl: string | undefined;
    artifactDownloadUrl: string | undefined;
  }> {
    let displayUrl: string | undefined;
    let artifactDownloadUrl: string | undefined;

    // Generate displayUrl based on platform
    if (build.platform === PlatformName.ANDROID && build.internalTrackLink) {
      displayUrl = build.internalTrackLink;
    } else if (build.platform === PlatformName.IOS && build.testflightNumber) {
      displayUrl = build.testflightNumber;  // Just the number
    }

    // Generate artifactDownloadUrl if artifact path exists
    if (build.artifactPath && this.buildArtifactService) {
      try {
        artifactDownloadUrl = await this.buildArtifactService.generatePresignedUrl(build.artifactPath);
      } catch (error) {
        console.error(`[BuildCallbackService] Error generating presigned URL for build ${build.id}:`, error);
      }
    }

    return { displayUrl, artifactDownloadUrl };
  }

  /**
   * Map task type to notification type
   */
  private mapTaskTypeToNotificationType(taskType: TaskType): NotificationType | null {
    switch (taskType) {
      case TaskType.TRIGGER_PRE_REGRESSION_BUILDS:
        return NotificationType.PREREGRESSION_BUILDS;
      case TaskType.TRIGGER_REGRESSION_BUILDS:
        return NotificationType.REGRESSION_BUILDS;
      case TaskType.TRIGGER_TEST_FLIGHT_BUILD:
        return NotificationType.IOS_TEST_FLIGHT_BUILD;
      case TaskType.CREATE_AAB_BUILD:
        return NotificationType.ANDROID_AAB_BUILD;
      default:
        return null;
    }
  }

  /**
   * Check if notification type is platform-specific
   */
  private isPlatformSpecificNotification(notificationType: NotificationType): boolean {
    return [
      NotificationType.PREREGRESSION_BUILDS,
      NotificationType.REGRESSION_BUILDS,
      NotificationType.IOS_TEST_FLIGHT_BUILD,
      NotificationType.ANDROID_AAB_BUILD
    ].includes(notificationType);
  }
}

