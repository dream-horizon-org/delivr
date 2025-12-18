/**
 * Submission Constants - Single Source of Truth
 * All submission-related enums and constants for iOS and Android
 */

// ============================================================================
// SUBMISSION ENUMS
// ============================================================================

/**
 * Submission status lifecycle (shared between iOS and Android)
 * Flow: PENDING -> SUBMITTED -> IN_REVIEW -> APPROVED (or CANCELLED/REJECTED) -> LIVE (or PAUSED/HALTED)
 */
export const SUBMISSION_STATUS = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
  LIVE: 'LIVE',
  PAUSED: 'PAUSED',
  HALTED: 'HALTED'
} as const;

export const SUBMISSION_STATUSES = Object.values(SUBMISSION_STATUS);
export type SubmissionStatus = typeof SUBMISSION_STATUS[keyof typeof SUBMISSION_STATUS];

/**
 * Build type (manual vs CI/CD) - shared between iOS and Android
 */
export const BUILD_TYPE = {
  MANUAL: 'MANUAL',
  CI_CD: 'CI_CD'
} as const;

export const BUILD_TYPES = Object.values(BUILD_TYPE);
export type BuildType = typeof BUILD_TYPE[keyof typeof BUILD_TYPE];

/**
 * iOS release type (always AFTER_APPROVAL - automatically release after App Review approval)
 */
export const IOS_RELEASE_TYPE = 'AFTER_APPROVAL' as const;
export type IosReleaseType = typeof IOS_RELEASE_TYPE;

/**
 * Platform types for submission actions
 */
export const SUBMISSION_PLATFORM = {
  ANDROID: 'ANDROID',
  IOS: 'IOS'
} as const;

export const SUBMISSION_PLATFORMS = Object.values(SUBMISSION_PLATFORM);
export type SubmissionPlatform = typeof SUBMISSION_PLATFORM[keyof typeof SUBMISSION_PLATFORM];

/**
 * Action types for submissions (pause, halt, cancel, resume)
 */
export const SUBMISSION_ACTION = {
  PAUSED: 'PAUSED',
  HALTED: 'HALTED',
  CANCELLED: 'CANCELLED',
  RESUMED: 'RESUMED',
  REJECTED: 'REJECTED'
} as const;

export const SUBMISSION_ACTIONS = Object.values(SUBMISSION_ACTION);
export type SubmissionAction = typeof SUBMISSION_ACTION[keyof typeof SUBMISSION_ACTION];

// ============================================================================
// ERROR & SUCCESS MESSAGES
// ============================================================================

export const SUBMISSION_ERROR_MESSAGES = {
  DISTRIBUTION_ID_REQUIRED: 'Submission failed: distributionId is required',
  VERSION_REQUIRED: 'Submission failed: version is required',
  BUILD_TYPE_REQUIRED: 'Submission failed: buildType is required',
  INVALID_BUILD_TYPE: `Submission failed: buildType must be one of: ${BUILD_TYPES.join(', ')}`,
  INVALID_STATUS: `Submission failed: status must be one of: ${SUBMISSION_STATUSES.join(', ')}`,
  SUBMISSION_NOT_FOUND: 'Submission not found',
  CREATE_FAILED: 'Failed to create submission',
  UPDATE_FAILED: 'Failed to update submission',
  DELETE_FAILED: 'Failed to delete submission'
} as const;

export const SUBMISSION_SUCCESS_MESSAGES = {
  CREATED: 'Submission created successfully',
  UPDATED: 'Submission updated successfully',
  DELETED: 'Submission deleted successfully',
  STATUS_UPDATED: 'Submission status updated successfully',
  SUBMITTED: 'Build submitted to store successfully'
} as const;

// ============================================================================
// IOS-SPECIFIC MESSAGES
// ============================================================================

export const IOS_SUBMISSION_ERROR_MESSAGES = {
  TESTFLIGHT_NUMBER_REQUIRED: 'iOS submission failed: testflightNumber is required'
} as const;

export const IOS_SUBMISSION_SUCCESS_MESSAGES = {
  SUBMITTED_TO_APP_STORE: 'iOS build submitted to App Store successfully'
} as const;

// ============================================================================
// ANDROID-SPECIFIC MESSAGES
// ============================================================================

export const ANDROID_SUBMISSION_ERROR_MESSAGES = {
  ARTIFACT_PATH_REQUIRED: 'Android submission failed: artifactPath is required',
  VERSION_CODE_REQUIRED: 'Android submission failed: versionCode is required'
} as const;

export const ANDROID_SUBMISSION_SUCCESS_MESSAGES = {
  SUBMITTED_TO_PLAY_STORE: 'Android build submitted to Play Store successfully'
} as const;

// ============================================================================
// SUBMISSION ACTION HISTORY MESSAGES
// ============================================================================

export const SUBMISSION_ACTION_HISTORY_ERROR_MESSAGES = {
  SUBMISSION_ID_REQUIRED: 'Submission action failed: submissionId is required',
  PLATFORM_REQUIRED: 'Submission action failed: platform is required',
  ACTION_REQUIRED: 'Submission action failed: action is required',
  REASON_REQUIRED: 'Submission action failed: reason is required',
  CREATED_BY_REQUIRED: 'Submission action failed: createdBy is required',
  INVALID_PLATFORM: `Submission action failed: platform must be one of: ${SUBMISSION_PLATFORMS.join(', ')}`,
  INVALID_ACTION: `Submission action failed: action must be one of: ${SUBMISSION_ACTIONS.join(', ')}`,
  HISTORY_NOT_FOUND: 'Submission action history not found',
  CREATE_FAILED: 'Failed to create submission action history'
} as const;

export const SUBMISSION_ACTION_HISTORY_SUCCESS_MESSAGES = {
  CREATED: 'Submission action recorded successfully',
  SUBMISSION_PAUSED: 'Submission paused successfully',
  SUBMISSION_HALTED: 'Submission halted successfully',
  SUBMISSION_CANCELLED: 'Submission cancelled successfully',
  SUBMISSION_RESUMED: 'Submission resumed successfully'
} as const;

// ============================================================================
// ARTIFACT DOWNLOAD MESSAGES
// ============================================================================

export const SUBMISSION_ARTIFACT_DOWNLOAD_ERROR_MESSAGES = {
  INVALID_SUBMISSION_ID: 'Submission ID is required',
  INVALID_TENANT_ID: 'Tenant ID is required',
  PLATFORM_REQUIRED: 'Query parameter "platform" is required',
  PLATFORM_INVALID: 'Platform must be ANDROID or IOS',
  SUBMISSION_NOT_FOUND_OR_ACCESS_DENIED: 'Submission not found or does not belong to this tenant',
  ARTIFACT_NOT_AVAILABLE: 'Artifact not available for this submission',
  PRESIGNED_URL_FAILED: 'Failed to generate download URL'
} as const;

