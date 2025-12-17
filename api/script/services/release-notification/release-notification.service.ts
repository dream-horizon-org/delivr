/**
 * Release Notification Service
 * 
 * Orchestrates sending release-related notifications and maintains
 * a ledger of all notifications sent.
 * 
 * Responsibilities:
 * - Accept notification payloads from orchestration layer
 * - Transform payload parameters into template parameters
 * - Delegate message sending to MessagingService
 * - Record notification attempts in database
 */

import type { MessagingService } from '~services/integrations/comm/messaging/messaging.service';
import type { ReleaseNotificationRepository } from '~models/release-notification';
import type { ReleaseConfigService } from '~services/release-configs';
import type { ReleaseRetrievalService } from '~services/release/release-retrieval.service';
import type {
  NotificationPayload,
  NotificationResult,
  TemplatePlatformKey
} from '~types/release-notification';
import { 
  PlatformName,
  TargetName,
  PLATFORM_SPECIFIC_NOTIFICATION_TYPES,
  PLATFORM_TARGET_TO_TEMPLATE_KEY 
} from '~types/release-notification';
import {
  RELEASE_NOTIFICATION_ERROR_MESSAGES,
  NOTIFICATION_TYPE_TO_TASK
} from './release-notification.constants';
import { NotificationType } from '~types/release-notification';
import type { Task } from '~services/integrations/comm/messaging/messaging.interface';
import { Platform } from '~services/integrations/comm/messaging/messaging.interface';

/**
 * Release Notification Service
 */
