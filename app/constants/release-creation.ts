/**
 * Release Creation Constants
 * Centralized constants for all Release Creation components
 */

// =============================================================================
// RELEASE TYPES
// =============================================================================

// Release type options for release creation
export const RELEASE_TYPES = [
  { value: 'PLANNED', label: 'Planned Release' },
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

