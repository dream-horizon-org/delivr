/**
 * Distribution Module - Constants
 * 
 * All constants used across Distribution components
 * Reference: docs/02-product-specs/distribution-spec.md
 */

import type {
    BuildUploadStatus,
    Platform,
    SubmissionStatus,
    WarningSeverity,
} from '~/types/distribution/distribution.types';
import { DistributionStatus } from '~/types/distribution/distribution.types';

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
// IN-APP UPDATE PRIORITY (Android)
// ============================================================================

/** Minimum in-app update priority */
export const IN_APP_UPDATE_PRIORITY_MIN = 0;

/** Maximum in-app update priority */
export const IN_APP_UPDATE_PRIORITY_MAX = 5;

/** In-App Update Priority Options for Select component */
export const IN_APP_UPDATE_PRIORITY_OPTIONS = [
  { value: '0', label: '0 - Lowest' },
  { value: '1', label: '1 - Low' },
  { value: '2', label: '2 - Medium' },
  { value: '3', label: '3 - High' },
  { value: '4', label: '4 - Higher' },
  { value: '5', label: '5 - Highest (Immediate)' },
] as const;

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
  PARTIALLY_SUBMITTED: 'Partially Submitted',
  SUBMITTED: 'Submitted',
  PARTIALLY_RELEASED: 'Partially Released',
  RELEASED: 'Released',
} as const;

// Legacy name for backward compatibility
export const RELEASE_STATUS_LABELS = DISTRIBUTION_STATUS_LABELS;

/**
 * Submission Status Labels
 */
export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  PENDING: 'Pending',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  LIVE: 'Live',
  PAUSED: 'Paused',
  REJECTED: 'Rejected',
  HALTED: 'Halted',
  CANCELLED: 'Cancelled',
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
  PARTIALLY_SUBMITTED: 'cyan',
  SUBMITTED: 'blue',
  PARTIALLY_RELEASED: 'violet',
  RELEASED: 'green',
} as const;

// Legacy name for backward compatibility
export const RELEASE_STATUS_COLORS = DISTRIBUTION_STATUS_COLORS;

/**
 * Submission Status Colors (for badges)
 */
export const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  PENDING: 'gray',
  IN_REVIEW: 'yellow',
  APPROVED: 'green',
  LIVE: 'green',
  PAUSED: 'orange',
  REJECTED: 'red',
  HALTED: 'red',
  CANCELLED: 'gray',
} as const;

/**
 * Submission Status Colors (for progress bars)
 * Note: Different from badge colors - progress bars use blue for active/in-progress state
 */
