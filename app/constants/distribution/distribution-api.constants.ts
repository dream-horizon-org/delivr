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
  DISTRIBUTION_ID_REQUIRED: 'Distribution ID is required',
  BUILD_ID_REQUIRED: 'Build ID is required',
  SUBMISSION_ID_REQUIRED: 'Submission ID is required',
  TENANT_ID_REQUIRED: 'Tenant ID is required',
  PLATFORM_REQUIRED: 'Platform is required',
  FILE_REQUIRED: 'AAB file is required',
  TESTFLIGHT_BUILD_NUMBER_REQUIRED: 'TestFlight build number is required',
  VERSION_NAME_REQUIRED: 'Version name is required',
  PLATFORMS_REQUIRED: 'At least one platform must be specified',
  PERCENTAGE_REQUIRED: 'Percentage must be between 0 and 100',
  PERCENTAGE_OUT_OF_RANGE: 'Percentage must be between 0 and 100',
  REASON_REQUIRED: 'Reason is required for pausing rollout',
  
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
  FAILED_TO_UPDATE_ROLLOUT: 'Failed to update rollout',
  FAILED_TO_PAUSE_ROLLOUT: 'Failed to pause rollout',
  FAILED_TO_RESUME_ROLLOUT: 'Failed to resume rollout',
  FAILED_TO_FETCH_DISTRIBUTION: 'Failed to fetch distribution details',
  FAILED_TO_FETCH_DISTRIBUTIONS: 'Failed to fetch distributions list',
  FAILED_TO_CANCEL_SUBMISSION: 'Failed to cancel submission',
  FAILED_TO_EDIT_SUBMISSION: 'Failed to edit submission',
  FAILED_TO_SUBMIT_SUBMISSION: 'Failed to submit submission',
  FAILED_TO_CREATE_RESUBMISSION: 'Failed to create resubmission',
  CANNOT_EDIT_FIELD_IN_STAGE: 'Cannot edit this field in current submission stage',
  CANNOT_CANCEL_LIVE_SUBMISSION: 'Cannot cancel a live submission',
  SUBMISSION_NOT_PENDING: 'Submission must be in PENDING state to submit',
  BUILD_ID_REQUIRED_FOR_SUBMISSION: 'Build ID is required for submission',
  INVALID_PLATFORM: 'Invalid platform specified',
  INVALID_VERSION: 'Invalid version format',
  TESTFLIGHT_BUILD_REQUIRED: 'TestFlight build number is required for iOS submissions',
  AAB_FILE_REQUIRED: 'AAB file is required for Android submissions',
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
  DISTRIBUTIONS_LIST_API: '[Distributions List API]',
  SUBMISSIONS_API: '[Submissions API]',
  SUBMISSION_DETAILS_API: '[Submission Details API]',
  POLL_SUBMISSION_STATUS_API: '[Poll Submission Status API]',
  UPDATE_ROLLOUT_API: '[Update Rollout API]',
  PAUSE_ROLLOUT_API: '[Pause Rollout API]',
  RESUME_ROLLOUT_API: '[Resume Rollout API]',
  CANCEL_SUBMISSION_API: '[Cancel Submission API]',
  EDIT_SUBMISSION_API: '[Edit Submission API]',
  SUBMIT_SUBMISSION_API: '[Submit Submission API]',
  CREATE_RESUBMISSION_API: '[Create Resubmission API]',
  DISTRIBUTION_MANAGEMENT_LOADER: '[Distribution Management Loader]',
  DISTRIBUTION_MANAGEMENT_ACTION: '[Distribution Management Action]',
} as const;

// Validation Constants
export const VALIDATION = {
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
} as const;

/**
 * API Route Builders - Single Source of Truth for ALL Distribution API Routes
 * 
 * Benefits:
 * - Centralized route management
 * - Type-safe route construction
 * - Easy to update if backend routes change
 * - Self-documenting with JSDoc
 * - Consistent usage across all components
 * 
 * IMPORTANT: All routes now require tenantId as first parameter for tenant-scoped access
 * 
 * Usage:
 * ```typescript
 * import { API_ROUTES } from '~/constants/distribution/distribution-api.constants';
 * 
 * // In component
 * const apiUrl = API_ROUTES.getArtifactDownloadUrl(tenantId, submissionId, platform);
 * const response = await fetch(apiUrl);
 * 
 * // With useFetcher
 * fetcher.submit(payload, {
 *   method: 'post',
 *   action: API_ROUTES.createSubmission(tenantId, distributionId),
 *   encType: 'application/json',
 * });
 * ```
 */
