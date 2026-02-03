import { Request, Response } from 'express';
import type { ReleaseRetrievalService } from '~services/release/release-retrieval.service';
import type { ReleaseConfigService } from '~services/release-configs';
import type { CommConfigService } from '~services/integrations/comm/comm-config';
import type { MessagingService } from '~services/integrations/comm/messaging/messaging.service';
import type { ReleaseNotificationRepository } from '~models/release-notification';
import type { UnifiedActivityLogService } from '~services/activity-log';
import { EntityType } from '~models/activity-log/activity-log.interface';
import type { ReleaseStatusService } from '~services/release/release-status.service';
import type { ReleaseTaskRepository } from '~models/release';
import type { ProjectManagementTicketService } from '~services/integrations/project-management';
import type { ReleasePlatformTargetMappingRepository } from '~models/release';
import { Task } from '~services/integrations/comm/messaging/messaging.interface';
import { TaskType, TaskStatus, PlatformName, TargetName } from '~models/release/release.interface';
import { HTTP_STATUS } from '~constants/http';
import { getPlatformDisplayName, getTargetDisplayName } from '~utils/platform.utils';
import { NotificationType } from '~types/release-notification';
import type {
  AdHocNotificationRequest,
  AdHocNotificationResponse,
  AdHocNotificationErrorResponse
} from '~types/release-notification/adhoc-notification.interface';
import {
  validateAdHocNotificationRequest
} from './validation.utils';
import {
  ADHOC_NOTIFICATION_ERROR_CODES,
  ADHOC_NOTIFICATION_ERROR_MESSAGES,
  ADHOC_NOTIFICATION_SUCCESS_MESSAGES,
  ADHOC_NOTIFICATION_ACTIVITY_LOG_TYPE,
  ADHOC_NOTIFICATION_MESSAGE_TYPES
} from './constants';

/**
 * Controller for ad-hoc notification operations
 */
export class AdHocNotificationController {
  constructor(
    private readonly releaseRetrievalService: ReleaseRetrievalService,
    private readonly releaseConfigService: ReleaseConfigService,
    private readonly commConfigService: CommConfigService,
    private readonly messagingService: MessagingService,
    private readonly notificationRepository: ReleaseNotificationRepository,
    private readonly unifiedActivityLogService: UnifiedActivityLogService,
    private readonly releaseStatusService: ReleaseStatusService,
    private readonly releaseTaskRepository: ReleaseTaskRepository,
    private readonly pmTicketService: ProjectManagementTicketService,
    private readonly platformMappingRepository: ReleasePlatformTargetMappingRepository
  ) {}