export const SUBMISSION_PROGRESS_COLORS: Record<SubmissionStatus, string> = {
  PENDING: 'gray',
  IN_REVIEW: 'blue',
  APPROVED: 'green',
  LIVE: 'green',
  PAUSED: 'orange',
  REJECTED: 'red',
  HALTED: 'red',
  CANCELLED: 'gray',
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
 * @deprecated Track selection removed - AAB submissions go directly to production per API spec
 * Kept for backwards compatibility - will be removed in future version
 */
export const ANDROID_TRACKS = [
  { value: 'INTERNAL', label: 'Internal Testing' },
  { value: 'ALPHA', label: 'Alpha (Closed Testing)' },
  { value: 'BETA', label: 'Beta (Open Testing)' },
  { value: 'PRODUCTION', label: 'Production' },
] as const;

/**
 * iOS Release Type - Always "AFTER_APPROVAL" per API spec
 * This is a display-only field, non-editable
 * @deprecated Do not use - iOS release type is always AFTER_APPROVAL
 */
export const IOS_RELEASE_TYPE_AUTOMATIC = 'AFTER_APPROVAL' as const;

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
  IOS_RELEASE_TYPE_AFTER_APPROVAL: 'After Approval',
  IOS_PHASED_RELEASE: 'Enable Phased Release',
  IOS_PHASED_RELEASE_DESC: 'Gradually release to users over 7 days',
  IOS_RESET_RATING: 'Reset App Rating',
  IOS_RESET_RATING_DESC: 'Reset app rating to zero for this version',
  
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
  VERSION_LABEL: 'Version',
  BUILD_LABEL: 'Build',
  EXPOSURE_LABEL: 'Exposure',
  BUILT_VIA_LABEL: 'Built via:',
  TESTFLIGHT_LABEL: 'TestFlight:',
  INTERNAL_TESTING_LINK: 'Internal Testing Link',
  VIEW_CI_JOB: 'View CI Job',
  RETRY_BUILD: 'Retry Build',
  READY_FOR_DISTRIBUTION: 'Ready for Distribution',
  BUILD_QUEUED: 'Build queued, waiting to start...',
  BUILD_IN_PROGRESS: 'Build in progress...',
  
  // Timeline Labels
  TIMELINE_SUBMITTED: 'Submitted:',
  TIMELINE_APPROVED: 'Approved:',
  TIMELINE_RELEASED: 'Released:',
  
  // Rejection Label
  REJECTION_LABEL: 'Rejection',
  
  // Empty State Messages
  NO_BUILD_UPLOADED: (platform: string) => `No ${platform} build uploaded yet.`,
  WAITING_FOR_CICD: (platform: string) => `Waiting for CI/CD to build ${platform}...`,
  CI_BUILD_AUTO_START: 'CI build will start automatically',
  
  // Build Upload Selector Labels
  UPLOAD_NEW_BUILD: (platform: string) => `Upload New ${platform} Build`,
  UPLOAD_AAB_FILE: 'Upload AAB file',
  PROVIDE_TESTFLIGHT_BUILD: 'Provide TestFlight build number',
  DIRECT_TO_PRODUCTION: 'Direct to Production',
  DIRECT_TO_PRODUCTION_DESC: 'This build will be submitted directly to the Production track (no internal testing).',
  SELECT_AAB_FILE: 'Select AAB File',
  AAB_FILE_PLACEHOLDER: 'Click to select .aab file',
  SELECTED_FILE: 'Selected',
  TESTFLIGHT_BUILD_DESC: 'Enter the build number from TestFlight that you want to submit to App Store.',
  TESTFLIGHT_BUILD_PLACEHOLDER: 'e.g., 251',
  
  // Error Messages
  ERROR_TITLE: 'Error',
  UPLOAD_FAILED: 'Upload failed',
  VERIFICATION_FAILED: 'Verification failed',
  NETWORK_ERROR: 'Network error. Please try again.',
  
  // Artifact Display Labels
  ARTIFACT_TITLE: (platform: string) => `${platform} Artifact`,
  FROM_PRERELEASE: 'From Pre-release Testing',
  PROMOTING_TO_PRODUCTION: 'Promoting to Production',
  ARTIFACT_TESTED_DESC: 'This artifact has been tested and will be promoted to the Production track.',
  SIZE_LABEL: 'Size',
  AAB_BADGE: 'AAB',
  TESTFLIGHT_BADGE: 'TestFlight',
  INTERNAL_TESTING: 'Internal Testing',
  TESTFLIGHT_TESTING: 'TestFlight Testing',
  TEST_BUILD_BEFORE_PROMOTION: 'Test this build before promotion →',
  TESTFLIGHT_BUILD: (buildNumber: string) => `TestFlight Build ${buildNumber}`,
  READY_FOR_APPSTORE: 'Ready for App Store submission',
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
  SUBMISSION_SUCCESSFUL_TITLE: 'Submission Successful',
  SUBMISSION_SUCCESSFUL_MESSAGE: 'Your release has been submitted to the selected stores!',
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
  SUBMISSION_FAILED_TITLE: 'Submission Failed',
} as const;

/**
 * Warning Messages
 */
