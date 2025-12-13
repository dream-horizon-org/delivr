/**
 * Distribution Module - Constants
 * 
 * All constants used across Distribution components
 * Reference: docs/02-product-specs/distribution-spec.md
 */

import type {
  BuildUploadStatus,
  Platform,
  SubmissionHistoryEventType,
  SubmissionStatus,
  WarningSeverity,
} from '~/types/distribution.types';
import { DistributionStatus } from '~/types/distribution.types';

// ============================================================================
// ROLLOUT PERCENTAGES
// ============================================================================

/** Minimum rollout percentage (0%) */
export const MIN_ROLLOUT_PERCENT = 0;

/** Maximum rollout percentage (100%) */
export const MAX_ROLLOUT_PERCENT = 100;

/** Complete rollout percentage (100%) - Used to check if rollout is complete */
export const ROLLOUT_COMPLETE_PERCENT = 100;

// ============================================================================
// STATUS LABELS
// ============================================================================

/**
 * Distribution Status Labels
 * 
 * Maps distribution status enum values to human-readable labels
 */
export const DISTRIBUTION_STATUS_LABELS: Record<DistributionStatus, string> = {
  PENDING: 'Pending',
  PARTIALLY_RELEASED: 'Partially Released',
  COMPLETED: 'Completed',
} as const;

// Legacy name for backward compatibility
export const RELEASE_STATUS_LABELS = DISTRIBUTION_STATUS_LABELS;

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
 * Distribution Status Colors (for badges)
 * 
 * PENDING: Gray - Not yet submitted to any store
 * PARTIALLY_RELEASED: Blue - Some platforms released, others pending
 * COMPLETED: Green - All platforms fully released (100%)
 */
export const DISTRIBUTION_STATUS_COLORS: Record<DistributionStatus, string> = {
  PENDING: 'gray',
  PARTIALLY_RELEASED: 'blue',
  COMPLETED: 'green',
} as const;

// Legacy name for backward compatibility
export const RELEASE_STATUS_COLORS = DISTRIBUTION_STATUS_COLORS;

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
 * Submission Status Colors (for progress bars)
 * Note: Different from badge colors - progress bars use blue for active/in-progress state
 */
