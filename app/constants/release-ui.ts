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
  PLANNED: 'PLANNED',
  HOTFIX: 'HOTFIX',
  UNPLANNED: 'UNPLANNED',
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

