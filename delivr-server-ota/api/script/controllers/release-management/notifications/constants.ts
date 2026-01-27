/**
 * Ad-Hoc Notification Constants
 */

export const ADHOC_NOTIFICATION_LIMITS = {
  MAX_CUSTOM_MESSAGE_LENGTH: 1000,
  MIN_CUSTOM_MESSAGE_LENGTH: 1,
  MAX_CHANNELS: 20
} as const;

/**
 * Supported template message types
 */
export const ADHOC_NOTIFICATION_MESSAGE_TYPES = {
  TEST_RESULTS_SUMMARY: 'test-results-summary',
  PROJECT_MANAGEMENT_APPROVAL: 'project-management-approval',
  MANUAL_BUILD_UPLOAD_REMINDER: 'manual-build-upload-reminder'
} as const;

export const SUPPORTED_MESSAGE_TYPES = Object.values(ADHOC_NOTIFICATION_MESSAGE_TYPES);

export const ADHOC_NOTIFICATION_ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  CHANNEL_NOT_FOUND: 'CHANNEL_NOT_FOUND',
  RELEASE_NOT_FOUND: 'RELEASE_NOT_FOUND',
  SLACK_API_ERROR: 'SLACK_API_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  TEST_SUITE_NOT_CREATED: 'TEST_SUITE_NOT_CREATED',
  NO_MANUAL_BUILD_PENDING: 'NO_MANUAL_BUILD_PENDING',
  BUILD_TASK_NOT_READY: 'BUILD_TASK_NOT_READY'
} as const;

export const ADHOC_NOTIFICATION_ERROR_MESSAGES = {
  TYPE_REQUIRED: 'type is required and must be either "template" or "custom"',
  INVALID_TYPE: 'type must be either "template" or "custom"',
  MESSAGE_TYPE_REQUIRED: 'messageType is required when type is "template"',
  MESSAGE_TYPE_UNSUPPORTED: `messageType must be one of: ${SUPPORTED_MESSAGE_TYPES.join(', ')}`,
  CUSTOM_MESSAGE_REQUIRED: 'customMessage is required when type is "custom"',
  CUSTOM_MESSAGE_EMPTY: 'customMessage cannot be empty after trimming',
  CUSTOM_MESSAGE_TOO_LONG: `customMessage exceeds maximum length of ${ADHOC_NOTIFICATION_LIMITS.MAX_CUSTOM_MESSAGE_LENGTH} characters`,
  CHANNELS_REQUIRED: 'channels array is required',
  CHANNELS_EMPTY: 'channels array must contain at least one channel ID',
  CHANNELS_TOO_MANY: `channels array exceeds maximum of ${ADHOC_NOTIFICATION_LIMITS.MAX_CHANNELS} channels`,
  CHANNELS_INVALID_TYPE: 'channels must be an array of strings',
  RELEASE_NOT_FOUND: 'Release not found or does not belong to the specified tenant',
  COMMS_CONFIG_NOT_FOUND: 'Slack integration not configured for this release',
  CHANNELS_NOT_IN_CONFIG: 'One or more channels not found in release configuration',
  SLACK_SEND_FAILED: 'Failed to send message to Slack',
  TEST_SUITE_NOT_CREATED: 'Test run/suite is not created yet. CREATE_TEST_SUITE task must complete first.',
  NO_MANUAL_BUILD_PENDING: 'No manual build uploads are currently pending. All builds have been uploaded or the release is not in a state requiring manual build uploads.'
} as const;

export const ADHOC_NOTIFICATION_SUCCESS_MESSAGES = {
  SENT: 'Notification sent successfully'
} as const;

export const ADHOC_NOTIFICATION_ACTIVITY_LOG_TYPE = 'AD_HOC_NOTIFICATION' as const;
