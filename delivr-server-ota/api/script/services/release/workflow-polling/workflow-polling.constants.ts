/**
 * Workflow Polling Error Messages
 */
export const WORKFLOW_POLLING_ERROR_MESSAGES = {
  RELEASE_ID_REQUIRED: 'releaseId is required for workflow polling',
  APP_ID_REQUIRED: 'appId is required for workflow polling',
  MISSING_QUEUE_LOCATION: 'Build is missing queueLocation - cannot check status',
  MISSING_CI_RUN_ID: 'Build is missing ciRunId - cannot check running status',
  MISSING_CI_RUN_TYPE: 'Build is missing ciRunType - cannot determine provider',
  UNSUPPORTED_PROVIDER: 'Unsupported CI/CD provider type',
  INTEGRATION_NOT_FOUND: 'CI/CD integration not found for tenant',
  STATUS_CHECK_FAILED: 'Failed to check workflow status'
} as const;

/**
 * Workflow Polling Success Messages
 */
export const WORKFLOW_POLLING_SUCCESS_MESSAGES = {
  PENDING_POLL_COMPLETED: 'Pending workflows poll completed',
  RUNNING_POLL_COMPLETED: 'Running workflows poll completed'
} as const;

/**
 * Workflow Polling Configuration
 */
export const WORKFLOW_POLLING_CONFIG = {
  /** Default polling interval in minutes (configurable via env) */
  DEFAULT_POLL_INTERVAL_MINUTES: 1,
  /** Environment variable name for poll interval */
  POLL_INTERVAL_ENV_VAR: 'WORKFLOW_POLL_INTERVAL_MINUTES'
} as const;

/**
 * Sanitize job ID for Cronicle compatibility
 * Cronicle doesn't accept hyphens in job IDs - replace with underscores
 * 
 * @param id - Job ID with potential hyphens
 * @returns Sanitized job ID safe for Cronicle
 */
const sanitizeCronicleJobId = (id: string): string => {
  return id.replace(/-/g, '_');
};

/**
 * Cronicle Job ID Patterns
 * IDs are sanitized to replace hyphens with underscores for Cronicle compatibility
 */
export const CRONICLE_JOB_ID_PATTERNS = {
  /** Pattern for pending workflow poller job */
  PENDING_POLLER: (releaseId: string) => sanitizeCronicleJobId(`workflow-poll-pending-${releaseId}`),
  /** Pattern for running workflow poller job */
  RUNNING_POLLER: (releaseId: string) => sanitizeCronicleJobId(`workflow-poll-running-${releaseId}`)
} as const;

