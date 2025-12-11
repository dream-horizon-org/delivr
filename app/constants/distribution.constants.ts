/**
 * Distribution Module - Constants
 * 
 * All constants used across Distribution components
 * Reference: docs/02-product-specs/distribution-spec.md
 */

import type {
  BuildUploadStatus,
  Platform,
  ReleaseStatus,
  SubmissionStatus,
} from '~/types/distribution.types';

// ============================================================================
// STATUS LABELS
// ============================================================================

/**
 * Release Status Labels
 */
export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  PRE_RELEASE: 'Pre-Release',
  READY_FOR_SUBMISSION: 'Ready to Submit',
  COMPLETED: 'Completed',
} as const;

/**
 * Submission Status Labels
 */
export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  LIVE: 'Live',
  REJECTED: 'Rejected',
  HALTED: 'Halted',
} as const;

/**
 * Build Upload Status Labels
 */
export const BUILD_UPLOAD_STATUS_LABELS: Record<BuildUploadStatus, string> = {
  PENDING: 'Pending',
  UPLOADING: 'Uploading',
  UPLOADED: 'Uploaded',
  FAILED: 'Failed',
} as const;

/**
 * Platform Labels
 */
export const PLATFORM_LABELS: Record<Platform, string> = {
  ANDROID: 'Android',
  IOS: 'iOS',
} as const;

// ============================================================================
// STATUS COLORS
// ============================================================================

/**
 * Release Status Colors (for badges)
 */
export const RELEASE_STATUS_COLORS: Record<ReleaseStatus, string> = {
  PRE_RELEASE: 'blue',
  READY_FOR_SUBMISSION: 'cyan',
  COMPLETED: 'green',
} as const;

/**
 * Submission Status Colors (for badges)
 */
export const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  IN_REVIEW: 'yellow',
  APPROVED: 'green',
  LIVE: 'green',
  REJECTED: 'red',
  HALTED: 'red',
} as const;

/**
 * Build Upload Status Colors (for badges)
 */
export const BUILD_UPLOAD_STATUS_COLORS: Record<BuildUploadStatus, string> = {
  PENDING: 'gray',
  UPLOADING: 'blue',
  UPLOADED: 'green',
  FAILED: 'red',
} as const;

// ============================================================================
// ROLLOUT PRESETS
// ============================================================================

/**
 * Suggested rollout percentages
 * Based on staged rollout best practices: 1% → 5% → 10% → 25% → 50% → 100%
 */
export const ROLLOUT_PRESETS = [1, 5, 10, 25, 50, 100] as const;

/**
 * Minimum rollout percentage
 */
export const MIN_ROLLOUT_PERCENTAGE = 1;

/**
 * Maximum rollout percentage
 */
export const MAX_ROLLOUT_PERCENTAGE = 100;

// ============================================================================
// FILE SIZE LIMITS
// ============================================================================

/**
 * Maximum AAB file size (200 MB)
 */
export const MAX_AAB_FILE_SIZE = 200 * 1024 * 1024; // 200 MB in bytes

/**
 * Maximum AAB file size label (for display)
 */
export const MAX_AAB_FILE_SIZE_LABEL = '200 MB';

// ============================================================================
// TRACK OPTIONS
// ============================================================================

/**
 * Android Play Store Tracks
 */
export const ANDROID_TRACKS = [
  { value: 'INTERNAL', label: 'Internal Testing' },
  { value: 'ALPHA', label: 'Alpha (Closed Testing)' },
  { value: 'BETA', label: 'Beta (Open Testing)' },
  { value: 'PRODUCTION', label: 'Production' },
] as const;

/**
 * iOS Release Types
 */
export const IOS_RELEASE_TYPES = [
  { value: 'MANUAL_RELEASE', label: 'Manual Release' },
  { value: 'AFTER_APPROVAL', label: 'Automatic After Approval' },
  { value: 'SCHEDULED', label: 'Scheduled Release' },
] as const;

// ============================================================================
// SEVERITY LEVELS
// ============================================================================

/**
 * Halt Severity Levels
 */
export const HALT_SEVERITY_LEVELS = [
  { value: 'CRITICAL', label: 'Critical', color: 'red' },
  { value: 'HIGH', label: 'High', color: 'orange' },
  { value: 'MEDIUM', label: 'Medium', color: 'yellow' },
] as const;

// ============================================================================
// POLLING INTERVALS
// ============================================================================

/**
 * Status polling interval (10 seconds)
 */
export const STATUS_POLLING_INTERVAL = 10000;

/**
 * Maximum polling duration (5 minutes)
 */
export const MAX_POLLING_DURATION = 5 * 60 * 1000;

