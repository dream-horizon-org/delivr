/**
 * Release Notification Service Constants
 */

import { Task } from '~services/integrations/comm/messaging/messaging.interface';
import { NotificationType } from '~types/release-notification';

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const RELEASE_NOTIFICATION_ERROR_MESSAGES = {
  RELEASE_NOT_FOUND: 'Release not found',
  RELEASE_CONFIG_NOT_LINKED: 'Release does not have a linked release configuration',
  RELEASE_CONFIG_NOT_FOUND: 'Release configuration not found',
  COMMS_CONFIG_NOT_CONFIGURED: 'Communication configuration not set up for this release',
  UNSUPPORTED_NOTIFICATION_TYPE: 'Unsupported notification type'
} as const;

// ============================================================================
// NOTIFICATION TYPE TO TASK MAPPING
// ============================================================================

/**
 * Maps NotificationType enum to Task enum for messaging service
 * Both enums have matching values, this mapping ensures type safety
 */
export const NOTIFICATION_TYPE_TO_TASK: Record<NotificationType, Task> = {
  [NotificationType.PRE_KICKOFF_REMINDER]: Task.PRE_KICKOFF_REMINDER,
  [NotificationType.BRANCH_FORKOUT]: Task.BRANCH_FORKOUT,
  [NotificationType.PROJECT_MANAGEMENT_LINKS]: Task.PROJECT_MANAGEMENT_LINKS,
  [NotificationType.TEST_MANAGEMENT_LINKS]: Task.TEST_MANAGEMENT_LINKS,
  [NotificationType.PREREGRESSION_BUILDS]: Task.PREREGRESSION_BUILDS,
  [NotificationType.PREREGRESSION_BUILDS_FAILED]: Task.PREREGRESSION_BUILDS_FAILED,
  [NotificationType.REGRESSION_KICKOFF_REMINDER]: Task.REGRESSION_KICKOFF_REMINDER,
  [NotificationType.REGRESSION_BUILDS]: Task.REGRESSION_BUILDS,
  [NotificationType.REGRESSION_BUILDS_FAILED]: Task.REGRESSION_BUILDS_FAILED,
  [NotificationType.RELEASE_NOTES]: Task.RELEASE_NOTES,
  [NotificationType.FINAL_RELEASE_NOTES]: Task.FINAL_RELEASE_NOTES,
  [NotificationType.TEST_RESULTS_SUMMARY]: Task.TEST_RESULTS_SUMMARY,
  [NotificationType.NEW_SLOT_ADDED]: Task.NEW_SLOT_ADDED,
  [NotificationType.IOS_TEST_FLIGHT_BUILD]: Task.IOS_TEST_FLIGHT_BUILD,
  [NotificationType.ANDROID_AAB_BUILD]: Task.ANDROID_AAB_BUILD,
  [NotificationType.WHATS_NEW]: Task.WHATS_NEW,
  [NotificationType.REGRESSION_STAGE_APPROVAL_REQUEST]: Task.REGRESSION_STAGE_APPROVAL_REQUEST,
  [NotificationType.PRE_RELEASE_STAGE_APPROVAL_REQUEST]: Task.PRE_RELEASE_STAGE_APPROVAL_REQUEST,
  [NotificationType.PROJECT_MANAGEMENT_APPROVAL]: Task.PROJECT_MANAGEMENT_APPROVAL,
  [NotificationType.TARGET_DATE_CHANGED]: Task.TARGET_DATE_CHANGED,
  [NotificationType.BUILD_SUBMITTED]: Task.BUILD_SUBMITTED,
  [NotificationType.BUILD_RESUBMITTED]: Task.BUILD_RESUBMITTED,
  [NotificationType.BUILD_LIVE]: Task.BUILD_LIVE,
  [NotificationType.BUILD_REJECTED]: Task.BUILD_REJECTED,
  [NotificationType.BUILD_CANCELLED]: Task.BUILD_CANCELLED,
  [NotificationType.BUILD_USER_ACTION_PENDING]: Task.BUILD_USER_ACTION_PENDING,
  [NotificationType.BUILD_SUSPENDED]: Task.BUILD_SUSPENDED,
  [NotificationType.TASK_FAILED]: Task.TASK_FAILED,
  [NotificationType.MANUAL_BUILD_UPLOAD_REMINDER]: Task.MANUAL_BUILD_UPLOAD_REMINDER,
};

