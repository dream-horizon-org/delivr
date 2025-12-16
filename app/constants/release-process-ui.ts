/**
 * Release Process UI Constants
 * All display strings, labels, messages, and UI-related constants for release process
 * 
 * NO HARDCODED STRINGS IN COMPONENTS - USE THIS FILE!
 */

import { TaskStatus } from '~/types/release-process-enums';

// ============================================================================
// Task Status Labels
// ============================================================================

export const TASK_STATUS_LABELS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  AWAITING_CALLBACK: 'Awaiting Callback',
  AWAITING_MANUAL_BUILD: 'Awaiting Manual Build',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  SKIPPED: 'Skipped',
} as const;

export const TASK_STATUS_COLORS = {
  PENDING: 'gray',
  IN_PROGRESS: 'brand',
  AWAITING_CALLBACK: 'yellow',
  AWAITING_MANUAL_BUILD: 'orange',
  COMPLETED: 'green',
  FAILED: 'red',
  SKIPPED: 'yellow',
} as const;

/**
 * Task Status Order for Sorting
 * Lower numbers = higher priority (shown first)
 */
export const TASK_STATUS_ORDER: Record<string, number> = {
  PENDING: 1,
  IN_PROGRESS: 2,
  AWAITING_CALLBACK: 2,
  AWAITING_MANUAL_BUILD: 2,
  COMPLETED: 3,
  FAILED: 4,
  SKIPPED: 5,
} as const;

// ============================================================================
// Task Type Labels
// ============================================================================

export const TASK_TYPE_LABELS = {
  // Stage 1: Kickoff (4 tasks)
  FORK_BRANCH: 'Fork Branch',
  CREATE_PROJECT_MANAGEMENT_TICKET: 'Create Project Management Ticket',
  CREATE_TEST_SUITE: 'Create Test Suite',
  TRIGGER_PRE_REGRESSION_BUILDS: 'Trigger Pre-Regression Builds',
  
  // Stage 2: Regression (4 tasks)
  RESET_TEST_SUITE: 'Reset Test Suite',
  CREATE_RC_TAG: 'Create RC Tag',
  CREATE_RELEASE_NOTES: 'Create Release Notes',
  TRIGGER_REGRESSION_BUILDS: 'Trigger Regression Builds',
  
  // Stage 3: Pre-Release (4 tasks)
  TRIGGER_TEST_FLIGHT_BUILD: 'Trigger TestFlight Build',
  CREATE_AAB_BUILD: 'Create Playstore Build',
  CREATE_RELEASE_TAG: 'Create Release Tag',
  CREATE_FINAL_RELEASE_NOTES: 'Create Final Release Notes',
} as const;

// ============================================================================
// Stage Status Labels
// ============================================================================

export const STAGE_STATUS_LABELS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
} as const;

export const STAGE_STATUS_COLORS = {
  PENDING: 'gray',
  IN_PROGRESS: 'brand',
  COMPLETED: 'green',
  FAILED: 'red',
} as const;

// ============================================================================
// Stage Labels
// ============================================================================

export const STAGE_LABELS = {
  KICKOFF: 'Kickoff',
  REGRESSION: 'Regression',
  PRE_RELEASE: 'Pre-Release',
  DISTRIBUTION: 'Distribution',
} as const;

// ============================================================================
// Regression Cycle Status Labels
// ============================================================================

export const CYCLE_STATUS_LABELS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  ABANDONED: 'Abandoned',
} as const;

export const CYCLE_STATUS_COLORS = {
  NOT_STARTED: 'gray',
  IN_PROGRESS: 'blue',
  DONE: 'green',
  ABANDONED: 'red',
} as const;

// ============================================================================
// Button Labels
// ============================================================================

export const BUTTON_LABELS = {
  RETRY: 'Retry',
  RETRY_TASK: 'Retry Task',
  UPLOAD_BUILD: 'Upload Build',
  APPROVE: 'Approve',
  COMPLETE: 'Complete',
  VIEW_DETAILS: 'View Details',
  VIEW_LOGS: 'View Logs',
  SEND_MESSAGE: 'Send Message',
  CLOSE: 'Close',
  CANCEL: 'Cancel',
  EDIT_RELEASE: 'Edit Release',
  PAUSE: 'Pause',
  RESUME: 'Resume',
  ACTIVITY_LOG: 'Activity Log',
  POST_SLACK_MESSAGE: 'Post Slack Message',
  
  // Slack Message Types
  SLACK_MESSAGE_TYPES: {
    TEST_RESULTS_SUMMARY: {
      value: 'test-results-summary',
      label: 'Test Results Summary',
      description: 'Send test results summary to Slack',
    },
    PRE_KICKOFF_REMINDER: {
      value: 'pre-kickoff-reminder',
      label: 'Pre-Kickoff Reminder',
      description: 'Send pre-kickoff reminder to Slack',
    },
  },
  BACK: 'Back',
} as const;

// ============================================================================
// Build Upload Labels
// ============================================================================

