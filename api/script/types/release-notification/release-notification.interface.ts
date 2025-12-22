/**
 * Release Notification Interfaces
 * Types for the notification orchestration service
 */

import { PlatformName, TargetName } from '~models/release/release.interface';

// Re-export for convenience
export { PlatformName, TargetName };

// ============================================================================
// NOTIFICATION TYPE ENUM
// ============================================================================

export enum NotificationType {
  PRE_KICKOFF_REMINDER = 'PRE_KICKOFF_REMINDER',
  BRANCH_FORKOUT = 'BRANCH_FORKOUT',
  PROJECT_MANAGEMENT_LINKS = 'PROJECT_MANAGEMENT_LINKS',
  TEST_MANAGEMENT_LINKS = 'TEST_MANAGEMENT_LINKS',
  PREREGRESSION_BUILDS = 'PREREGRESSION_BUILDS',
  PREREGRESSION_BUILDS_FAILED = 'PREREGRESSION_BUILDS_FAILED',
  REGRESSION_KICKOFF_REMINDER = 'REGRESSION_KICKOFF_REMINDER',
  REGRESSION_BUILDS = 'REGRESSION_BUILDS',
  REGRESSION_BUILDS_FAILED = 'REGRESSION_BUILDS_FAILED',
  RELEASE_NOTES = 'RELEASE_NOTES',
  TEST_RESULTS_SUMMARY = 'TEST_RESULTS_SUMMARY',
  NEW_SLOT_ADDED = 'NEW_SLOT_ADDED',
  IOS_TEST_FLIGHT_BUILD = 'IOS_TEST_FLIGHT_BUILD',
  ANDROID_AAB_BUILD = 'ANDROID_AAB_BUILD',
  WHATS_NEW = 'WHATS_NEW',
  REGRESSION_STAGE_APPROVAL_REQUEST = 'REGRESSION_STAGE_APPROVAL_REQUEST',
  PRE_DISTRIBUTION_STAGE_APPROVAL_REQUEST = 'PRE_DISTRIBUTION_STAGE_APPROVAL_REQUEST',
  TARGET_DATE_CHANGED = 'TARGET_DATE_CHANGED',
  IOS_APPSTORE_BUILD_SUBMITTED = 'IOS_APPSTORE_BUILD_SUBMITTED',
  ANDROID_PLAYSTORE_BUILD_SUBMITTED = 'ANDROID_PLAYSTORE_BUILD_SUBMITTED',
  IOS_APPSTORE_LIVE = 'IOS_APPSTORE_LIVE',
  ANDROID_PLAYSTORE_LIVE = 'ANDROID_PLAYSTORE_LIVE',
  ANDROID_WEB_LIVE = 'ANDROID_WEB_LIVE',
  TASK_FAILED = 'TASK_FAILED',
  MANUAL_BUILD_UPLOAD_REMINDER = 'MANUAL_BUILD_UPLOAD_REMINDER',
  IOS_APPSTORE_BUILD_RESUBMITTED = 'IOS_APPSTORE_BUILD_RESUBMITTED',
  ANDROID_PLAYSTORE_BUILD_RESUBMITTED = 'ANDROID_PLAYSTORE_BUILD_RESUBMITTED',
  IOS_APPSTORE_BUILD_REJECTED = 'IOS_APPSTORE_BUILD_REJECTED',
  IOS_APPSTORE_BUILD_CANCELLED = 'IOS_APPSTORE_BUILD_CANCELLED',
  ANDROID_PLAYSTORE_USER_ACTION_PENDING = 'ANDROID_PLAYSTORE_USER_ACTION_PENDING',
  ANDROID_PLAYSTORE_SUSPENDED = 'ANDROID_PLAYSTORE_SUSPENDED',
}

// Array of all notification types for validation
export const NOTIFICATION_TYPES = Object.values(NotificationType);

// ============================================================================
// DELIVERY RESPONSE TYPES
// ============================================================================

/**
 * Individual channel delivery response (from messaging service)
 */
export type ChannelDeliveryResponse = {
  ok: boolean;
  channel: string;
  ts?: string;
  message?: unknown;
  error?: string;
  file?: {
    id: string;
    name: string;
    url?: string;
  };
};

/**
 * Delivery status - maps channel ID to delivery response
 */
export type DeliveryStatus = Record<string, ChannelDeliveryResponse>;

// ============================================================================
// ENTITY INTERFACES
// ============================================================================

/**
 * Release Notification entity (matches database schema)
 */
export type ReleaseNotification = {
  id: number;
  tenantId: string;
  releaseId: string;
  notificationType: NotificationType;
  isSystemGenerated: boolean;
  createdByUserId: string | null;
  taskId: string | null;
  delivery: DeliveryStatus | null;
  createdAt: Date;
};

