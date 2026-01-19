/**
 * Release Schedule Controller Constants
 * Error and success messages for release schedule endpoints
 */

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const RELEASE_SCHEDULE_ERROR_MESSAGES = {
  MISSING_SCHEDULE_ID: 'Missing scheduleId in request body',
  SCHEDULE_NOT_FOUND: 'Release schedule not found',
  SCHEDULE_DISABLED: 'Release schedule is disabled',
  CREATE_RELEASE_FAILED: 'Failed to create scheduled release',
  LIST_SCHEDULES_FAILED: 'Failed to list release schedules'
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const RELEASE_SCHEDULE_SUCCESS_MESSAGES = {
  RELEASE_CREATED: 'Scheduled release created successfully',
  RELEASE_SKIPPED: 'Release creation skipped'
} as const;