export const API_ROUTES = {
  // ============================================================================
  // SUBMISSION LIFECYCLE
  // ============================================================================
  
  /**
   * Create new submission (Android/iOS)
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param distributionId - Distribution ID
   * @returns POST /api/v1/tenants/:tenantId/releases/:releaseId/distributions/:distributionId/submissions
   */
  createSubmission: (tenantId: string, releaseId: string, distributionId: string) =>
    `/api/v1/tenants/${tenantId}/releases/${releaseId}/distributions/${distributionId}/submissions`,
  
  /**
   * Submit to app store (promote PENDING → SUBMITTED/IN_REVIEW)
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param submissionId - Submission ID
   * @param platform - Platform (ANDROID or IOS)
   * @returns PUT /api/v1/tenants/:tenantId/releases/:releaseId/submissions/:submissionId/submit?platform={platform}
   */
  submitToStore: (tenantId: string, releaseId: string, submissionId: string, platform: string) =>
    `/api/v1/tenants/${tenantId}/releases/${releaseId}/submissions/${submissionId}/submit?platform=${platform}`,
  
  /**
   * Cancel submission (iOS only - Android cannot cancel)
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param submissionId - Submission ID
   * @param platform - Platform (should be IOS)
   * @returns PATCH /api/v1/tenants/:tenantId/releases/:releaseId/submissions/:submissionId/cancel?platform={platform}
   */
  cancelSubmission: (tenantId: string, releaseId: string, submissionId: string, platform: string) =>
    `/api/v1/tenants/${tenantId}/releases/${releaseId}/submissions/${submissionId}/cancel?platform=${platform}`,
  
  // ============================================================================
  // ROLLOUT MANAGEMENT
  // ============================================================================
  
  /**
   * Update rollout percentage
   * - Android: 0.01-100 (supports decimals)
   * - iOS: Only 100 (complete early for phased release)
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param submissionId - Submission ID
   * @param platform - Platform (ANDROID or IOS)
   * @returns PATCH /api/v1/tenants/:tenantId/releases/:releaseId/submissions/:submissionId/rollout?platform={platform}
   */
  updateRollout: (tenantId: string, releaseId: string, submissionId: string, platform: string) =>
    `/api/v1/tenants/${tenantId}/releases/${releaseId}/submissions/${submissionId}/rollout?platform=${platform}`,
  
  /**
   * Pause rollout (iOS phased release only)
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param submissionId - Submission ID
   * @param platform - Platform (IOS)
   * @returns PATCH /api/v1/tenants/:tenantId/releases/:releaseId/submissions/:submissionId/rollout/pause?platform={platform}
   */
  pauseRollout: (tenantId: string, releaseId: string, submissionId: string, platform: string) =>
    `/api/v1/tenants/${tenantId}/releases/${releaseId}/submissions/${submissionId}/rollout/pause?platform=${platform}`,
  
  /**
   * Resume rollout (Both platforms - from PAUSED/HALTED)
   * - iOS: Resume from PAUSED (phased release)
   * - Android: Resume from HALTED
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param submissionId - Submission ID
   * @param platform - Platform (ANDROID or IOS)
   * @returns PATCH /api/v1/tenants/:tenantId/releases/:releaseId/submissions/:submissionId/rollout/resume?platform={platform}
   */
  resumeRollout: (tenantId: string, releaseId: string, submissionId: string, platform: string) =>
    `/api/v1/tenants/${tenantId}/releases/${releaseId}/submissions/${submissionId}/rollout/resume?platform=${platform}`,
  
  /**
   * Halt rollout (Emergency stop - Both platforms)
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param submissionId - Submission ID
   * @param platform - Platform (ANDROID or IOS)
   * @returns PATCH /api/v1/tenants/:tenantId/releases/:releaseId/submissions/:submissionId/rollout/halt?platform={platform}
   */
  haltRollout: (tenantId: string, releaseId: string, submissionId: string, platform: string) =>
    `/api/v1/tenants/${tenantId}/releases/${releaseId}/submissions/${submissionId}/rollout/halt?platform=${platform}`,
  
  // ============================================================================
  // ARTIFACTS & DOWNLOADS
  // ============================================================================
  
  /**
   * Get artifact download URL (presigned S3 URL)
   * Returns a presigned URL that expires after set time
   * @param tenantId - Tenant ID for authorization
   * @param submissionId - Submission ID
   * @param platform - Platform (ANDROID or IOS)
   * @returns GET /api/v1/tenants/:tenantId/submissions/:submissionId/artifact?platform={platform}
   */
  getArtifactDownloadUrl: (tenantId: string, submissionId: string, platform: string) =>
    `/api/v1/tenants/${tenantId}/submissions/${submissionId}/artifact?platform=${platform}`,
} as const;