// ============================================================================
// DTO INTERFACES
// ============================================================================

/**
 * DTO for creating a new notification record
 */
export type CreateReleaseNotificationDto = {
  tenantId: string;
  releaseId: string;
  notificationType: NotificationType;
  isSystemGenerated?: boolean;
  createdByUserId?: string | null;
  taskId?: string | null;
  delivery?: DeliveryStatus;
};

/**
 * DTO for updating a notification record (primarily for delivery status)
 */
export type UpdateReleaseNotificationDto = {
  delivery?: DeliveryStatus;
};

// ============================================================================
// QUERY FILTERS
// ============================================================================

/**
 * Filters for querying notifications
 */
export type NotificationQueryFilters = {
  tenantId?: string;
  releaseId?: string;
  notificationType?: NotificationType;
  isSystemGenerated?: boolean;
  createdByUserId?: string;
};

// ============================================================================
// SERVICE LAYER TYPES
// ============================================================================

/**
 * Template platform keys used in templates.json
 * Maps to platform-specific message templates
 */
export type TemplatePlatformKey =
  | 'ios_app_store'
  | 'android_play_store'
  | 'android_web';

/**
 * Notification types that require platform-specific templates
 */
export const PLATFORM_SPECIFIC_NOTIFICATION_TYPES: NotificationType[] = [
  NotificationType.PREREGRESSION_BUILDS,
  NotificationType.PREREGRESSION_BUILDS_FAILED,
  NotificationType.REGRESSION_BUILDS,
  NotificationType.REGRESSION_BUILDS_FAILED,
  NotificationType.TEST_RESULTS_SUMMARY
];

/**
 * Base payload fields required for all notification types
 */
export type BaseNotificationPayload = {
  tenantId: string;
  releaseId: string;
  isSystemGenerated?: boolean;
  userId?: string;
  taskId?: string;
};

// ============================================================================
// STAGE 1: KICKOFF PAYLOADS
// ============================================================================

export type PreKickoffReminderPayload = BaseNotificationPayload & {
  type: NotificationType.PRE_KICKOFF_REMINDER;
  releaseType: string;      // {0} - e.g., "planned"
  forkDate: string;         // {1} - e.g., "March 15, 2025"
  detailsUrl: string;       // {2} - e.g., "https://delivr.example.com/releases/v6.5.0"
};

export type BranchForkoutPayload = BaseNotificationPayload & {
  type: NotificationType.BRANCH_FORKOUT;
  branch: string;    // {0} - e.g., "release/v6.5.0"
};

export type ProjectManagementLinksPayload = BaseNotificationPayload & {
  type: NotificationType.PROJECT_MANAGEMENT_LINKS;
  links: string[];   // {0} - array of links, will be joined with newlines
};

export type TestManagementLinksPayload = BaseNotificationPayload & {
  type: NotificationType.TEST_MANAGEMENT_LINKS;
  links: string[];   // {0} - array of links, will be joined with newlines
};

export type PreregressionBuildsPayload = BaseNotificationPayload & {
  type: NotificationType.PREREGRESSION_BUILDS;
  platform: PlatformName;
  target: TargetName;
  displayUrl?: string;           // Optional: URL shown in Slack message
  artifactDownloadUrl?: string;  // Optional: URL for downloading/attaching artifact
  version: string;               // {0}
  branch: string;                // {1}
};

export type PreregressionBuildsFailedPayload = BaseNotificationPayload & {
  type: NotificationType.PREREGRESSION_BUILDS_FAILED;
  platform: PlatformName;
  target: TargetName;
  workflowUrl: string;   // {0}
};

// ============================================================================
// STAGE 2: REGRESSION PAYLOADS
// ============================================================================

export type RegressionKickoffReminderPayload = BaseNotificationPayload & {
  type: NotificationType.REGRESSION_KICKOFF_REMINDER;
  datetime: string;   // {0} - e.g., "Oct 27, 2025, 5:00 PM"
  branch: string;     // {1} - e.g., "release/v6.5.0_ps_ios"
};

export type RegressionBuildsPayload = BaseNotificationPayload & {
  type: NotificationType.REGRESSION_BUILDS;
  platform: PlatformName;
  target: TargetName;
  displayUrl?: string;           // Optional: URL shown in Slack message
  artifactDownloadUrl?: string;  // Optional: URL for downloading/attaching artifact
  version: string;               // {0}
  branch: string;                // {1}
};

export type RegressionBuildsFailedPayload = BaseNotificationPayload & {
  type: NotificationType.REGRESSION_BUILDS_FAILED;
  platform: PlatformName;
  target: TargetName;
  workflowUrl: string;   // {0}
};