export class ReleaseNotificationService {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly notificationRepo: ReleaseNotificationRepository,
    private readonly releaseConfigService: ReleaseConfigService,
    private readonly releaseRetrievalService: ReleaseRetrievalService
  ) {}

  /**
   * Send a notification and record it in the ledger
   * 
   * Process:
   * 1. Get comms config ID from release
   * 2. Map notification type to messaging task
   * 3. Build template parameters from payload
   * 4. Resolve platform for platform-specific templates
   * 5. Determine file URL for build sharing templates
   * 6. Send message via MessagingService
   * 7. Create database record with delivery response
   * 
   * @param payload - Typed notification payload with all required fields
   * @returns NotificationResult with success metrics and notification ID
   * @throws Error if comms config missing, release not found, or message sending fails
   */
  async notify(payload: NotificationPayload): Promise<NotificationResult> {
    try {
      // 1. Get comms config ID from release
      const commsConfigId = await this.getCommsConfigId(payload.releaseId);

      // 2. Map NotificationType → Task
      const task = this.mapTypeToTask(payload.type);

      // 3. Build template parameters
      const parameters = this.buildTemplateParameters(payload);

      // 4. Resolve platform (if platform-specific)
      const platform = this.resolveMessagingPlatform(payload);

      // 5. Determine fileUrl (if build sharing template)
      const fileUrl = this.getFileUrlFromPayload(payload);

      // 6. Call messagingService.sendMessage()
      const responses = await this.messagingService.sendMessage(
        commsConfigId,
        task,
        parameters,
        fileUrl,
        platform
      );

      // 7. Create notification record with delivery response (AFTER successful sending)
      const notification = await this.notificationRepo.create({
        tenantId: payload.tenantId,
        releaseId: payload.releaseId,
        notificationType: payload.type,
        isSystemGenerated: payload.isSystemGenerated ?? true,
        createdByUserId: payload.userId ?? null,
        taskId: payload.taskId ?? null,
        delivery: Object.fromEntries(responses) // Convert Map to plain object
      });

      // 8. Calculate success metrics
      const channelsAttempted = responses.size;
      const channelsSucceeded = [...responses.values()].filter(r => r.ok).length;
      const success = channelsSucceeded > 0;

      return {
        success,
        notificationId: notification.id,
        channelsAttempted,
        channelsSucceeded
      };

    } catch (error) {
      // Handle and re-throw with context
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send notification (${payload.type}): ${errorMessage}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get comms config ID for a release
   * 
   * Flow: releaseId → release.releaseConfigId → config.commsConfigId
   * 
   * @param releaseId - Release ID (internal ID, not user-facing releaseId)
   * @returns Comms config ID
   * @throws Error if release, config, or comms config is not found/configured
   */
  private async getCommsConfigId(releaseId: string): Promise<string> {
    // Step 1: Get release
    const release = await this.releaseRetrievalService.getReleaseById(releaseId);
    if (!release) {
      throw new Error(RELEASE_NOTIFICATION_ERROR_MESSAGES.RELEASE_NOT_FOUND);
    }

    // Step 2: Check if release has a linked config
    const releaseConfigId = release.releaseConfigId;
    if (!releaseConfigId) {
      throw new Error(RELEASE_NOTIFICATION_ERROR_MESSAGES.RELEASE_CONFIG_NOT_LINKED);
    }

    // Step 3: Get release configuration
    const releaseConfig = await this.releaseConfigService.getConfigById(releaseConfigId);
    if (!releaseConfig) {
      throw new Error(RELEASE_NOTIFICATION_ERROR_MESSAGES.RELEASE_CONFIG_NOT_FOUND);
    }

    // Step 4: Check if comms config is set up
    const commsConfigId = releaseConfig.commsConfigId;
    if (!commsConfigId) {
      throw new Error(RELEASE_NOTIFICATION_ERROR_MESSAGES.COMMS_CONFIG_NOT_CONFIGURED);
    }

    return commsConfigId;
  }

  /**
   * Map NotificationType to messaging Task enum
   * @param type - Notification type
   * @returns Task enum value
   * @throws Error if notification type is not supported
   */
  private mapTypeToTask(type: NotificationType): Task {
    const task = NOTIFICATION_TYPE_TO_TASK[type];
    if (!task) {
      throw new Error(`${RELEASE_NOTIFICATION_ERROR_MESSAGES.UNSUPPORTED_NOTIFICATION_TYPE}: ${type}`);
    }
    return task;
  }

  /**
   * Build template parameters from payload
   * @param payload - Notification payload
   * @returns Array of string parameters for template placeholders
   * 
   * Note: Build notification URL handling:
   * - displayUrl: Used in message (parameter {2}) with platform-specific label
   * - artifactDownloadUrl: Used for file attachment (via getFileUrlFromPayload)
   * - Template structure for builds: {0}=version, {1}=branch, {2}=optional URL line
   * 
   * Build notifications:
   * - PREREGRESSION_BUILDS: displayUrl in message, artifactDownloadUrl for attachment
   * - REGRESSION_BUILDS: displayUrl in message, artifactDownloadUrl for attachment
   * - IOS_TEST_FLIGHT_BUILD: displayUrl in message, artifactDownloadUrl optional
   * - ANDROID_AAB_BUILD: displayUrl in message, artifactDownloadUrl optional
   */
  private buildTemplateParameters(payload: NotificationPayload): string[] {
    switch (payload.type) {
      // ============================================================================
      // STAGE 1: KICKOFF
      // ============================================================================
      
      case NotificationType.PRE_KICKOFF_REMINDER:
        return [
          payload.releaseType,  // {0}
          payload.version,      // {1}
          payload.forkDate,     // {2}
          payload.detailsUrl    // {3}
        ];

      case NotificationType.BRANCH_FORKOUT:
        return [
          payload.version,  // {0}
          payload.branch    // {1}
        ];

      case NotificationType.PROJECT_MANAGEMENT_LINKS:
        return [
          payload.version,              // {0}
          payload.links.join('\n')      // {1} - convert array to newline-separated string
        ];

      case NotificationType.TEST_MANAGEMENT_LINKS:
        return [
          payload.version,              // {0}
          payload.links.join('\n')      // {1} - convert array to newline-separated string
        ];

      case NotificationType.REGRESSION_KICKOFF_REMINDER:
        return [
          payload.datetime,  // {0}
          payload.branch     // {1}
        ];

      // ============================================================================
      // PLATFORM-SPECIFIC TEMPLATES
      // ============================================================================

      case NotificationType.PREREGRESSION_BUILDS: {
        // Use displayUrl (no fallback to artifactDownloadUrl)
        const displayUrl = payload.displayUrl;
        
        // Build URL line with conditional newline
        let urlLine = '';
        if (displayUrl) {
          urlLine = `\nDownload: ${displayUrl}`;
        }
        
        return [
          payload.version,  // {0}
          payload.branch,   // {1}
          urlLine           // {2} - conditional URL with label
        ];
      }

      case NotificationType.PREREGRESSION_BUILDS_FAILED:
        return [
          payload.workflowUrl   // {0}
        ];

      case NotificationType.REGRESSION_BUILDS: {
        // Use displayUrl (no fallback to artifactDownloadUrl)
        const displayUrl = payload.displayUrl;
        
        // Build URL line with conditional newline
        let urlLine = '';
        if (displayUrl) {
          urlLine = `\nDownload: ${displayUrl}`;
        }
        
        return [
          payload.version,  // {0}
          payload.branch,   // {1}
          urlLine           // {2} - conditional URL with label
        ];
      }

      case NotificationType.REGRESSION_BUILDS_FAILED:
        return [
          payload.workflowUrl   // {0}
        ];

      case NotificationType.TEST_RESULTS_SUMMARY:
        return [
          payload.total,     // {0}
          payload.passed,    // {1}
          payload.failed,    // {2}
          payload.skipped,   // {3}
          payload.passRate,  // {4}
          payload.reportUrl  // {5}
        ];

      // ============================================================================
      // STAGE 2: REGRESSION (remaining)
      // ============================================================================

      case NotificationType.RELEASE_NOTES:
        return [
          payload.startTag,     // {0}
          payload.endTag,       // {1}
          payload.features,     // {2}
          payload.fixes,        // {3}
          payload.improvements  // {4}
        ];

      case NotificationType.NEW_SLOT_ADDED:
        return [
          payload.slotDatetime  // {0}
        ];

      // ============================================================================
      // STAGE 3: POST-REGRESSION
      // ============================================================================

      case NotificationType.IOS_TEST_FLIGHT_BUILD: {
        // Use displayUrl (no fallback to artifactDownloadUrl)
        const displayUrl = payload.displayUrl;
        
        // Build URL line with conditional newline
        let urlLine = '';
        if (displayUrl) {
          urlLine = `\nView in TestFlight: ${displayUrl}`;
        }
        
        return [
          payload.version,  // {0}
          payload.branch,   // {1}
          urlLine           // {2} - conditional URL with label
        ];
      }

      case NotificationType.ANDROID_AAB_BUILD: {
        // Use displayUrl (no fallback to artifactDownloadUrl)
        const displayUrl = payload.displayUrl;
        
        // Build URL line with conditional newline
        let urlLine = '';
        if (displayUrl) {
          urlLine = `\nDownload: ${displayUrl}`;
        }
        
        return [
          payload.version,  // {0}
          payload.branch,   // {1}
          urlLine           // {2} - conditional URL with label
        ];
      }

      case NotificationType.WHATS_NEW:
        return [
          payload.releaseType,  // {0}
          payload.version,      // {1}
          payload.features,     // {2}
          payload.fixes,        // {3}
          payload.improvements  // {4}
        ];

      case NotificationType.REGRESSION_STAGE_APPROVAL_REQUEST:
        return [
          payload.delivrUrl     // {0}
        ];

      case NotificationType.PRE_DISTRIBUTION_STAGE_APPROVAL_REQUEST:
        return [
          payload.delivrUrl     // {0}
        ];

      // ============================================================================
      // RELEASE LIFECYCLE
      // ============================================================================

      case NotificationType.TARGET_DATE_CHANGED:
        return [
          payload.previousDate,  // {0}
          payload.newDate        // {1}
        ];

      case NotificationType.IOS_APPSTORE_BUILD_SUBMITTED:
        return [
          payload.version        // {0}
        ];

      case NotificationType.ANDROID_PLAYSTORE_BUILD_SUBMITTED:
        return [
          payload.version        // {0}
        ];

      case NotificationType.IOS_APPSTORE_LIVE:
        return [
          payload.version        // {0}
        ];

      case NotificationType.ANDROID_PLAYSTORE_LIVE:
        return [
          payload.version        // {0}
        ];

      case NotificationType.ANDROID_WEB_LIVE:
        return [
          payload.version        // {0}
        ];

      // ============================================================================
      // ERRORS & REMINDERS
      // ============================================================================

      case NotificationType.TASK_FAILED:
        return [
          payload.taskName,     // {0}
          payload.delivrUrl     // {1}
        ];

      case NotificationType.MANUAL_BUILD_UPLOAD_REMINDER:
        return [
          payload.buildType,    // {0}
          payload.delivrUrl     // {1}
        ];

      default:
        // TypeScript exhaustiveness check - this should never be reached
        const _exhaustiveCheck: never = payload;
        throw new Error(`Unsupported notification type for parameter building: ${(payload as any).type}`);
    }
  }

  /**
   * Resolve messaging platform from payload platform/target
   * @param payload - Notification payload
   * @returns Platform enum value for platform-specific templates, undefined otherwise
   */
  // TODO: Implement in Step 3.5
  private resolveMessagingPlatform(payload: NotificationPayload): Platform | undefined {
    // Check if this is a platform-specific notification type
    if (!PLATFORM_SPECIFIC_NOTIFICATION_TYPES.includes(payload.type)) {
      return undefined;
    }

    // Platform-specific payloads have platform and target fields
    if ('platform' in payload && 'target' in payload) {
      return this.mapPlatformTargetToMessagingPlatform(payload.platform, payload.target);
    }

    return undefined;
  }

  /**
   * Map PlatformName + TargetName to MessagingService Platform enum
   * 
   * Mapping chain:
   * 1. PlatformName + TargetName → TemplatePlatformKey (via PLATFORM_TARGET_TO_TEMPLATE_KEY)
   * 2. TemplatePlatformKey → MessagingService.Platform enum
   * 
   * Examples:
   * - IOS + APP_STORE → 'ios_app_store' → Platform.IOS_APP_STORE
   * - ANDROID + PLAY_STORE → 'android_play_store' → Platform.ANDROID_PLAY_STORE
   * - ANDROID + WEB → 'android_web' → Platform.ANDROID_WEB
   * 
   * @param platform - Platform name from payload
   * @param target - Target name from payload
   * @returns Platform enum value for MessagingService.sendMessage()
   */
  private mapPlatformTargetToMessagingPlatform(
    platform: PlatformName, 
    target: TargetName
  ): Platform {
    // Step 1: Get template platform key using existing mapping
    const templateKey = PLATFORM_TARGET_TO_TEMPLATE_KEY[`${platform}_${target}`];
    
    if (!templateKey) {
      throw new Error(`Unsupported platform + target combination: ${platform} + ${target}`);
    }
    
    // Step 2: Map template key to MessagingService Platform enum
    const templateKeyToPlatform: Record<TemplatePlatformKey, Platform> = {
      'ios_app_store': Platform.IOS_APP_STORE,
      'android_play_store': Platform.ANDROID_PLAY_STORE,
      'android_web': Platform.ANDROID_WEB
    };
    
    const messagingPlatform = templateKeyToPlatform[templateKey];
    
    if (!messagingPlatform) {
      throw new Error(`No MessagingService Platform mapping for template key: ${templateKey}`);
    }
    
    return messagingPlatform;
  }

  /**
   * Determine if notification type requires file attachment
   * @param payload - Notification payload
   * @returns artifactDownloadUrl if file attachment needed, undefined otherwise
   * 
   * Note: Uses artifactDownloadUrl field (no fallback to displayUrl)
   * - displayUrl is for showing in the message
   * - artifactDownloadUrl is for downloading/attaching the artifact
   */
  private getFileUrlFromPayload(payload: NotificationPayload): string | undefined {
    // Only build sharing templates need file attachment
    if (payload.type === NotificationType.PREREGRESSION_BUILDS ||
        payload.type === NotificationType.REGRESSION_BUILDS ||
        payload.type === NotificationType.IOS_TEST_FLIGHT_BUILD ||
        payload.type === NotificationType.ANDROID_AAB_BUILD) {
      // Use artifactDownloadUrl (no fallback to displayUrl)
      return payload.artifactDownloadUrl;
    }
    
    return undefined;
  }

}