export const WARNING_MESSAGES = {
  EXTRA_COMMITS: 'Extra commits detected after last regression. Proceed with caution.',
  NO_SLACK_CONFIGURED: 'No Slack integration configured. Please share testing links manually.',
  PARTIAL_SUBMISSION: 'Only some platforms were submitted successfully.',
  ACTIVE_ROLLOUT: 'Previous release has an active rollout. This may affect distribution.',
  ACTIVE_ANDROID_ROLLOUT: 'A previous release has an active rollout on Play Store. Submitting a new version will replace it.',
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
  RESUBMIT: 'Resubmit to', // For resubmission after rejection/cancellation
  CANCEL_SUBMISSION: 'Cancel Submission',
  FIX_METADATA: 'Fix Metadata -',
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
  UPLOAD_AAB: 'Upload AAB',
  VERIFY: 'Verify',
  VERIFY_AND_USE: 'Verify & Use Build',
  SUBMIT: 'Submit',
  RETRY: 'Retry',
  RESUBMIT: 'Re-submit to Store',
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
  KEEP_SUBMISSION: 'Keep Submission',
  PROCEED_NEW_VERSION: 'Proceed with New Version (Replace Old)',
  HALT_ROLLOUT: 'Halt Rollout',
  PAUSE_ROLLOUT: 'Pause Rollout',
  RESUME_ROLLOUT: 'Resume Rollout',
} as const;

// ============================================================================
// DIALOG COMPONENTS CONSTANTS
// ============================================================================

/** Dialog Icon Sizes */
export const DIALOG_ICON_SIZES = {
  TITLE: 20,
  ALERT: 16,
  ACTION: 18,
} as const;

