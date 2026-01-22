/**
 * Release Schedule Constants
 * Configurable values for scheduled release creation
 */

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

/**
 * Days before next kickoff to create the release (working days)
 * Example: If next kickoff is Friday and this is 2,
 * release will be created on Wednesday (assuming Mon-Fri are working days)
 */
export const RELEASE_CREATION_ADVANCE_DAYS = 2;

/**
 * Fixed daily job time for Cronicle (in local timezone)
 * The job runs every day at this time and checks if it's time to create a release
 * Format: "HH:mm"
 */
export const CRONICLE_DAILY_JOB_TIME = '06:00';

/**
 * Days before kickoff for reminder (working days)
 * Used to calculate kickOffReminderDate from nextReleaseKickoffDate
 */
export const KICKOFF_REMINDER_OFFSET_DAYS = 1;

// ============================================================================
// RELEASE TYPE CONSTANTS
// ============================================================================

/**
 * Release Type for version bumping
 * - MAJOR: Bumps major version (1.0.0 → 2.0.0)
 * - MINOR: Bumps minor version (1.0.0 → 1.1.0)
 * - HOTFIX: Bumps patch version (1.0.0 → 1.0.1)
 */
export const RELEASE_TYPE = {
  MAJOR: 'MAJOR',
  MINOR: 'MINOR',
  HOTFIX: 'HOTFIX',
} as const;

export type ReleaseType = typeof RELEASE_TYPE[keyof typeof RELEASE_TYPE];

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default cron config for scheduled releases
 * Matches the defaults in release-creation.service.ts
 */
export const DEFAULT_CRON_CONFIG = {
  kickOffReminder: true,
  preRegressionBuilds: true,
  automationBuilds: false,
  automationRuns: false,
  testFlightBuilds: true,
} as const;

/**
 * Default release status for newly created releases
 */
export const DEFAULT_RELEASE_STATUS = 'IN_PROGRESS' as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const SCHEDULED_RELEASE_ERROR_MESSAGES = {
  SCHEDULE_NOT_FOUND: 'Release schedule not found',
  CONFIG_NOT_FOUND: 'Release configuration not found',
  NO_PREVIOUS_RELEASE: 'No previous release found for version bumping',
  INVALID_VERSION_FORMAT: 'Invalid version format. Expected semantic version (e.g., 1.0.0)',
  RELEASE_CREATION_FAILED: 'Failed to create scheduled release',
  INVALID_WORKING_DAYS: 'Working days configuration is invalid',
  INVALID_DATE_FORMAT: 'Invalid date format',
  NO_INITIAL_VERSION: 'No initial version configured for platform-target combination',
  VERSION_TOO_LOW_MAJOR: 'Version must be a major release (>= next major version)',
  VERSION_TOO_LOW_MINOR: 'Version must be a minor release (>= next minor version, same major)',
  VERSION_TOO_LOW_HOTFIX: 'Version must be a hotfix release (>= next patch version, same major.minor)',
  VERSION_EXCEEDS_MINOR_BOUND: 'Minor release version cannot exceed current major version',
  VERSION_EXCEEDS_HOTFIX_BOUND: 'Hotfix release version cannot exceed current minor version',
} as const;

