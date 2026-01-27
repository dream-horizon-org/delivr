/**
 * Release Schedule Type Definitions
 * Types for scheduling configuration and recurring releases
 */

// ============================================================================
// SCHEDULING TYPES
// ============================================================================

/**
 * Release frequency options (uppercase for consistency)
 * Using 'as const' pattern for single source of truth - array exists at runtime, type derived from it
 */
export const RELEASE_FREQUENCIES = ['WEEKLY', 'BIWEEKLY', 'TRIWEEKLY', 'MONTHLY'] as const;

export type ReleaseFrequency = typeof RELEASE_FREQUENCIES[number];

/**
 * Day of week - aligns with JavaScript Date.getDay()
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
 * 4 = Thursday, 5 = Friday, 6 = Saturday
 */
export type WorkingDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Initial version configuration for a platform-target combination
 * Example: { platform: "ANDROID", target: "PLAY_STORE", version: "6.2.0" }
 */
export type InitialVersion = {
  platform: string;
  target: string;
  version: string;
};

/**
 * Regression slot config - all flags are optional with defaults
 */
export type RegressionSlotConfig = {
  regressionBuilds?: boolean;   // Default: true
  postReleaseNotes?: boolean;   // Default: true
  automationBuilds?: boolean;   // Default: false
  automationRuns?: boolean;     // Default: false
};

/**
 * Default values for regression slot config flags
 */
export const DEFAULT_REGRESSION_SLOT_CONFIG: Required<RegressionSlotConfig> = {
  regressionBuilds: true,
  postReleaseNotes: true,
  automationBuilds: false,
  automationRuns: false
} as const;

/**
 * Apply default values to regression slot config
 */
export const applyRegressionSlotConfigDefaults = (config?: RegressionSlotConfig): Required<RegressionSlotConfig> => ({
  regressionBuilds: config?.regressionBuilds ?? DEFAULT_REGRESSION_SLOT_CONFIG.regressionBuilds,
  postReleaseNotes: config?.postReleaseNotes ?? DEFAULT_REGRESSION_SLOT_CONFIG.postReleaseNotes,
  automationBuilds: config?.automationBuilds ?? DEFAULT_REGRESSION_SLOT_CONFIG.automationBuilds,
  automationRuns: config?.automationRuns ?? DEFAULT_REGRESSION_SLOT_CONFIG.automationRuns
});

/**
 * Regression slot configuration
 */
export type RegressionSlot = {
  name?: string;
  regressionSlotOffsetFromKickoff: number; // Should be <= targetReleaseDateOffsetFromKickoff
  time: string; // Format: "HH:mm", should be <= targetReleaseTime if regressionSlotOffsetFromKickoff == targetReleaseDateOffsetFromKickoff
  config?: RegressionSlotConfig; // Optional - defaults applied at runtime
};

/**
 * Release schedule configuration
 * This is the structure used in API requests/responses
 */
export type ReleaseSchedule = {
  releaseFrequency: ReleaseFrequency;
  firstReleaseKickoffDate: string; // ISO date string
  nextReleaseKickoffDate?: string; // Optional, may be absent in request body
  initialVersions: InitialVersion[]; // Array of platform-target-version combinations
  kickoffReminderTime: string; // Format: "HH:mm", should be <= kickoffTime
  kickoffTime: string; // Format: "HH:mm"
  targetReleaseTime: string; // Format: "HH:mm"
  targetReleaseDateOffsetFromKickoff: number; // Should be >= 0
  kickoffReminderEnabled: boolean;
  timezone: string; // e.g., "Asia/Kolkata"
  regressionSlots?: RegressionSlot[]; // Optional: can be absent or empty array
  workingDays: WorkingDay[];
  // Runtime state fields (present in API responses, not in requests)
  isEnabled?: boolean; // Whether the schedule is active
  lastCreatedReleaseId?: string | null; // ID of the last release created from this schedule
};

// ============================================================================
// DATABASE RECORD TYPES
// ============================================================================

/**
 * Release Schedule database record
 * Represents a row in the release_schedules table
 */
export type ReleaseScheduleRecord = {
  id: string;
  appId: string;
  releaseConfigId: string; // FK to release_configurations (the config this schedule belongs to)

  // Scheduling Configuration
  releaseFrequency: ReleaseFrequency;
  firstReleaseKickoffDate: string;
  initialVersions: InitialVersion[];
  kickoffReminderTime: string;
  kickoffTime: string;
  targetReleaseTime: string;
  targetReleaseDateOffsetFromKickoff: number;
  kickoffReminderEnabled: boolean;
  timezone: string;
  regressionSlots: RegressionSlot[] | null;
  workingDays: WorkingDay[];

  // Runtime State
  nextReleaseKickoffDate: string;
  isEnabled: boolean;
  lastCreatedReleaseId: string | null;
  cronicleJobId: string | null;

  // Metadata
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * DTO for creating a release schedule
 * Note: releaseConfigId is required - schedule must belong to a config
 */
export type CreateReleaseScheduleDto = {
  releaseConfigId: string; // FK to release_configurations (required)
  appId: string;        // Denormalized for query performance
  releaseFrequency: ReleaseFrequency;
  firstReleaseKickoffDate: string;
  initialVersions: InitialVersion[];
  kickoffReminderTime: string;
  kickoffTime: string;
  targetReleaseTime: string;
  targetReleaseDateOffsetFromKickoff: number;
  kickoffReminderEnabled: boolean;
  timezone: string;
  regressionSlots?: RegressionSlot[];
  workingDays: WorkingDay[];
  nextReleaseKickoffDate: string;
  createdByAccountId: string;
};

/**
 * DTO for updating a release schedule
 */
export type UpdateReleaseScheduleDto = Partial<Omit<CreateReleaseScheduleDto, 'appId' | 'createdByAccountId'>> & {
  isEnabled?: boolean;
  lastCreatedReleaseId?: string | null;
  cronicleJobId?: string | null;
};

