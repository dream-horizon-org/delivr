/**
 * Build Notification Service
 * 
 * Handles build completion notifications for both CI/CD and manual upload flows.
 * All dependencies are required (not optional) - initialized in aws-storage.ts.
 */

import { TaskType, PlatformName } from '~models/release/release.interface';
import type { ReleaseTask } from '~models/release/release.interface';
import type { Build } from '~models/release/build.repository';
import type { ReleaseRetrievalService } from '~services/release/release-retrieval.service';
import type { ReleaseNotificationService } from '~services/release-notification/release-notification.service';
import type { BuildArtifactService } from '~services/release/build/build-artifact.service';
import { NotificationType } from '~types/release-notification';

// ============================================================================
// CONSTANTS
// ============================================================================

const TASK_TYPE_TO_NOTIFICATION_TYPE: Partial<Record<TaskType, NotificationType>> = {
  [TaskType.TRIGGER_PRE_REGRESSION_BUILDS]: NotificationType.PREREGRESSION_BUILDS,
  [TaskType.TRIGGER_REGRESSION_BUILDS]: NotificationType.REGRESSION_BUILDS,
  [TaskType.TRIGGER_TEST_FLIGHT_BUILD]: NotificationType.IOS_TEST_FLIGHT_BUILD,
  [TaskType.CREATE_AAB_BUILD]: NotificationType.ANDROID_AAB_BUILD,
};

const PLATFORM_SPECIFIC_NOTIFICATIONS: NotificationType[] = [
  NotificationType.PREREGRESSION_BUILDS,
  NotificationType.REGRESSION_BUILDS,
  NotificationType.IOS_TEST_FLIGHT_BUILD,
  NotificationType.ANDROID_AAB_BUILD,
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class BuildNotificationService {
  // ✅ All dependencies are REQUIRED (no optional markers)
  constructor(
    private readonly releaseRetrievalService: ReleaseRetrievalService,
    private readonly releaseNotificationService: ReleaseNotificationService,
    private readonly buildArtifactService: BuildArtifactService
  ) {}

  /**
   * Map task type to notification type
   */
  private mapTaskTypeToNotificationType(taskType: TaskType): NotificationType | null {
    return TASK_TYPE_TO_NOTIFICATION_TYPE[taskType] ?? null;
  }

  /**
   * Check if notification type is platform-specific
   */
  private isPlatformSpecificNotification(notificationType: NotificationType): boolean {
    return PLATFORM_SPECIFIC_NOTIFICATIONS.includes(notificationType);
  }

  /**
   * Generate displayUrl and artifactDownloadUrl for a build
   */
  private async generateBuildUrls(
    build: Build
  ): Promise<{ displayUrl?: string; artifactDownloadUrl?: string }> {
    let displayUrl: string | undefined;
    let artifactDownloadUrl: string | undefined;

    const isAndroid = build.platform === PlatformName.ANDROID;
    const isIos = build.platform === PlatformName.IOS;

    if (isAndroid && build.internalTrackLink) {
      displayUrl = build.internalTrackLink;
    } else if (isIos && build.testflightNumber) {
      displayUrl = build.testflightNumber;
    }

    const hasArtifactPath = build.artifactPath;
    if (hasArtifactPath) {
      try {
        artifactDownloadUrl = await this.buildArtifactService.generatePresignedUrl(build.artifactPath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(
          `[BuildNotificationService] Error generating presigned URL: ` +
          `buildId=${build.id}, artifactPath=${build.artifactPath}, error=${errorMessage}`
        );
      }
    }

    return { displayUrl, artifactDownloadUrl };
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
      const mapping = releaseData.platformTargetMappings?.find(
        (m: any) => m.platform === build.platform && m.target === build.storeType
      );
      const version = mapping?.version ?? releaseData.branch ?? 'Unknown';

      const { displayUrl, artifactDownloadUrl } = await this.generateBuildUrls(build);

      const payload: any = {
        type: notificationType,
        tenantId: releaseData.tenantId,
        releaseId: releaseData.id,
        taskId: task.id,
        version,
        branch: releaseData.branch ?? 'Unknown',
        isSystemGenerated: true,
      };

      const isPlatformSpecific = this.isPlatformSpecificNotification(notificationType);
      if (isPlatformSpecific) {
        payload.platform = build.platform;
        payload.target = build.storeType;
        payload.displayUrl = displayUrl;
        payload.artifactDownloadUrl = artifactDownloadUrl;
      }

      await this.releaseNotificationService.notify(payload);

      console.log(
        `[BuildNotificationService] Sent ${notificationType} notification for ${build.platform}/${build.storeType}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `[BuildNotificationService] Error notifying build: ` +
        `buildId=${build.id}, taskId=${task.id}, releaseId=${task.releaseId}, ` +
        `platform=${build.platform}, notificationType=${notificationType}, error=${errorMessage}`
      );
    }
  }

  /**
   * Send build completion notifications for all builds
   * 
   * @param task - The task that triggered the builds
   * @param builds - Array of builds to notify
   */
  async notifyBuildCompletions(task: ReleaseTask, builds: Build[]): Promise<void> {
    const hasNoBuilds = builds.length === 0;
    if (hasNoBuilds) {
      console.log('[BuildNotificationService] No builds to notify');
      return;
    }

    try {
      const releaseData = await this.releaseRetrievalService.getReleaseById(task.releaseId);
      const releaseNotFound = !releaseData;
      if (releaseNotFound) {
        console.error(
          `[BuildNotificationService] Release not found, cannot send notifications: ` +
          `taskId=${task.id}, releaseId=${task.releaseId}`
        );
        return;
      }

      const notificationType = this.mapTaskTypeToNotificationType(task.taskType);
      const noNotificationType = !notificationType;
      if (noNotificationType) {
        console.log(`[BuildNotificationService] No notification type for task ${task.taskType}`);
        return;
      }

      for (const build of builds) {
        await this.notifySingleBuild(task, build, releaseData, notificationType);
      }

      console.log(`[BuildNotificationService] Sent ${builds.length} build notification(s) for task ${task.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `[BuildNotificationService] Error sending build notifications: ` +
        `taskId=${task.id}, releaseId=${task.releaseId}, taskType=${task.taskType}, ` +
        `buildCount=${builds.length}, error=${errorMessage}`
      );
    }
  }
}

