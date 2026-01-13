/**
 * Type definitions for Release Schedule Utility Functions
 * 
 * These types are used by the utility functions in:
 * - services/release-schedules/utils/
 */

import type { ReleaseScheduleRecord, RegressionSlot, InitialVersion, RegressionSlotConfig } from './release-schedule.interface';
import type { ReleaseConfiguration } from '~types/release-configs';
import type { CreateReleasePayload, PlatformTargetVersion } from '~types/release';
import type { RELEASE_TYPE } from '~services/release-schedules/release-schedule.constants';

// ============================================================================
// VERSION UTILITIES
// ============================================================================

/**
 * Parsed semantic version components
 */
export type SemanticVersion = {
  major: number;
  minor: number;
  patch: number;
};

/**
 * Release type (MAJOR, MINOR, HOTFIX)
 * Derived from constants for type safety
 */
export type ReleaseType = typeof RELEASE_TYPE[keyof typeof RELEASE_TYPE];

// ============================================================================
// DATE CALCULATOR UTILITIES
// ============================================================================

/**
 * All calculated release dates in UTC ISO format
 */
export type ReleaseDates = {
  kickOffDate: string;          // UTC ISO string
  kickOffReminderDate: string;  // UTC ISO string
  targetReleaseDate: string;    // UTC ISO string
};

/**
 * Calculated regression slot date with config
 * Note: config is optional here; defaults are applied in buildRegressionBuildSlots
 */
export type RegressionSlotDate = {
  name: string | null;
  date: string;                 // UTC ISO string
  config?: RegressionSlotConfig;  // Optional; defaults applied downstream
};

// ============================================================================
// SCHEDULED RELEASE BUILDER UTILITIES
// ============================================================================

/**
 * Latest version entry for a platform-target combination
 * Same shape as PlatformTargetVersion but version can be null (no releases exist)
 */
export type LatestVersionEntry = {
  platform: string;
  target: string;
  version: string | null; // null if no releases exist for this PT
};

/**
 * Input data for building a scheduled release payload
 * All data is pre-fetched from DB
 */
export type ScheduledReleaseInput = {
  schedule: ReleaseScheduleRecord;
  config: ReleaseConfiguration;
  latestVersions: LatestVersionEntry[]; // Latest version per PT from DB
};

/**
 * Result of building a scheduled release payload
 */
export type ScheduledReleaseBuildResult = {
  payload: CreateReleasePayload;
  nextReleaseKickoffDate: string; // For updating schedule after creation
};

// ============================================================================
// SHARED TYPES (used across multiple utilities)
// ============================================================================

/**
 * Platform target with version information
 * This is an alias for better readability in utility functions
 * 
 * Note: This is the same shape as PlatformTargetVersion from ~types/release
 * Using a local alias improves code clarity in utility functions
 */
export type PlatformTargetWithVersion = {
  platform: string;
  target: string;
  version: string;
};

