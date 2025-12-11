/**
 * Distribution API Constants
 * Centralized constants for API routes, error messages, and HTTP status codes
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Validation Errors
  RELEASE_ID_REQUIRED: 'Release ID is required',
  BUILD_ID_REQUIRED: 'Build ID is required',
  SUBMISSION_ID_REQUIRED: 'Submission ID is required',
  TENANT_ID_REQUIRED: 'Tenant ID is required',
  PLATFORM_REQUIRED: 'Platform is required',
  FILE_REQUIRED: 'AAB file is required',
  TESTFLIGHT_BUILD_NUMBER_REQUIRED: 'TestFlight build number is required',
  VERSION_NAME_REQUIRED: 'Version name is required',
  PLATFORMS_REQUIRED: 'At least one platform must be specified',
  PERCENTAGE_REQUIRED: 'Percentage must be between 0 and 100',
  REASON_REQUIRED: 'Reason is required for emergency halt',
  
  // Generic Errors
  FAILED_TO_FETCH_BUILDS: 'Failed to fetch builds',
  FAILED_TO_FETCH_BUILD_DETAILS: 'Failed to fetch build details',
  FAILED_TO_UPLOAD_AAB: 'Failed to upload AAB',
  FAILED_TO_VERIFY_TESTFLIGHT: 'Failed to verify TestFlight build',
  FAILED_TO_FETCH_PM_STATUS: 'Failed to fetch PM status',
  FAILED_TO_APPROVE_RELEASE: 'Failed to approve release',
  FAILED_TO_CHECK_EXTRA_COMMITS: 'Failed to check extra commits',
  FAILED_TO_FETCH_RELEASE_STORES: 'Failed to fetch release stores',
  FAILED_TO_SUBMIT_TO_STORES: 'Failed to submit to stores',
  FAILED_TO_FETCH_DISTRIBUTION_STATUS: 'Failed to fetch distribution status',
  FAILED_TO_FETCH_SUBMISSIONS: 'Failed to fetch submissions',
  FAILED_TO_FETCH_SUBMISSION: 'Failed to fetch submission',
  FAILED_TO_POLL_SUBMISSION_STATUS: 'Failed to poll submission status',
  FAILED_TO_RETRY_SUBMISSION: 'Failed to retry submission',
  FAILED_TO_UPDATE_ROLLOUT: 'Failed to update rollout',
  FAILED_TO_PAUSE_ROLLOUT: 'Failed to pause rollout',
  FAILED_TO_RESUME_ROLLOUT: 'Failed to resume rollout',
  FAILED_TO_HALT_ROLLOUT: 'Failed to halt rollout',
  FAILED_TO_FETCH_SUBMISSION_HISTORY: 'Failed to fetch submission history',
  FAILED_TO_FETCH_DISTRIBUTION: 'Failed to fetch distribution details',
  ACTION_FAILED: 'Action failed. Please try again.',
  INVALID_ENDPOINT: 'Invalid endpoint',
} as const;

// Log Contexts
export const LOG_CONTEXT = {
  BUILDS_API: '[Builds API]',
  BUILD_DETAILS_API: '[Build Details API]',
  UPLOAD_AAB_API: '[Upload AAB API]',
  VERIFY_TESTFLIGHT_API: '[Verify TestFlight API]',
  PM_STATUS_API: '[PM Status API]',
  MANUAL_APPROVE_API: '[Manual Approve API]',
  EXTRA_COMMITS_API: '[Extra Commits API]',
  RELEASE_STORES_API: '[Release Stores API]',
  SUBMIT_TO_STORES_API: '[Submit to Stores API]',
  DISTRIBUTION_STATUS_API: '[Distribution Status API]',
  SUBMISSIONS_API: '[Submissions API]',
  SUBMISSION_DETAILS_API: '[Submission Details API]',
  POLL_SUBMISSION_STATUS_API: '[Poll Submission Status API]',
  RETRY_SUBMISSION_API: '[Retry Submission API]',
  UPDATE_ROLLOUT_API: '[Update Rollout API]',
  PAUSE_ROLLOUT_API: '[Pause Rollout API]',
  RESUME_ROLLOUT_API: '[Resume Rollout API]',
  HALT_ROLLOUT_API: '[Halt Rollout API]',
  SUBMISSION_HISTORY_API: '[Submission History API]',
  DISTRIBUTION_MANAGEMENT_LOADER: '[Distribution Management Loader]',
  DISTRIBUTION_MANAGEMENT_ACTION: '[Distribution Management Action]',
} as const;

// Validation Constants
export const VALIDATION = {
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
} as const;