/** Dialog UI Text - Comprehensive text for all dialog components */
export const DIALOG_UI = {
  // Halt Rollout Dialog
  HALT: {
    WARNING_TITLE: 'Irreversible Action',
    WARNING_MESSAGE: 'Halting will immediately stop the rollout and require a new hotfix release. This action cannot be undone.',
    SEVERITY_LABEL: 'Severity Level',
    REASON_LABEL: 'Reason for halting',
    REASON_PLACEHOLDER: 'e.g., Critical bug found, security vulnerability',
    REASON_REQUIRED: 'Please provide a reason for halting the rollout.',
    CONSEQUENCE_TITLE: 'What happens after halt:',
    CONSEQUENCE_ITEMS: [
      'Current rollout stops immediately',
      'Users on this version remain (no rollback)',
      'New users will not receive this version',
      'A hotfix release will be required',
    ],
  },
  
  // Pause Rollout Dialog
  PAUSE: {
    CONFIRMATION: (platform: string, percentage: number) => 
      `Pause the ${platform} rollout at ${percentage}%?`,
    DESCRIPTION: 'The rollout will stop at the current percentage. New users will not receive this update until resumed.',
    WARNING_LINE1: 'You can pause for up to 30 days total (cumulative). If you pause for 10 days, you\'ll have 20 days remaining.',
    WARNING_LINE2: 'Resume will continue from where you left off. After 30 days of pause, the phased release will automatically resume.',
    REASON_LABEL: 'Reason for pausing',
    REASON_PLACEHOLDER: 'e.g., Found potential issue, need to investigate',
    REASON_REQUIRED: 'Please provide a reason for pausing the rollout',
  },
  
  // Resume Rollout Dialog
  RESUME: {
    CONFIRMATION: (platform: string, percentage: number) => 
      `Resume the ${platform} rollout from ${percentage}%?`,
    DESCRIPTION: 'The rollout will continue from where it was paused. You can increase the percentage after resuming.',
    PAUSED_REASON_LABEL: 'Paused reason',
    NOTE: 'The rollout will resume at the same percentage where it was paused.',
  },
  
  // Update Rollout Dialog
  UPDATE_ROLLOUT: {
    WARNING_TITLE: 'Irreversible Increase',
    WARNING_MESSAGE: 'Rollout can only be increased, never decreased. This action cannot be undone.',
  },
  
  // Manual Approval Dialog
  MANUAL_APPROVAL: {
    WARNING_TITLE: 'Manual Approval Required',
    WARNING_MESSAGE: (roleLabel: string) =>
      `No PM integration is configured. As a ${roleLabel}, you are authorizing this release to proceed to distribution.`,
    RELEASE_ID_LABEL: 'Release ID',
    COMMENTS_LABEL: 'Approval Comments (optional)',
    COMMENTS_PLACEHOLDER: 'Add any notes about this approval...',
    ACKNOWLEDGMENT: 'I acknowledge that I am approving this release for distribution.',
  },
  
  // Cancel Submission Dialog
  CANCEL_SUBMISSION: {
    CONFIRMATION: (platform: string, version: string) =>
      `Cancel ${platform} submission for version ${version}?`,
    DESCRIPTION: 'This submission will be cancelled and removed from the store review process. You will need to manually create a new submission with all details if you want to submit again.',
    REASON_LABEL: 'Reason for cancellation',
    REASON_PLACEHOLDER: 'e.g., Found a critical bug, need to update details',
    REASON_REQUIRED: 'Please provide a reason for cancellation',
  },
  
  // Retry Submission Dialog
  RETRY_SUBMISSION: {
    DESCRIPTION: (platform: string, version: string) =>
      `Your ${platform} submission (version ${version}) was rejected. You can retry the submission, optionally providing updated release notes or a new build.`,
    BUILD_SELECTOR_NOTE: '(Build selection/upload UI will go here for new AAB/TestFlight)',
    RELEASE_NOTES_LABEL: 'Release Notes (Optional)',
    RELEASE_NOTES_PLACEHOLDER: 'Enter updated release notes for this submission',
  },
  
  // Version Conflict Dialog
  VERSION_CONFLICT: {
    DESCRIPTION: 'This usually happens when a new version is submitted while an older one is still in review or live. Please choose how you\'d like to proceed.',
  },
  
  // Exposure Control Dialog
  EXPOSURE_CONTROL: {
    CURRENT_RELEASE_INFO: (platform: string, version: string, rolloutPercentage: number) =>
      `${platform} release v${version} is currently at ${rolloutPercentage}% rollout.`,
    IMPACT_LABEL: 'Impact:',
    ACTION_PROMPT: 'Choose how to proceed:',
    DESCRIPTION: 'Control the percentage of users who will receive this update.',
    PERCENTAGE_LABEL: 'Rollout Percentage',
  },
  
  // Resubmission Dialog
  RESUBMISSION: {
    SHORT_DESC_LABEL: 'Short Description',
    SHORT_DESC_PLACEHOLDER: 'Brief description of your app',
    SHORT_DESC_LIMIT_ANDROID: 'Max 80 characters',
    SHORT_DESC_LIMIT_IOS: 'Max 170 characters',
    FULL_DESC_LABEL: 'Full Description',
    FULL_DESC_PLACEHOLDER: 'Detailed description of your app',
    RELEASE_NOTES_LABEL: 'Release Notes (What\'s New)',
    RELEASE_NOTES_PLACEHOLDER: 'What\'s new in this version...',
    KEYWORDS_LABEL: 'Keywords',
    KEYWORDS_PLACEHOLDER: 'Comma-separated keywords',
    KEYWORDS_DESC: 'Keywords for app store search',
  },
} as const;

// ============================================================================
// FORM COMPONENTS
// ============================================================================

/** Icon sizes for form components */
export const FORM_ICON_SIZES = {
  ALERT: 16,
  BUTTON: 16,
  INPUT: 18,
  CHECKBOX: 20,
  SMALL: 16,
} as const;

/** Resubmission Form Limits */
export const RESUBMISSION_FORM_LIMITS = {
  SHORT_DESCRIPTION: {
    ANDROID: 80,
    IOS: 170,
  },
  TEXTAREA_ROWS: {
    FULL_DESCRIPTION: 4,
    RELEASE_NOTES: 3,
  },
} as const;

// ============================================================================
// DISTRIBUTIONS LIST PAGE
// ============================================================================

/**
 * Distributions List Page - UI Text
 */
