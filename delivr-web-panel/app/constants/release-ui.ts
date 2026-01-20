/**
 * Release UI Constants
 * Constants for release-related UI operations (statuses, types, task statuses)
 * These may differ from backend enums as they represent UI-specific states
 */

// ============================================================================
// Release Status Constants (UI-specific)
// ============================================================================

export const RELEASE_STATUS = {
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
  IN_PROGRESS: 'IN_PROGRESS',
} as const;

export type ReleaseStatusValue = typeof RELEASE_STATUS[keyof typeof RELEASE_STATUS];

// ============================================================================
// Release Type Constants (UI-specific)
// ============================================================================

export const RELEASE_TYPE = {
  MAJOR: 'MAJOR',
  MINOR: 'MINOR',
  HOTFIX: 'HOTFIX',
} as const;

export type ReleaseTypeValue = typeof RELEASE_TYPE[keyof typeof RELEASE_TYPE];

// ============================================================================
// Task Status Constants
// ============================================================================

export const TASK_STATUS = {
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
  FAILED: 'FAILED',
} as const;

export type TaskStatusValue = typeof TASK_STATUS[keyof typeof TASK_STATUS];

// ============================================================================
// Mantine Color Constants
// ============================================================================

export const MANTINE_COLORS = {
  GREEN: 'green',
  GRAY: 'gray',
  BLUE: 'blue',
  RED: 'red',
  PURPLE: 'purple',
  YELLOW: 'yellow',
} as const;

export type MantineColorValue = typeof MANTINE_COLORS[keyof typeof MANTINE_COLORS];

// ============================================================================
// Release Active Status Constants (UI-specific, derived from backend data)
// ============================================================================
// These are UI statuses calculated at runtime based on:
// - kickOffDate for UPCOMING
// - status and cronJob.cronStatus for RUNNING/PAUSED
// - status for COMPLETED

export const RELEASE_ACTIVE_STATUS = {
  UPCOMING: 'UPCOMING',   // kickOffDate is in the future
  RUNNING: 'RUNNING',     // kickOffDate has passed, status is IN_PROGRESS, cronJob not PAUSED
  PAUSED: 'PAUSED',       // cronJob.cronStatus is PAUSED
  COMPLETED: 'COMPLETED', // status is COMPLETED
  ARCHIVED: 'ARCHIVED',   // status is ARCHIVED
} as const;

export type ReleaseActiveStatusValue = typeof RELEASE_ACTIVE_STATUS[keyof typeof RELEASE_ACTIVE_STATUS];