  /**
   * Send ad-hoc notification
   * POST /tenants/:tenantId/releases/:releaseId/notify
   */
  sendNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, releaseId } = req.params;
      const userId = req.user?.id;

      // Step 1: Validate request body
      const validation = validateAdHocNotificationRequest(req.body);
      if (!validation.isValid) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: validation.error
        } as AdHocNotificationErrorResponse);
        return;
      }

      const request = validation.data!;

      // Step 2: Verify release exists and belongs to tenant
      const release = await this.releaseRetrievalService.getReleaseById(releaseId);
      if (!release || release.tenantId !== tenantId) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.RELEASE_NOT_FOUND,
            message: ADHOC_NOTIFICATION_ERROR_MESSAGES.RELEASE_NOT_FOUND
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      // Step 3: Get comms config ID from release config
      const releaseConfigId = release.releaseConfigId;
      if (!releaseConfigId) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.RELEASE_NOT_FOUND,
            message: 'Release configuration not found'
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      const releaseConfig = await this.releaseConfigService.getConfigById(releaseConfigId);
      if (!releaseConfig) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.RELEASE_NOT_FOUND,
            message: 'Release configuration not found'
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      const commsConfigId = releaseConfig.commsConfigId;
      if (!commsConfigId) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.RELEASE_NOT_FOUND,
            message: ADHOC_NOTIFICATION_ERROR_MESSAGES.COMMS_CONFIG_NOT_FOUND
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      // Step 4: Verify comms config exists (needed for sending messages)
      const channelConfig = await this.commConfigService.getConfigById(commsConfigId);
      if (!channelConfig) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.RELEASE_NOT_FOUND,
            message: ADHOC_NOTIFICATION_ERROR_MESSAGES.COMMS_CONFIG_NOT_FOUND
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      // Step 5: Handle based on notification type
      // Note: We allow sending to any channels provided by frontend
      if (request.type === 'custom') {
        await this.handleCustomMessage(
          req,
          res,
          release,
          tenantId,
          releaseId,
          userId,
          request.customMessage!,
          request.channels, // Channel objects with id + name from frontend
          commsConfigId
        );
      } else {
        // Template handling
        await this.handleTemplateMessage(
          req,
          res,
          release,
          tenantId,
          releaseId,
          userId,
          request.messageType!,
          request.channels,
          commsConfigId
        );
      }
    } catch (error) {
      console.error('[AdHocNotificationController] Error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: ADHOC_NOTIFICATION_ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      } as AdHocNotificationErrorResponse);
    }
  };

  /**
   * Handle custom message sending
   */
  private async handleCustomMessage(
    req: Request,
    res: Response,
    release: any,
    tenantId: string,
    releaseId: string,
    userId: string | undefined,
    customMessage: string,
    channels: Array<{ id: string; name: string }>, // Channel objects from frontend
    commsConfigId: string
  ): Promise<void> {
    try {
      const trimmedMessage = customMessage.trim();
      
      // Extract channel IDs for sending
      const channelIds = channels.map(ch => ch.id);
      const channelNames = channels.map(ch => ch.name);
      
      // Send message via messaging service
      const responses = await this.messagingService.sendMessage(
        commsConfigId,
        Task.AD_HOC_CUSTOM,
        [trimmedMessage],
        undefined,
        undefined,
        channelIds
      );

      // Step 7: Record notification in database
      const deliveryStatus = Object.fromEntries(responses);
      const notification = await this.notificationRepository.create({
        tenantId,
        releaseId,
        notificationType: NotificationType.AD_HOC_CUSTOM,
        isSystemGenerated: false,
        createdByUserId: userId ?? null,
        taskId: null,
        delivery: deliveryStatus
      });

      // Step 8: Log activity
      if (userId) {
        await this.unifiedActivityLogService.registerActivityLog({
          entityType: EntityType.RELEASE,
          entityId: releaseId,
          tenantId: release.tenantId,
          updatedBy: userId,
          type: ADHOC_NOTIFICATION_ACTIVITY_LOG_TYPE,
          previousValue: null,
          newValue: {
            notificationId: notification.id,
            type: 'custom',
            message: trimmedMessage,
            channels: channelNames,
            channelIds: channelIds
          }
        });
      }

      // Step 9: Build response
      // Use channel names from frontend for display
      const channelDisplayNames = channelNames.map(name => `#${name}`);
      
      const response: AdHocNotificationResponse = {
        success: true,
        message: ADHOC_NOTIFICATION_SUCCESS_MESSAGES.SENT,
        notification: {
          id: notification.id,
          sentTo: channelDisplayNames,
          sentAt: notification.createdAt.toISOString()
        }
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      console.error('[AdHocNotificationController] Failed to send custom message:', error);
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: ADHOC_NOTIFICATION_ERROR_CODES.SLACK_API_ERROR,
          message: ADHOC_NOTIFICATION_ERROR_MESSAGES.SLACK_SEND_FAILED,
          details: {
            error: error instanceof Error ? error.message : String(error)
          }
        }
      } as AdHocNotificationErrorResponse);
    }
  }

  /**
   * Handle template message sending
   */
  private async handleTemplateMessage(
    req: Request,
    res: Response,
    release: any,
    tenantId: string,
    releaseId: string,
    userId: string | undefined,
    messageType: string,
    channels: Array<{ id: string; name: string }>,
    commsConfigId: string
  ): Promise<void> {
    try {
      switch (messageType) {
        case ADHOC_NOTIFICATION_MESSAGE_TYPES.TEST_RESULTS_SUMMARY:
          await this.handleTestResultsSummary(
            req,
            res,
            release,
            tenantId,
            releaseId,
            userId,
            channels,
            commsConfigId
          );
          break;

        case ADHOC_NOTIFICATION_MESSAGE_TYPES.PROJECT_MANAGEMENT_APPROVAL:
          await this.handleProjectManagementApproval(
            req,
            res,
            release,
            tenantId,
            releaseId,
            userId,
            channels,
            commsConfigId
          );
          break;

        case ADHOC_NOTIFICATION_MESSAGE_TYPES.MANUAL_BUILD_UPLOAD_REMINDER:
          await this.handleManualBuildUploadReminder(
            req,
            res,
            release,
            tenantId,
            releaseId,
            userId,
            channels,
            commsConfigId
          );
          break;

        default:
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            error: {
              code: ADHOC_NOTIFICATION_ERROR_CODES.INVALID_REQUEST,
              message: `Unknown message type: ${messageType}`
            }
          } as AdHocNotificationErrorResponse);
      }
    } catch (error) {
      console.error('[AdHocNotificationController] Failed to send template message:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: ADHOC_NOTIFICATION_ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      } as AdHocNotificationErrorResponse);
    }
  }

  /**
   * Handle test results summary template
   */
  private async handleTestResultsSummary(
    req: Request,
    res: Response,
    release: any,
    tenantId: string,
    releaseId: string,
    userId: string | undefined,
    channels: Array<{ id: string; name: string }>,
    commsConfigId: string
  ): Promise<void> {
    // Step 1: Check if CREATE_TEST_SUITE task is completed
    const createTestSuiteTask = await this.releaseTaskRepository.findByTaskType(
      releaseId,
      TaskType.CREATE_TEST_SUITE
    );

    if (!createTestSuiteTask || createTestSuiteTask.taskStatus !== TaskStatus.COMPLETED) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ADHOC_NOTIFICATION_ERROR_CODES.TEST_SUITE_NOT_CREATED,
          message: ADHOC_NOTIFICATION_ERROR_MESSAGES.TEST_SUITE_NOT_CREATED
        }
      } as AdHocNotificationErrorResponse);
      return;
    }

    // Step 2: Get test results for all platforms
    const testStatusResults = await this.releaseStatusService.getTestManagementStatus(releaseId);
    
    // Handle single platform result
    if ('platform' in testStatusResults) {
      const singleResult = testStatusResults;
      if (!singleResult.hasTestRun || !singleResult.runId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.TEST_SUITE_NOT_CREATED,
            message: ADHOC_NOTIFICATION_ERROR_MESSAGES.TEST_SUITE_NOT_CREATED
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      // Check if test status retrieval failed
      if ('error' in singleResult && singleResult.error) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.SLACK_API_ERROR,
            message: `Failed to retrieve test results: ${singleResult.error}`,
            details: { error: singleResult.error }
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      // Check if test results exist
      if (!singleResult.testResults) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.TEST_SUITE_NOT_CREATED,
            message: 'Test results not yet available'
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      // Send notification for single platform
      const responses = await this.sendTestResultsSummaryForPlatform(
        singleResult,
        channels,
        commsConfigId,
        releaseId,
        tenantId,
        userId
      );

      // Record notification in database
      const deliveryStatus = Object.fromEntries(responses);
      const notification = await this.notificationRepository.create({
        tenantId,
        releaseId,
        notificationType: NotificationType.TEST_RESULTS_SUMMARY,
        isSystemGenerated: false,
        createdByUserId: userId ?? null,
        taskId: null,
        delivery: deliveryStatus
      });

      // Log activity
      if (userId) {
        await this.unifiedActivityLogService.registerActivityLog({
          entityType: EntityType.RELEASE,
          entityId: releaseId,
          tenantId: release.tenantId,
          updatedBy: userId,
          type: ADHOC_NOTIFICATION_ACTIVITY_LOG_TYPE,
          previousValue: null,
          newValue: {
            notificationId: notification.id,
            type: 'template',
            messageType: 'test-results-summary',
            platform: singleResult.platform,
            channels: channels.map(ch => ch.name),
            channelIds: channels.map(ch => ch.id)
          }
        });
      }

      const channelNames = channels.map(ch => `#${ch.name}`);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: ADHOC_NOTIFICATION_SUCCESS_MESSAGES.SENT,
        notification: {
          id: notification.id,
          sentTo: channelNames,
          sentAt: notification.createdAt.toISOString()
        }
      } as AdHocNotificationResponse);
      return;
    }

    // Handle multiple platforms
    const allResults = testStatusResults;
    
    // Check for errors in any platform
    const platformsWithErrors = allResults.platforms.filter(p => 'error' in p && p.error);
    if (platformsWithErrors.length > 0) {
      const errorMessages = platformsWithErrors.map(
        p => `${p.platform}: ${p.error}`
      ).join('; ');
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ADHOC_NOTIFICATION_ERROR_CODES.SLACK_API_ERROR,
          message: `Failed to retrieve test results: ${errorMessages}`,
          details: { errors: platformsWithErrors.map(p => ({ platform: p.platform, error: p.error })) }
        }
      } as AdHocNotificationErrorResponse);
      return;
    }
    
    const platformsWithRuns = allResults.platforms.filter(
      p => p.hasTestRun && p.runId && p.testResults
    );

    if (platformsWithRuns.length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ADHOC_NOTIFICATION_ERROR_CODES.TEST_SUITE_NOT_CREATED,
          message: ADHOC_NOTIFICATION_ERROR_MESSAGES.TEST_SUITE_NOT_CREATED
        }
      } as AdHocNotificationErrorResponse);
      return;
    }

    // Send notification for each platform
    const channelIds = channels.map(ch => ch.id);
    const allResponses = new Map<string, any>();

    for (const platformResult of platformsWithRuns) {
      const responses = await this.sendTestResultsSummaryForPlatform(
        platformResult,
        channels,
        commsConfigId,
        releaseId,
        tenantId,
        userId
      );
      
      // Merge responses (if multiple platforms, later responses overwrite earlier ones for same channel)
      // This is fine since we're sending to the same channels for all platforms
      for (const [channelId, response] of responses) {
        allResponses.set(channelId, response);
      }
    }

    // Record notification in database (one record for all platforms)
    const deliveryStatus = Object.fromEntries(allResponses);
    const notification = await this.notificationRepository.create({
      tenantId,
      releaseId,
      notificationType: NotificationType.TEST_RESULTS_SUMMARY,
      isSystemGenerated: false,
      createdByUserId: userId ?? null,
      taskId: null,
      delivery: deliveryStatus
    });

    // Log activity
    if (userId) {
      await this.unifiedActivityLogService.registerActivityLog({
        entityType: EntityType.RELEASE,
        entityId: releaseId,
        tenantId: release.tenantId,
        updatedBy: userId,
        type: ADHOC_NOTIFICATION_ACTIVITY_LOG_TYPE,
        previousValue: null,
        newValue: {
          notificationId: notification.id,
          type: 'template',
          messageType: 'test-results-summary',
          platforms: platformsWithRuns.map(p => p.platform),
          channels: channels.map(ch => ch.name),
          channelIds: channelIds
        }
      });
    }

    const channelNames = channels.map(ch => `#${ch.name}`);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: ADHOC_NOTIFICATION_SUCCESS_MESSAGES.SENT,
      notification: {
        id: notification.id,
        sentTo: channelNames,
        sentAt: notification.createdAt.toISOString()
      }
    } as AdHocNotificationResponse);
  }

  /**
   * Send test results summary for a single platform
   */
  private async sendTestResultsSummaryForPlatform(
    platformResult: any,
    channels: Array<{ id: string; name: string }>,
    commsConfigId: string,
    releaseId: string,
    tenantId: string,
    userId: string | undefined
  ): Promise<Map<string, any>> {
    const testResults = platformResult.testResults;
    if (!testResults) {
      throw new Error(`Test results not available for platform ${platformResult.platform}`);
    }

    // Get platform + target display name (e.g., "iOS App Store", "Android Play Store")
    const platformTargetDisplayName = this.formatPlatformTargetName(
      platformResult.platform,
      platformResult.target
    );

    // Build parameters for template
    // Template expects: {0}=platformName, {1}=total, {2}=passed, {3}=failed, {4}=skipped, {5}=passRate, {6}=reportUrl
    const total = String(testResults.total ?? 0);
    const passed = String(testResults.passed ?? 0);
    const failed = String(testResults.failed ?? 0);
    // Skipped = untested + blocked
    const untested = testResults.untested ?? 0;
    const blocked = testResults.blocked ?? 0;
    const skipped = String(untested + blocked);
    const passRate = testResults.passPercentage ? String(testResults.passPercentage) : '0';
    const reportUrl = platformResult.runLink ?? '';

    const parameters = [platformTargetDisplayName, total, passed, failed, skipped, passRate, reportUrl];
    const channelIds = channels.map(ch => ch.id);

    // Send to specific channels (no platform enum needed - template is now generalized)
    return await this.messagingService.sendMessage(
      commsConfigId,
      Task.TEST_RESULTS_SUMMARY,
      parameters,
      undefined,
      undefined,
      channelIds
    );
  }

  /**
   * Format platform + target combination into display name
   * Uses existing utility functions to avoid hardcoding
   * 
   * @example
   * formatPlatformTargetName('IOS', 'APP_STORE') → "iOS App Store"
   * formatPlatformTargetName('ANDROID', 'PLAY_STORE') → "Android Play Store"
   */
  private formatPlatformTargetName(platform: string, target: string): string {
    const platformUpper = platform.toUpperCase() as PlatformName;
    const targetUpper = target.toUpperCase() as TargetName;
    
    const platformDisplay = getPlatformDisplayName(platformUpper);
    const targetDisplay = getTargetDisplayName(targetUpper);
    
    return `${platformDisplay} ${targetDisplay}`;
  }

  /**
   * Handle manual build upload reminder template
   */
  private async handleManualBuildUploadReminder(
    req: Request,
    res: Response,
    release: any,
    tenantId: string,
    releaseId: string,
    userId: string | undefined,
    channels: Array<{ id: string; name: string }>,
    commsConfigId: string
  ): Promise<void> {
    try {
      // Step 1: Check if release has manual build upload enabled
      if (!release.hasManualBuildUpload) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.NO_MANUAL_BUILD_PENDING,
            message: ADHOC_NOTIFICATION_ERROR_MESSAGES.NO_MANUAL_BUILD_PENDING
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      // Step 2: Find all build tasks
      const allTasks = await this.releaseTaskRepository.findByReleaseId(releaseId);
      const buildTaskTypes = [
        TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
        TaskType.TRIGGER_REGRESSION_BUILDS,
        TaskType.TRIGGER_TEST_FLIGHT_BUILD,
        TaskType.CREATE_AAB_BUILD
      ];

      // Import task name utilities for error messages
      const { TASK_TYPE_TO_NAME } = await import('~services/release/task-executor/task-executor.constants');

      // Step 3: Filter to build tasks and categorize by status
      const buildTasks = allTasks.filter(task => buildTaskTypes.includes(task.taskType as TaskType));
      const awaitingManualBuildTasks = buildTasks.filter(
        task => task.taskStatus === TaskStatus.AWAITING_MANUAL_BUILD
      );
      const pendingBuildTasks = buildTasks.filter(
        task => task.taskStatus === TaskStatus.PENDING
      );

      // Step 4: Check if any build tasks are actually awaiting manual upload
      if (awaitingManualBuildTasks.length === 0) {
        // Provide helpful context about what state the build tasks are in
        let detailedMessage = 'No build tasks are currently awaiting manual upload.';
        let errorCode: string = ADHOC_NOTIFICATION_ERROR_CODES.NO_MANUAL_BUILD_PENDING;
        
        if (pendingBuildTasks.length > 0) {
          errorCode = ADHOC_NOTIFICATION_ERROR_CODES.BUILD_TASK_NOT_READY;
          const pendingTaskNames = pendingBuildTasks.map(task => TASK_TYPE_TO_NAME[task.taskType as TaskType]);
          detailedMessage = `Build task(s) exist but are not yet ready for manual upload.\n\n**Pending build tasks** (waiting for task executor):\n- ${pendingTaskNames.join('\n- ')}`;
          detailedMessage += '\n\nThese tasks will transition to "Awaiting Manual Build" status when the task executor (cron job) processes them. Please wait a few moments and try again.';
        } else {
          const completedOrInProgressTasks = buildTasks.filter(
            task => task.taskStatus === TaskStatus.COMPLETED || task.taskStatus === TaskStatus.IN_PROGRESS
          );
          if (completedOrInProgressTasks.length > 0) {
            detailedMessage += ' All builds have been uploaded or are currently processing.';
          } else {
            detailedMessage += ' No build tasks have been created for this release yet.';
          }
        }

        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: errorCode,
            message: detailedMessage
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      const buildTasksToNotify = awaitingManualBuildTasks;

      // Step 5: Get platform mappings to determine which platforms are needed
      const platformMappings = release.platformTargetMappings ?? [];
      
      // Step 6: Import required utilities
      const { getRequiredPlatformsForTask } = await import('~utils/awaiting-manual-build.utils');
      const { buildDelivrUrl } = await import('~services/release/task-executor/task-executor.utils');

      // Step 7: Build and send notifications for each waiting task
      const channelIds = channels.map(ch => ch.id);
      const allResponses = new Map<string, any>();
      const taskDetails: Array<{ taskType: string; platforms: string[]; buildType: string }> = [];

      for (const task of buildTasksToNotify) {
        // Get required platforms for this task
        const requiredPlatforms = getRequiredPlatformsForTask(
          task.taskType as TaskType,
          platformMappings.map(m => ({ platform: m.platform, version: m.version }))
        );

        if (requiredPlatforms.length === 0) {
          continue; // Skip if no platforms required
        }

        // Get build type name
        const buildTypeName = TASK_TYPE_TO_NAME[task.taskType as TaskType] ?? task.taskType;

        // Build platform + buildType string
        // For single platform: "iOS Pre-Regression Builds"
        // For multiple platforms: "iOS, Android Pre-Regression Builds"
        const platformNames = requiredPlatforms.map(p => getPlatformDisplayName(p));
        const platformString = platformNames.length === 1
          ? platformNames[0]
          : platformNames.join(', ');
        const buildTypeString = `${platformString} ${buildTypeName}`;

        // Build release URL
        const releaseUrl = buildDelivrUrl(tenantId, releaseId);

        // Send notification
        const responses = await this.messagingService.sendMessage(
          commsConfigId,
          Task.MANUAL_BUILD_UPLOAD_REMINDER,
          [buildTypeString, releaseUrl],
          undefined,
          undefined,
          channelIds
        );

        // Merge responses
        for (const [channelId, response] of responses) {
          allResponses.set(channelId, response);
        }

        taskDetails.push({
          taskType: task.taskType,
          platforms: platformNames,
          buildType: buildTypeName
        });
      }

      // Step 7: Record notification in database
      const deliveryStatus = Object.fromEntries(allResponses);
      const notification = await this.notificationRepository.create({
        tenantId,
        releaseId,
        notificationType: NotificationType.MANUAL_BUILD_UPLOAD_REMINDER,
        isSystemGenerated: false,
        createdByUserId: userId ?? null,
        taskId: null,
        delivery: deliveryStatus
      });

      // Step 8: Log activity
      if (userId) {
        await this.unifiedActivityLogService.registerActivityLog({
          entityType: EntityType.RELEASE,
          entityId: releaseId,
          tenantId: release.tenantId,
          updatedBy: userId,
          type: ADHOC_NOTIFICATION_ACTIVITY_LOG_TYPE,
          previousValue: null,
          newValue: {
            notificationId: notification.id,
            type: 'template',
            messageType: 'manual-build-upload-reminder',
            tasks: taskDetails,
            channels: channels.map(ch => ch.name),
            channelIds: channelIds
          }
        });
      }

      // Step 9: Build response
      const channelNames = channels.map(ch => `#${ch.name}`);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: ADHOC_NOTIFICATION_SUCCESS_MESSAGES.SENT,
        notification: {
          id: notification.id,
          sentTo: channelNames,
          sentAt: notification.createdAt.toISOString()
        }
      } as AdHocNotificationResponse);
    } catch (error) {
      console.error('[AdHocNotificationController] Failed to send manual build upload reminder:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: ADHOC_NOTIFICATION_ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      } as AdHocNotificationErrorResponse);
    }
  }

  /**
   * Handle project management approval notification
   * Validates:
   * 1. Project management is integrated
   * 2. Pre-release tasks are complete
   * 3. Tickets are not yet approved
   */
  private async handleProjectManagementApproval(
    req: Request,
    res: Response,
    release: any,
    tenantId: string,
    releaseId: string,
    userId: string | undefined,
    channels: Array<{ id: string; name: string }>,
    commsConfigId: string
  ): Promise<void> {
    try {
      // Step 1: Check if project management is integrated
      const releaseConfig = await this.releaseConfigService.getConfigById(release.releaseConfigId);
      const pmConfigId = releaseConfig?.projectManagementConfigId;

      if (!pmConfigId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.INVALID_REQUEST,
            message: 'Project management is not integrated for this release'
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      // Step 2: Check if pre-release tasks are complete
      const allTasks = await this.releaseTaskRepository.findByReleaseId(releaseId);
      const stage3Tasks = allTasks.filter(t => t.stage === 'PRE_RELEASE');

      const baseTasks = stage3Tasks.filter(t =>
        t.taskType === TaskType.CREATE_RELEASE_TAG ||
        t.taskType === TaskType.CREATE_FINAL_RELEASE_NOTES
      );
      const platformTasks = stage3Tasks.filter(t =>
        t.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD ||
        t.taskType === TaskType.CREATE_AAB_BUILD
      );

      const allBaseTasksComplete = baseTasks.length === 2 &&
        baseTasks.every(t => t.taskStatus === TaskStatus.COMPLETED);
      const atLeastOnePlatformTaskComplete = platformTasks.some(
        t => t.taskStatus === TaskStatus.COMPLETED
      );

      if (!allBaseTasksComplete || !atLeastOnePlatformTaskComplete) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.INVALID_REQUEST,
            message: 'Pre-release tasks are not yet complete'
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      // Step 3: Check if tickets are NOT approved
      const ticketsApproved = await this.releaseStatusService.allPlatformsPassingProjectManagement(releaseId);

      if (ticketsApproved) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.INVALID_REQUEST,
            message: 'All project management tickets are already approved'
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      // Step 4: Get ticket URLs
      const platformMappings = await this.platformMappingRepository.getByReleaseId(releaseId);
      const links: string[] = [];

      for (const mapping of platformMappings) {
        if (mapping.projectManagementRunId) {
          try {
            const ticketUrl = await this.pmTicketService.getTicketUrl({
              pmConfigId,
              platform: mapping.platform as any,
              ticketKey: mapping.projectManagementRunId
            });
            links.push(ticketUrl);
          } catch (error) {
            console.error(`[AdHocNotificationController] Error getting ticket URL for ${mapping.platform}:`, error);
          }
        }
      }

      if (links.length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: ADHOC_NOTIFICATION_ERROR_CODES.INVALID_REQUEST,
            message: 'No project management tickets found for this release'
          }
        } as AdHocNotificationErrorResponse);
        return;
      }

      // Step 5: Build notification parameters
      const { buildDelivrUrl } = await import('~services/release/task-executor/task-executor.utils');
      const delivrUrl = buildDelivrUrl(tenantId, releaseId);
      const ticketList = links.join('\n');

      // Step 6: Send notification
      const channelIds = channels.map(ch => ch.id);
      const responses = await this.messagingService.sendMessage(
        commsConfigId,
        Task.PROJECT_MANAGEMENT_APPROVAL,
        [delivrUrl, ticketList],
        undefined,
        undefined,
        channelIds
      );

      // Step 7: Record notification
      const deliveryStatus = Object.fromEntries(responses);
      const notification = await this.notificationRepository.create({
        releaseId,
        tenantId,
        notificationType: NotificationType.PROJECT_MANAGEMENT_APPROVAL,
        isSystemGenerated: false,
        delivery: deliveryStatus,
        createdByUserId: userId ?? null,
        taskId: null
      });

      // Step 9: Log activity
      if (userId) {
        await this.unifiedActivityLogService.registerActivityLog({
          entityType: EntityType.RELEASE,
          entityId: releaseId,
          tenantId: release.tenantId,
          updatedBy: userId,
          type: ADHOC_NOTIFICATION_ACTIVITY_LOG_TYPE,
          previousValue: null,
          newValue: {
            notificationId: notification.id,
            type: 'template',
            messageType: 'project-management-approval',
            channels: channels.map(ch => ch.name),
            channelIds: channels.map(ch => ch.id),
            ticketsCount: links.length
          }
        });
      }

      // Step 10: Build response
      const channelNames = channels.map(ch => `#${ch.name}`);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: ADHOC_NOTIFICATION_SUCCESS_MESSAGES.SENT,
        notification: {
          id: notification.id,
          sentTo: channelNames,
          sentAt: notification.createdAt.toISOString()
        }
      } as AdHocNotificationResponse);
    } catch (error) {
      console.error('[AdHocNotificationController] Failed to send project management approval:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: ADHOC_NOTIFICATION_ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      } as AdHocNotificationErrorResponse);
    }
  }

}

/**
 * Factory function to create controller with dependencies
 */
export function createAdHocNotificationController(
  releaseRetrievalService: ReleaseRetrievalService,
  releaseConfigService: ReleaseConfigService,
  commConfigService: CommConfigService,
  messagingService: MessagingService,
  notificationRepository: ReleaseNotificationRepository,
  unifiedActivityLogService: UnifiedActivityLogService,
  releaseStatusService: ReleaseStatusService,
  releaseTaskRepository: ReleaseTaskRepository,
  pmTicketService: ProjectManagementTicketService,
  platformMappingRepository: ReleasePlatformTargetMappingRepository
): AdHocNotificationController {
  return new AdHocNotificationController(
    releaseRetrievalService,
    releaseConfigService,
    commConfigService,
    messagingService,
    notificationRepository,
    unifiedActivityLogService,
    releaseStatusService,
    releaseTaskRepository,
    pmTicketService,
    platformMappingRepository
  );
}