export type ReleaseNotesPayload = BaseNotificationPayload & {
  type: NotificationType.RELEASE_NOTES;
  startTag: string;      // {0} - e.g., "pi_6.4.0"
  endTag: string;        // {1} - e.g., "v6.5.0_rc_0"
  features: string;      // {2} - bullet points
  fixes: string;         // {3} - bullet points
  improvements: string;  // {4} - bullet points
};

export type TestResultsSummaryPayload = BaseNotificationPayload & {
  type: NotificationType.TEST_RESULTS_SUMMARY;
  platform: PlatformName;
  target: TargetName;
  total: string;       // {0}
  passed: string;      // {1}
  failed: string;      // {2}
  skipped: string;     // {3}
  passRate: string;    // {4} - percentage without %
  reportUrl: string;   // {5}
};

export type NewSlotAddedPayload = BaseNotificationPayload & {
  type: NotificationType.NEW_SLOT_ADDED;
  slotDatetime: string;   // {0} - e.g., "March 17, 2025 14:00 PST"
};

// ============================================================================
// STAGE 3: POST-REGRESSION PAYLOADS
// ============================================================================

export type IosTestFlightBuildPayload = BaseNotificationPayload & {
  type: NotificationType.IOS_TEST_FLIGHT_BUILD;
  displayUrl?: string;           // Optional: URL shown in Slack message (TestFlight link)
  artifactDownloadUrl?: string;  // Optional: URL for downloading/attaching artifact (rarely used for TestFlight)
  version: string;               // {0}
  branch: string;                // {1}
};

export type AndroidAabBuildPayload = BaseNotificationPayload & {
  type: NotificationType.ANDROID_AAB_BUILD;
  displayUrl?: string;           // Optional: URL shown in Slack message
  artifactDownloadUrl?: string;  // Optional: URL for downloading/attaching artifact
  version: string;               // {0}
  branch: string;                // {1}
};

export type WhatsNewPayload = BaseNotificationPayload & {
  type: NotificationType.WHATS_NEW;
  releaseType: string;   // {0} - e.g., "planned"
  features: string;      // {1} - bullet points
  fixes: string;         // {2} - bullet points
  improvements: string;  // {3} - bullet points
};

export type RegressionStageApprovalRequestPayload = BaseNotificationPayload & {
  type: NotificationType.REGRESSION_STAGE_APPROVAL_REQUEST;
  delivrUrl: string;   // {0} - link to review page
};

export type PreDistributionStageApprovalRequestPayload = BaseNotificationPayload & {
  type: NotificationType.PRE_DISTRIBUTION_STAGE_APPROVAL_REQUEST;
  delivrUrl: string;   // {0} - link to review page
};

// ============================================================================
// RELEASE LIFECYCLE PAYLOADS
// ============================================================================

export type TargetDateChangedPayload = BaseNotificationPayload & {
  type: NotificationType.TARGET_DATE_CHANGED;
  previousDate: string;   // {0}
  newDate: string;        // {1}
};

export type IosAppstoreBuildSubmittedPayload = BaseNotificationPayload & {
  type: NotificationType.IOS_APPSTORE_BUILD_SUBMITTED;
  version: string;   // {0}
  testflightBuild: string;   // {1}
  submittedBy: string;   // {2}
};

export type AndroidPlaystoreBuildSubmittedPayload = BaseNotificationPayload & {
  type: NotificationType.ANDROID_PLAYSTORE_BUILD_SUBMITTED;
  version: string;   // {0}
  versionCode: string;   // {1}
  submittedBy: string;   // {2}
};

export type IosAppstoreLivePayload = BaseNotificationPayload & {
  type: NotificationType.IOS_APPSTORE_LIVE;
  version: string;   // {0}
  testflightBuild: string;   // {1}
};

export type AndroidPlaystoreLivePayload = BaseNotificationPayload & {
  type: NotificationType.ANDROID_PLAYSTORE_LIVE;
  version: string;   // {0}
  versionCode: string;   // {1}
};

export type AndroidWebLivePayload = BaseNotificationPayload & {
  type: NotificationType.ANDROID_WEB_LIVE;
  version: string;   // {0}
};


export type IosAppstoreBuildResubmittedPayload = BaseNotificationPayload & {
  type: NotificationType.IOS_APPSTORE_BUILD_RESUBMITTED;
  version: string;   // {0}
  testflightBuild: string;   // {1}
  submittedBy: string;   // {2}
};

export type AndroidPlaystoreBuildResubmittedPayload = BaseNotificationPayload & {
  type: NotificationType.ANDROID_PLAYSTORE_BUILD_RESUBMITTED;
  version: string;   // {0}
  versionCode: string;   // {1}
  submittedBy: string;   // {2}
};

export type IosAppstoreBuildRejectedPayload = BaseNotificationPayload & {
  type: NotificationType.IOS_APPSTORE_BUILD_REJECTED;
  version: string;   // {0}
  testflightBuild: string;   // {1}
  reason: string;   // {2}
};