export const BUILD_UPLOAD_LABELS = {
  TITLE: 'Upload Build',
  ANDROID_TITLE: 'Upload Android Build',
  IOS_TITLE: 'Upload iOS Build',
  SELECT_FILE: 'Select File',
  UPLOADING: 'Uploading...',
  UPLOAD_SUCCESS: 'Build uploaded successfully',
  UPLOAD_ERROR: 'Failed to upload build',
  FILE_REQUIRED: 'Please select a file',
  PLATFORM_REQUIRED: 'Please select a platform',
} as const;

// ============================================================================
// Header Labels
// ============================================================================

export const HEADER_LABELS = {
  RELEASE_PROCESS: 'Release Process',
  CURRENT_STAGE: 'Current Stage',
  RELEASE_VERSION: 'Version',
  RELEASE_BRANCH: 'Branch',
  STATUS: 'Status',
  NO_BRANCH: 'No branch',
  NOT_AVAILABLE: 'N/A',
  PLATFORM_SEPARATOR: '→',
  BUILD_MODE: 'Build Mode',
  MANUAL_BUILD: 'Manual Build',
  CI_CD_BUILD: 'CI/CD Build',
} as const;

// ============================================================================
// Task Card Labels
// ============================================================================

export const TASK_CARD_LABELS = {
  TASK: 'Task',
  STATUS: 'Status',
  TYPE: 'Type',
  STARTED_AT: 'Started',
  COMPLETED_AT: 'Completed',
  DURATION: 'Duration',
  VIEW_DETAILS: 'View Details',
  RETRY: 'Retry',
  NO_DETAILS: 'No additional details available',
} as const;

// ============================================================================
// Pre-Kickoff Stage Labels
// ============================================================================

export const PRE_KICKOFF_LABELS = {
  TITLE: 'Release Not Started',
  DESCRIPTION: 'This release is ready to begin. The kickoff stage will start automatically.',
  WAITING: 'Waiting for kickoff...',
} as const;

// ============================================================================
// Kickoff Stage Labels
// ============================================================================

export const KICKOFF_LABELS = {
  TITLE: 'Kickoff Stage',
  DESCRIPTION: 'Initial setup tasks for the release',
  TASKS: 'Tasks',
  NO_TASKS: 'No tasks available',
  BUILD_UPLOAD: 'Build Upload',
  UPLOAD_WINDOW_OPEN: 'Upload window is open',
  UPLOAD_WINDOW_CLOSED: 'Upload window is closed',
} as const;

// ============================================================================
// Pre-Release Stage Labels
// ============================================================================

export const PRE_RELEASE_LABELS = {
  TITLE: 'Pre-Release Stage',
  DESCRIPTION: 'Pre-release tasks before distribution',
  TASKS: 'Tasks',
  NO_TASKS: 'No tasks available',
  BUILD_UPLOAD: 'Build Upload',
  PROMOTION_READY: 'Ready for Distribution',
  PROMOTION_NOT_READY: 'Complete all prerequisite tasks first',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  FAILED_TO_LOAD_STAGE: 'Failed to load stage data',
  FAILED_TO_RETRY_TASK: 'Failed to retry task',
  FAILED_TO_UPLOAD_BUILD: 'Failed to upload build',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  TASK_RETRIED: 'Task retry initiated successfully',
  BUILD_UPLOADED: 'Build uploaded successfully',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get display label for task status
 */
export function getTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status as keyof typeof TASK_STATUS_LABELS] || status;
}

/**
 * Get color for task status
 */
export function getTaskStatusColor(status: string): string {
  return TASK_STATUS_COLORS[status as keyof typeof TASK_STATUS_COLORS] || 'gray';
}

/**
 * Get display label for task type
 */
export function getTaskTypeLabel(taskType: string): string {
  return TASK_TYPE_LABELS[taskType as keyof typeof TASK_TYPE_LABELS] || taskType;
}

/**
 * Get display label for stage status
 */
export function getStageStatusLabel(status: string): string {
  return STAGE_STATUS_LABELS[status as keyof typeof STAGE_STATUS_LABELS] || status;
}

/**
 * Get color for stage status
 */
export function getStageStatusColor(status: string): string {
  return STAGE_STATUS_COLORS[status as keyof typeof STAGE_STATUS_COLORS] || 'gray';
}

/**
 * Get display label for cycle status
 */
export function getCycleStatusLabel(status: string): string {
  return CYCLE_STATUS_LABELS[status as keyof typeof CYCLE_STATUS_LABELS] || status;
}

/**
 * Get color for cycle status
 */
export function getCycleStatusColor(status: string): string {
  return CYCLE_STATUS_COLORS[status as keyof typeof CYCLE_STATUS_COLORS] || 'gray';
}

// ============================================================================
// Release Status Labels
// ============================================================================

export const RELEASE_STATUS_LABELS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  PAUSED: 'Paused',
  SUBMITTED: 'Submitted',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
} as const;

