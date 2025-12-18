/**
 * Release Creation Constants
 * Centralized constants for all Release Creation components
 */

// =============================================================================
// RELEASE TYPES
// =============================================================================

// Release type options for release creation
export const RELEASE_TYPES = [
  { value: 'MINOR', label: 'Minor Release' },
  { value: 'HOTFIX', label: 'Hotfix' },
  { value: 'PATCH', label: 'Patch' },
] as const;

// =============================================================================
// DEFAULT VALUES
// =============================================================================

// Default time values for scheduling
export const DEFAULT_RELEASE_TIME = '17:00'; // 5 PM
export const DEFAULT_KICKOFF_TIME = '10:00'; // 10 AM
export const DEFAULT_REGRESSION_SLOT_TIME = '10:00'; // 10 AM

// Default offset values (in days)
export const DEFAULT_KICKOFF_OFFSET_DAYS = 2; // Kickoff is 2 days before release
export const DEFAULT_REGRESSION_OFFSET_DAYS = 1; // First regression slot is 1 day before release

// =============================================================================
// DEFAULT VERSIONS & BRANCHES
// =============================================================================

/**
 * Default version values that should trigger version suggestions
 */
export const DEFAULT_VERSIONS = ['v1.0.0', 'v0.0.0', 'v1.1.0'] as const;

/**
 * Default branch name patterns that should be updated
 */
export const DEFAULT_BRANCH_PATTERNS = ['release/1.1.0', 'release/1.0.0'] as const;

// =============================================================================
// FIELD GROUPS
// =============================================================================

/**
 * Field groups for error clearing logic
 * Used to clear related field errors when a field in the group is updated
 */
export const FIELD_GROUPS = {
  KICKOFF: ['kickOffDate', 'kickOffTime'],
  TARGET_RELEASE: ['targetReleaseDate', 'targetReleaseTime'],
  KICKOFF_REMINDER: ['kickOffReminderDate', 'kickOffReminderTime'],
  REGRESSION_SLOTS: ['regressionBuildSlots'],
  PLATFORM_TARGETS: ['platformTargets'],
} as const;

/**
 * Helper type for field group keys
 */
export type FieldGroupKey = keyof typeof FIELD_GROUPS;