export type IosAppstoreBuildCancelledPayload = BaseNotificationPayload & {
  type: NotificationType.IOS_APPSTORE_BUILD_CANCELLED;
  version: string;   // {0}
  testflightBuild: string;   // {1}
  cancelledBy: string;   // {2}
  reason: string;   // {3}
};

export type AndroidPlaystoreUserActionPendingPayload = BaseNotificationPayload & {
  type: NotificationType.ANDROID_PLAYSTORE_USER_ACTION_PENDING;
  version: string;   // {0}
  versionCode: string;   // {1}
  submittedBy: string;   // {2}
};

export type AndroidPlaystoreSuspendedPayload = BaseNotificationPayload & {
  type: NotificationType.ANDROID_PLAYSTORE_SUSPENDED;
  version: string;   // {0}
  versionCode: string;   // {1}
  submittedBy: string;   // {2}
};

// ============================================================================
// ERROR PAYLOADS
// ============================================================================

export type TaskFailedPayload = BaseNotificationPayload & {
  type: NotificationType.TASK_FAILED;
  taskName: string;    // {0}
  delivrUrl: string;   // {1}
};

// ============================================================================
// REMINDER PAYLOADS
// ============================================================================

export type ManualBuildUploadReminderPayload = BaseNotificationPayload & {
  type: NotificationType.MANUAL_BUILD_UPLOAD_REMINDER;
  buildType: string;   // {0} - e.g., "iOS Pre-Regression", "Android AAB"
  delivrUrl: string;   // {1}
};

// ============================================================================
// DISCRIMINATED UNION
// ============================================================================

/**
 * Discriminated union of all notification payload types.
 * 
 * Each notification type has its own specific payload structure with
 * typed fields that correspond to template parameters.
 * 
 * Example usage:
 * ```typescript
 * const payload: NotificationPayload = {
 *   type: NotificationType.PRE_KICKOFF_REMINDER,
 *   tenantId: 'tenant-123',
 *   releaseId: 'release-456',
 *   releaseType: 'planned',
 *   version: 'v6.5.0',
 *   forkDate: 'March 15, 2025',
 *   detailsUrl: 'https://delivr.example.com/releases/v6.5.0'
 * };
 * ```
 */
export type NotificationPayload =
  // Stage 1: Kickoff
  | PreKickoffReminderPayload
  | BranchForkoutPayload
  | ProjectManagementLinksPayload
  | TestManagementLinksPayload
  | PreregressionBuildsPayload
  | PreregressionBuildsFailedPayload
  // Stage 2: Regression
  | RegressionKickoffReminderPayload
  | RegressionBuildsPayload
  | RegressionBuildsFailedPayload
  | ReleaseNotesPayload
  | TestResultsSummaryPayload
  | NewSlotAddedPayload
  // Stage 3: Post-Regression
  | IosTestFlightBuildPayload
  | AndroidAabBuildPayload
  | WhatsNewPayload
  | RegressionStageApprovalRequestPayload
  | PreDistributionStageApprovalRequestPayload
  // Release Lifecycle
  | TargetDateChangedPayload
  | IosAppstoreBuildSubmittedPayload
  | AndroidPlaystoreBuildSubmittedPayload
  | IosAppstoreBuildResubmittedPayload
  | AndroidPlaystoreBuildResubmittedPayload
  | IosAppstoreLivePayload
  | AndroidPlaystoreLivePayload
  | AndroidWebLivePayload
  | IosAppstoreBuildRejectedPayload
  | IosAppstoreBuildCancelledPayload
  | AndroidPlaystoreUserActionPendingPayload
  | AndroidPlaystoreSuspendedPayload
  // Errors
  | TaskFailedPayload
  // Reminders
  | ManualBuildUploadReminderPayload;

/**
 * Result returned by NotificationService.notify()
 */
export type NotificationResult = {
  /** Whether at least one channel received the notification successfully */
  success: boolean;
  
  /** Database ID of the notification record */
  notificationId: number;
  
  /** Number of channels attempted */
  channelsAttempted: number;
  
  /** Number of channels that succeeded */
  channelsSucceeded: number;
  
  /** Error message if complete failure */
  error?: string;
};

/**
 * Maps Platform + Target combination to template platform key
 * Used for platform-specific notifications
 */
export const PLATFORM_TARGET_TO_TEMPLATE_KEY: Record<string, TemplatePlatformKey> = {
  [`${PlatformName.IOS}_${TargetName.APP_STORE}`]: 'ios_app_store',
  [`${PlatformName.ANDROID}_${TargetName.PLAY_STORE}`]: 'android_play_store',
  [`${PlatformName.ANDROID}_${TargetName.WEB}`]: 'android_web'
};