export const RELEASE_STATUS_COLORS = {
  PENDING: 'gray',
  IN_PROGRESS: 'brand',
  PAUSED: 'yellow',
  SUBMITTED: 'cyan',
  COMPLETED: 'green',
  ARCHIVED: 'gray',
} as const;

// ============================================================================
// Phase Labels
// ============================================================================

export const PHASE_LABELS = {
  NOT_STARTED: 'Not Started',
  KICKOFF: 'Kickoff',
  AWAITING_REGRESSION: 'Awaiting Regression',
  REGRESSION: 'Regression',
  REGRESSION_AWAITING_NEXT_CYCLE: 'Awaiting Next Cycle',
  AWAITING_PRE_RELEASE: 'Awaiting Pre-Release',
  PRE_RELEASE: 'Pre-Release',
  AWAITING_SUBMISSION: 'Awaiting Submission',
  SUBMISSION: 'Submission',
  SUBMITTED_PENDING_APPROVAL: 'Submitted - Pending Approval',
  COMPLETED: 'Completed',
  PAUSED_BY_USER: 'Paused by User',
  PAUSED_BY_FAILURE: 'Paused - Task Failed',
  ARCHIVED: 'Archived',
} as const;

export const PHASE_COLORS = {
  NOT_STARTED: 'gray',
  KICKOFF: 'brand',
  AWAITING_REGRESSION: 'cyan',
  REGRESSION: 'brand',
  REGRESSION_AWAITING_NEXT_CYCLE: 'cyan',
  AWAITING_PRE_RELEASE: 'cyan',
  PRE_RELEASE: 'brand',
  AWAITING_SUBMISSION: 'cyan',
  SUBMISSION: 'brand',
  SUBMITTED_PENDING_APPROVAL: 'cyan',
  COMPLETED: 'green',
  PAUSED_BY_USER: 'yellow',
  PAUSED_BY_FAILURE: 'red',
  ARCHIVED: 'gray',
} as const;

/**
 * Convert text to sentence case (only first letter of entire phrase capitalized, rest lowercase)
 * Example: "In Progress" -> "In progress", "KICKOFF" -> "Kickoff"
 */
function toSentenceCase(text: string): string {
  if (!text) return text;
  // Convert entire string to lowercase first, then capitalize only the first letter
  const lowercased = text.toLowerCase();
  return lowercased.charAt(0).toUpperCase() + lowercased.slice(1);
}

/**
 * Get display label for release status (sentence case)
 */
export function getReleaseStatusLabel(status: string): string {
  const label = RELEASE_STATUS_LABELS[status as keyof typeof RELEASE_STATUS_LABELS] || status;
  return toSentenceCase(label);
}

/**
 * Get color for release status
 */
export function getReleaseStatusColor(status: string): string {
  return RELEASE_STATUS_COLORS[status as keyof typeof RELEASE_STATUS_COLORS] || 'gray';
}

/**
 * Get display label for phase (sentence case)
 */
export function getPhaseLabel(phase: string): string {
  const label = PHASE_LABELS[phase as keyof typeof PHASE_LABELS] || phase;
  return toSentenceCase(label);
}

/**
 * Get color for phase
 */
export function getPhaseColor(phase: string): string {
  return PHASE_COLORS[phase as keyof typeof PHASE_COLORS] || 'gray';
}

// ============================================================================
// Build Upload Constants
// ============================================================================

/**
 * Maximum file size for build uploads (in bytes)
 */
export const BUILD_UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE_BYTES: 500 * 1024 * 1024, // 500 MB
  MAX_FILE_SIZE_MB: 500,
  ALLOWED_EXTENSIONS: {
    ANDROID: ['.aab', '.apk'],
    IOS: ['.ipa'],
    WEB: ['.zip', '.tar.gz'],
  },
} as const;

// ============================================================================
// Status Filter Options
// ============================================================================

/**
 * Status filter options for task filtering in stage components
 * Used in KickoffStage, PostRegressionStage, and other stage components
 */
export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: TaskStatus.PENDING, label: TASK_STATUS_LABELS.PENDING },
  { value: TaskStatus.IN_PROGRESS, label: TASK_STATUS_LABELS.IN_PROGRESS },
  { value: TaskStatus.AWAITING_CALLBACK, label: TASK_STATUS_LABELS.AWAITING_CALLBACK },
  { value: TaskStatus.AWAITING_MANUAL_BUILD, label: TASK_STATUS_LABELS.AWAITING_MANUAL_BUILD },
  { value: TaskStatus.COMPLETED, label: TASK_STATUS_LABELS.COMPLETED },
  { value: TaskStatus.FAILED, label: TASK_STATUS_LABELS.FAILED },
  { value: TaskStatus.SKIPPED, label: TASK_STATUS_LABELS.SKIPPED },
] as const;

/**
 * Get status filter options (helper function for consistency)
 */
export function getStatusFilterOptions() {
  return STATUS_FILTER_OPTIONS;
}