// ============================================================================
// TOAST MESSAGES
// ============================================================================

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  AAB_UPLOADED: 'Android AAB uploaded successfully',
  TESTFLIGHT_VERIFIED: 'iOS TestFlight build verified successfully',
  RELEASE_APPROVED: 'Release approved successfully',
  SUBMITTED_TO_STORES: 'Submitted to stores successfully',
  ROLLOUT_UPDATED: 'Rollout percentage updated',
  ROLLOUT_PAUSED: 'Rollout paused successfully',
  ROLLOUT_RESUMED: 'Rollout resumed successfully',
  ROLLOUT_HALTED: 'Rollout halted - requires hotfix',
  SUBMISSION_RETRIED: 'Submission retried successfully',
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  INVALID_FILE: 'Invalid file. Please select a valid AAB file.',
  FILE_TOO_LARGE: `File too large. Maximum size is ${MAX_AAB_FILE_SIZE_LABEL}.`,
  VERSION_MISMATCH: 'Version mismatch. Please check your build version.',
  BUILDS_NOT_READY: 'Builds not ready. Please complete all builds first.',
  PM_APPROVAL_REQUIRED: 'PM approval required before submission.',
  TESTFLIGHT_PROCESSING: 'TestFlight build is still processing. Please wait.',
} as const;

/**
 * Warning Messages
 */
export const WARNING_MESSAGES = {
  EXTRA_COMMITS: 'Extra commits detected after last regression. Proceed with caution.',
  NO_SLACK_CONFIGURED: 'No Slack integration configured. Please share testing links manually.',
  PARTIAL_SUBMISSION: 'Only some platforms were submitted successfully.',
  ACTIVE_ROLLOUT: 'Previous release has an active rollout. This may affect distribution.',
} as const;

// ============================================================================
// DIALOG TITLES
// ============================================================================

/**
 * Dialog Titles
 */
export const DIALOG_TITLES = {
  UPLOAD_AAB: 'Upload Android AAB',
  VERIFY_TESTFLIGHT: 'Verify TestFlight Build',
  SUBMIT_TO_STORES: 'Submit to Stores',
  RETRY_SUBMISSION: 'Retry Submission',
  VERSION_CONFLICT: 'Version Conflict',
  EXPOSURE_CONTROL_CONFLICT: 'Active Rollout Detected',
  PM_APPROVAL: 'Approve Release',
  PAUSE_ROLLOUT: 'Pause Rollout',
  RESUME_ROLLOUT: 'Resume Rollout',
  HALT_ROLLOUT: 'Emergency Halt',
  EXTRA_COMMITS_WARNING: 'Untested Commits Detected',
} as const;

// ============================================================================
// BUTTON LABELS
// ============================================================================

/**
 * Button Labels
 */
export const BUTTON_LABELS = {
  UPLOAD: 'Upload',
  VERIFY: 'Verify',
  SUBMIT: 'Submit',
  RETRY: 'Retry',
  APPROVE: 'Approve',
  PAUSE: 'Pause',
  RESUME: 'Resume',
  HALT: 'Halt',
  CANCEL: 'Cancel',
  CLOSE: 'Close',
  PROCEED: 'Proceed',
  PROMOTE_TO_DISTRIBUTION: 'Promote to Distribution',
  SUBMIT_TO_PLAY_STORE: 'Submit to Play Store',
  SUBMIT_TO_APP_STORE: 'Submit to App Store',
  SUBMIT_TO_BOTH_STORES: 'Submit to Both Stores',
  UPDATE_ROLLOUT: 'Update Rollout',
} as const;

// ============================================================================
// EMPTY STATE MESSAGES
// ============================================================================

/**
 * Empty State Messages
 */
export const EMPTY_STATE_MESSAGES = {
  NO_BUILDS: 'No builds found for this release',
  NO_SUBMISSIONS: 'No submissions yet',
  NO_HISTORY: 'No history events',
  BUILDS_PENDING: 'Waiting for builds to be uploaded',
} as const;

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Form Validation Rules
 */
export const VALIDATION_RULES = {
  ROLLOUT_PERCENTAGE: {
    MIN: MIN_ROLLOUT_PERCENTAGE,
    MAX: MAX_ROLLOUT_PERCENTAGE,
    STEP: 1,
  },
  TESTFLIGHT_BUILD_NUMBER: {
    PATTERN: /^\d+$/,
    MIN_LENGTH: 1,
    MAX_LENGTH: 10,
  },
  VERSION_NAME: {
    PATTERN: /^\d+\.\d+\.\d+$/,
    EXAMPLE: '2.5.0',
  },
} as const;