export const DISTRIBUTIONS_LIST_UI = {
  PAGE_TITLE: 'Distributions',
  PAGE_SUBTITLE: 'Manage store submissions and rollouts across all releases',
  EMPTY_TITLE: 'No Active Distributions',
  EMPTY_MESSAGE: 'Distributions appear here automatically when a release completes the pre-release phase. You can then track rollout progress and manage store submissions.',
  LOADING_TITLE: 'Loading distributions...',
  LOADING_MESSAGE: 'Please wait while we fetch your data',
  ERROR_PREFIX: 'Error:',
  RETRY_BUTTON: 'Retry',
  SUBMIT_BUTTON: 'Submit',
  VIEW_BUTTON: 'Open', // Changed from "View" for clarity
  MANAGE_BUTTON: 'Manage',
  MODAL_TITLE: 'Submit to App Stores',
  TABLE_HEADERS: {
    VERSION: 'Version',
    BRANCH: 'Branch',
    PLATFORMS: 'Platforms',
    STATUS: 'Status',
    LAST_UPDATED: 'Last Updated',
    ACTIONS: 'Actions',
  },
  STATS_TITLES: {
    TOTAL_DISTRIBUTIONS: 'Total Distributions',
    TOTAL_SUBMISSIONS: 'Total Submissions',
    IN_REVIEW: 'In Review',
    RELEASED: 'Released',
  },
  PAGINATION_TEXT: (start: number, end: number, total: number) => 
    `Showing ${start}-${end} of ${total}`,
  PLATFORM_TOOLTIP: {
    NOT_SUBMITTED: (platform: string) => `${platform}: Not Submitted`,
    SUBMITTED: (platform: string, status: string, exposure?: number) => 
      exposure !== undefined && exposure > 0
        ? `${platform}: ${status} (${exposure}%)`
        : `${platform}: ${status}`,
  },
} as const;

/**
 * Distributions List Page - Icon Sizes
 */
export const DISTRIBUTIONS_LIST_ICON_SIZES = {
  EMPTY_STATE_LARGE: 60,
  EMPTY_STATE_INNER: 30,
  PLATFORM_BADGE: 24,
  STATUS_ICON: 14,
  ACTION_BUTTON: 16,
  STATS_CARD: 16,
  CLOCK_ICON: 14,
  ALERT_ICON: 20,
} as const;

/**
 * Distributions List Page - Layout Sizes
 */
export const DISTRIBUTIONS_LIST_LAYOUT = {
  EMPTY_TEXT_MAX_WIDTH: 400,
  ACTION_BUTTON_WIDTH: 100,
  PLATFORM_BADGE_PADDING: '10px 14px',
  ACTIONS_COLUMN_WIDTH: 150,
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
// STORE URLS & NAMES
// ============================================================================

/**
 * Store Display Names by Platform
 */
export const STORE_NAMES: Record<Platform, string> = {
  ANDROID: 'Play Store',
  IOS: 'App Store',
} as const;

export const STORE_TYPE_NAMES: Record<'PLAY_STORE' | 'APP_STORE', string> = {
  PLAY_STORE: 'Google Play Store',
  APP_STORE: 'Apple App Store',
} as const;

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
  COMPLETE: 'green',
  ACTIVE: 'blue',
  PAUSED: 'yellow',
  HALTED: 'red',
} as const;

/** Rollout status to label mapping */
export const ROLLOUT_STATUS_LABELS = {
  COMPLETE: 'Complete',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  HALTED: 'Halted',
} as const;

// ============================================================================
// DISTRIBUTION MANAGEMENT PAGE
// ============================================================================