export const SUBMISSION_PROGRESS_COLORS: Record<SubmissionStatus, string> = {
  IN_REVIEW: 'blue',
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

/**
 * Android Update Priority Levels
 * Per API Spec: priority 0-5 (https://developer.android.com/google/play/developer-api)
 */
export const ANDROID_PRIORITIES = [
  { value: '0', label: '0 - Default' },
  { value: '1', label: '1 - Low' },
  { value: '2', label: '2 - Medium-Low' },
  { value: '3', label: '3 - Medium' },
  { value: '4', label: '4 - Medium-High' },
  { value: '5', label: '5 - High' },
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

/**
 * Warning Severity Colors
 */
export const WARNING_SEVERITY_COLORS: Record<WarningSeverity, string> = {
  ERROR: 'red',
  WARNING: 'orange',
  INFO: 'yellow',
} as const;

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
// UI TEXT - Form Labels and Headings
// ============================================================================

/**
 * Distribution UI Labels
 * All form labels, headings, and section titles used in distribution components
 */
export const DISTRIBUTION_UI_LABELS = {
  // Platform Options Headings
  ANDROID_OPTIONS: 'Android Options',
  IOS_OPTIONS: 'iOS Options',
  SELECT_PLATFORMS: 'Select Platforms',
  
  // Android Form Labels
  ANDROID_RELEASE_TRACK: 'Release Track',
  ANDROID_RELEASE_TRACK_DESC: 'Which track to release to',
  ANDROID_UPDATE_PRIORITY: 'Update Priority',
  ANDROID_UPDATE_PRIORITY_DESC: 'How urgently users should update (0-5)',
  ANDROID_ROLLOUT_PERCENTAGE: 'Initial Rollout Percentage',
  ANDROID_ROLLOUT_PERCENTAGE_DESC: 'Start with a lower percentage for staged rollouts',
  
  // iOS Form Labels
  IOS_RELEASE_TYPE: 'Release Type',
  IOS_RELEASE_TYPE_DESC: 'When should the app be released',
  IOS_PHASED_RELEASE: 'Enable Phased Release',
  IOS_PHASED_RELEASE_DESC: 'Gradually release to users over 7 days',
  
  // Common Form Labels
  RELEASE_NOTES: 'Release Notes',
  RELEASE_NOTES_DESC: "What's new in this version",
  RELEASE_NOTES_PLACEHOLDER: 'Bug fixes and performance improvements...',
  
  // TestFlight Form Labels
  TESTFLIGHT_BUILD_NUMBER: 'TestFlight Build Number',
  TESTFLIGHT_BUILD_NUMBER_DESC: 'The build number shown in App Store Connect / TestFlight',
  TESTFLIGHT_BUILD_NUMBER_PLACEHOLDER: 'e.g., 17965',
  VERSION_NAME: 'Version Name',
  VERSION_NAME_DESC: 'The version string (must match release version)',
  
  // AAB Upload Form Labels
  AAB_FILE_LABEL: 'Android App Bundle (.aab)',
  AAB_FILE_DESC: 'Upload your signed Android App Bundle',
  AAB_DRAG_DROP: 'Drag and drop your .aab file here, or click to browse',
  AAB_METADATA_LABEL: 'Version Metadata (optional)',
  AAB_METADATA_DESC: 'Additional version information',
  
  // Dialog Titles
  PAUSE_ROLLOUT_TITLE: 'Pause Rollout',
  RESUME_ROLLOUT_TITLE: 'Resume Rollout',
  HALT_ROLLOUT_TITLE: 'Emergency Halt Rollout',
  MANUAL_APPROVAL_TITLE: 'Approve for Submission',
  
  // Dialog Fields
  REASON_OPTIONAL: 'Reason (optional)',
  REASON_REQUIRED: 'Reason for Halt',
  REASON_HALT_DESC: 'Describe the issue that requires halting this rollout',
  REASON_HALT_PLACEHOLDER: 'e.g., Critical crash affecting login flow for users on Android 12+',
  COMMENTS_OPTIONAL: 'Comments (Optional)',
  COMMENTS_APPROVAL_DESC: 'Add any notes about this approval',
  COMMENTS_APPROVAL_PLACEHOLDER: 'e.g., Approved after QA sign-off',
  
  // Badge Labels
  APPROVED: 'Approved',
  APPROVAL_BLOCKED: 'Approval Blocked',
  
  // Button Labels (Extra Commits Warning)
  ACKNOWLEDGED: 'Acknowledged',
  PROCEED_ANYWAY: 'Proceed Anyway',
  
  // Build Details Labels
  VERSION_LABEL: 'Version:',
  BUILT_VIA_LABEL: 'Built via:',
  TESTFLIGHT_LABEL: 'TestFlight:',
  INTERNAL_TESTING_LINK: 'Internal Testing Link',
  VIEW_CI_JOB: 'View CI Job',
  RETRY_BUILD: 'Retry Build',
  READY_FOR_DISTRIBUTION: 'Ready for Distribution',
  BUILD_QUEUED: 'Build queued, waiting to start...',
  BUILD_IN_PROGRESS: 'Build in progress...',
  
  // Empty State Messages
  NO_BUILD_UPLOADED: (platform: string) => `No ${platform} build uploaded yet.`,
  WAITING_FOR_CICD: (platform: string) => `Waiting for CI/CD to build ${platform}...`,
  CI_BUILD_AUTO_START: 'CI build will start automatically',
} as const;

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
// STORE URLS
// ============================================================================

/**
 * Store Console URLs by Platform
 */
export const STORE_URLS: Record<Platform, string> = {
  ANDROID: 'https://play.google.com/console',
  IOS: 'https://appstoreconnect.apple.com',
} as const;

// ============================================================================
// UI SIZE MAPPINGS
// ============================================================================

/**
 * Progress bar height by size variant
 */
export const PROGRESS_BAR_HEIGHTS = {
  sm: 6,
  md: 10,
  lg: 16,
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

// ============================================================================
// ROLLOUT STATUS COLORS & LABELS
// ============================================================================

/** Rollout status to color mapping */
export const ROLLOUT_STATUS_COLORS = {
  complete: 'green',
  active: 'blue',
  paused: 'yellow',
  halted: 'red',
} as const;

/** Rollout status to label mapping */
export const ROLLOUT_STATUS_LABELS = {
  complete: 'Complete',
  active: 'Active',
  paused: 'Paused',
  halted: 'Halted',
} as const;

// ============================================================================
// EVENT HISTORY COLORS & LABELS
// ============================================================================

/** Event type to color mapping */
export const EVENT_COLORS: Record<SubmissionHistoryEventType, string> = {
  SUBMITTED: 'blue',
  APPROVED: 'green',
  ROLLOUT_RESUMED: 'green',
  REJECTED: 'red',
  ROLLOUT_HALTED: 'red',
  ROLLOUT_PAUSED: 'yellow',
  ROLLOUT_UPDATED: 'cyan',
  RETRY_ATTEMPTED: 'orange',
  STATUS_CHANGED: 'gray',
} as const;

/** Event type to label mapping */
export const EVENT_LABELS: Record<SubmissionHistoryEventType, string> = {
  SUBMITTED: 'Submitted',
  STATUS_CHANGED: 'Status Changed',
  ROLLOUT_UPDATED: 'Rollout Updated',
  ROLLOUT_PAUSED: 'Rollout Paused',
  ROLLOUT_RESUMED: 'Rollout Resumed',
  ROLLOUT_HALTED: 'Rollout Halted',
  REJECTED: 'Rejected',
  APPROVED: 'Approved',
  RETRY_ATTEMPTED: 'Retry Attempted',
} as const;

