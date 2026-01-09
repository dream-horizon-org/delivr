/**
 * Polling Interval Constants
 * 
 * Centralized constants for all polling intervals and related cache/stale times
 * used across the application. All intervals are in milliseconds.
 */

// ============================================================================
// Release Process Polling Intervals
// ============================================================================

/**
 * Release process stage polling interval (30 seconds)
 * Used for: Kickoff, Regression, Pre-Release stages
 */
export const RELEASE_PROCESS_STAGE_POLLING_INTERVAL = 30 * 1000;

/**
 * Activity logs polling interval (30 seconds)
 * Used for: Activity logs, test management status, project management status, cherry pick status
 */
export const ACTIVITY_LOGS_POLLING_INTERVAL = 30 * 1000;

// ============================================================================
// Release Process Cache & Stale Times
// ============================================================================

/**
 * Stale time for release process stages (2 minutes)
 * Data is considered fresh for this duration
 */
export const RELEASE_PROCESS_STAGE_STALE_TIME = 2 * 60 * 1000;

/**
 * Cache time for release process stages (10 minutes)
 * Data stays in cache for this duration
 */
export const RELEASE_PROCESS_STAGE_CACHE_TIME = 10 * 60 * 1000;

/**
 * Stale time for activity logs and status checks (30 seconds)
 * Data is considered fresh for this duration
 */
export const ACTIVITY_LOGS_STALE_TIME = 30 * 1000;

/**
 * Cache time for activity logs and status checks (2 minutes)
 * Data stays in cache for this duration
 */
export const ACTIVITY_LOGS_CACHE_TIME = 2 * 60 * 1000;

/**
 * Stale time for cherry pick status (1 minute)
 * Data is considered fresh for this duration
 */
export const CHERRY_PICK_STALE_TIME = 1 * 60 * 1000;

/**
 * Cache time for cherry pick status (5 minutes)
 * Data stays in cache for this duration
 */
export const CHERRY_PICK_CACHE_TIME = 5 * 60 * 1000;

// ============================================================================
// Distribution Polling Intervals
// ============================================================================

/**
 * Distribution status polling interval (30 seconds)
 * Used for: Distribution submission status polling
 */
export const DISTRIBUTION_STATUS_POLLING_INTERVAL = 30 * 1000;

/**
 * Maximum polling duration for distribution (5 minutes)
 */
export const MAX_DISTRIBUTION_POLLING_DURATION = 5 * 60 * 1000;