/** UI text for distribution management page */
export const DISTRIBUTION_MANAGEMENT_UI = {
  PAGE_TITLE: 'Distribution Management',
  PAGE_SUBTITLE: (version: string) => `Manage submissions and rollouts for ${version}`,
  OVERVIEW_TITLE: 'Distribution Details',
  RELEASE_VERSION: (version: string) => `Release ${version}`,
  PLATFORM_SUBMISSIONS_TITLE: 'Platform Submissions',
  PLATFORM_SUBMISSIONS_SUBTITLE: 'Track and manage submissions for each platform',
  ROLLOUT_PROGRESS_LABEL: 'Rollout Progress',
  NO_SUBMISSIONS_TITLE: 'No Submissions Yet',
  NO_SUBMISSIONS_MESSAGE: "This distribution hasn't been submitted to any stores yet. Click \"Submit to Stores\" to begin the distribution process.",
  ERROR_TITLE: 'Failed to Load Distribution',
  ERROR_NOT_FOUND: 'Distribution not found',
  
  // Detail Page Sections
  SECTIONS: {
    LATEST_ANDROID_SUBMISSION: 'Active Submission',
    LATEST_IOS_SUBMISSION: 'Active Submission',
    ANDROID_SUBMISSION_HISTORY: 'Submission History',
    IOS_SUBMISSION_HISTORY: 'Submission History',
    ANDROID_ACTIVITY_HISTORY: 'Activity History',
    IOS_ACTIVITY_HISTORY: 'Activity History',
  },

  // Empty States
  EMPTY_STATES: {
    NO_ACTIVE_ANDROID_SUBMISSION: 'No active Android submission.',
    NO_ACTIVE_IOS_SUBMISSION: 'No active iOS submission.',
    NO_HISTORICAL_ANDROID_SUBMISSIONS: 'No historical Android submissions.',
    NO_HISTORICAL_IOS_SUBMISSIONS: 'No historical iOS submissions.',
    NO_ANDROID_ACTIVITY_HISTORY: 'No Android activity history.',
    NO_IOS_ACTIVITY_HISTORY: 'No iOS activity history.',
  },
  
  LABELS: {
    BRANCH: 'Branch',
    LAST_UPDATED: 'Last Updated',
    STATUS_UPDATED: 'Status Updated',
    CREATED_AT: 'Created At',
    SUBMITTED_AT: 'Submitted At',
    SUBMITTED: 'Submitted',
    SUBMITTED_BY: 'Submitted By',
    UPDATED: 'Updated',
    ROLLOUT_PROGRESS: 'Rollout Progress',
    IN_APP_PRIORITY: 'In-App Priority',
    RELEASE_TYPE: 'Release Type',
    IOS_RELEASE_TYPE_AFTER_APPROVAL: 'After Approval',
    BUILD_ARTIFACTS: 'Build Artifacts',
    RELEASE_NOTES: 'Release Notes',
    AAB_FILE: 'AAB File',
    TESTFLIGHT_BUILD: 'TestFlight Build',
    INTERNAL_TRACK_LINK: 'Internal Track Link',
    DOWNLOAD: 'Download',
    OPEN: 'Open',
    PHASED_RELEASE: 'Phased Release',
    MANUAL_RELEASE: 'Manual Release',
    IOS_PHASED_ROLLOUT_NOTE: 'Automatic 7-day phased rollout by Apple',
  },
  
  BUTTONS: {
    BACK: 'Back',
    BACK_TO_DISTRIBUTIONS: 'Back to Distributions',
    SUBMIT_TO_STORES: 'Submit to Stores',
    PROMOTE: 'Promote',
    VIEW_DETAILS: 'View Details & Manage',
    UPDATE_ROLLOUT: 'Update Rollout',
    PAUSE_ROLLOUT: 'Pause Rollout',
    RESUME_ROLLOUT: 'Resume Rollout',
    CANCEL_SUBMISSION: 'Cancel Submission',
    RESUBMIT: 'Resubmit',
    EMERGENCY_HALT: 'Emergency Halt',
  },
} as const;

/** Icon sizes for distribution management page */
export const DISTRIBUTION_MANAGEMENT_ICON_SIZES = {
  DETAIL: 20,
  PLATFORM: 28,
  EMPTY_STATE: 30,
  ERROR_STATE: 30,
  BACK_BUTTON: 16,
  LINK_ICON: 16,
} as const;

// ============================================================================
// ROLLOUT CONTROLS
// ============================================================================

/** Rollout Controls - UI Text */
export const ROLLOUT_CONTROLS_UI = {
  TITLE: 'Rollout Controls',
  ADJUST_LABEL: 'Adjust Rollout',
  CURRENT_MARK: 'Current',
  COMPLETE_MARK: '100%',
  UPDATE_BUTTON: (percentage: number) => `Update to ${percentage}%`,
  PHASED_RELEASE_LABEL: 'Phased Release',
  STAGED_ROLLOUT_LABEL: 'Staged Rollout',
  IOS_PHASED_NOTE: 'iOS phased release is managed automatically by Apple over 7 days.',
  COMPLETE_MESSAGE: 'Rollout complete - 100% of users can now access this version.',
} as const;

/** Rollout Controls - Icon Sizes */
export const ROLLOUT_CONTROLS_ICON_SIZES = {
  UPDATE_BUTTON: 14,
  ACTION_BUTTON: 16,
  COMPLETE_BADGE: 16,
} as const;

/** Rollout Controls - Layout */
export const ROLLOUT_CONTROLS_LAYOUT = {
  DIVIDER_MARGIN_TOP: 'sm',
  DIVIDER_PADDING_TOP: 'md',
} as const;

/** Layout constants for distribution management page */
export const DISTRIBUTION_MANAGEMENT_LAYOUT = {
  PROGRESS_BAR_HEIGHT: 8,
  PROGRESS_BAR_RADIUS: 4,
  EMPTY_STATE_SIZE: 60,
  ERROR_STATE_SIZE: 60,
  CARD_MIN_WIDTH: 300,
  EMPTY_TEXT_MAX_WIDTH: 400,
} as const;

// ============================================================================
// IOS PHASED RELEASE SCHEDULE
// ============================================================================

/** Apple's phased release schedule (7-day rollout percentages) */
export const IOS_PHASED_RELEASE_SCHEDULE = [
  { day: 1, percentage: 1, label: 'Day 1', description: '~1% of users' },
  { day: 2, percentage: 2, label: 'Day 2', description: '~2% of users' },
  { day: 3, percentage: 5, label: 'Day 3', description: '~5% of users' },
  { day: 4, percentage: 10, label: 'Day 4', description: '~10% of users' },
  { day: 5, percentage: 20, label: 'Day 5', description: '~20% of users' },
  { day: 6, percentage: 50, label: 'Day 6', description: '~50% of users' },
  { day: 7, percentage: 100, label: 'Day 7', description: '100% of users' },
] as const;

// ============================================================================
// FORM VALIDATION CONSTANTS
// ============================================================================

/** Halt reason validation limits */
export const HALT_REASON_VALIDATION = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 1000,
} as const;

// ============================================================================
// STORE NAMES
// ============================================================================

/** Store display names by platform */
export const STORE_DISPLAY_NAMES = {
  ANDROID: 'Google Play Store',
  IOS: 'Apple App Store',
} as const;

// ============================================================================
// VERSION CONFLICT STATUS
// ============================================================================

/** Status emoji mapping for version conflict dialog */
export const VERSION_CONFLICT_STATUS_EMOJI = {
  LIVE: '🟢',
  IN_REVIEW: '🟡',
  DRAFT: '📝',
} as const;

/** Status label mapping for version conflict dialog */
export const VERSION_CONFLICT_STATUS_LABELS = {
  LIVE: 'Live',
  IN_REVIEW: 'In Review',
  DRAFT: 'Draft',
} as const;

// ============================================================================
// ARTIFACT DISPLAY DEFAULTS
// ============================================================================

/** Default artifact name when not provided */
export const DEFAULT_AAB_ARTIFACT_NAME = 'app-release.aab';

/** Timeline label width for submission card */
export const SUBMISSION_TIMELINE_LABEL_WIDTH = 70;

