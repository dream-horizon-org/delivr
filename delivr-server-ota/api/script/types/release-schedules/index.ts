/**
 * Release Schedules Type Exports
 */

export type {
  ReleaseFrequency,
  WorkingDay,
  InitialVersion,
  RegressionSlot,
  RegressionSlotConfig,
  ReleaseSchedule,
  ReleaseScheduleRecord,
  CreateReleaseScheduleDto,
  UpdateReleaseScheduleDto
} from './release-schedule.interface';

// Export runtime constants and functions (values, not types)
export { 
  RELEASE_FREQUENCIES,
  DEFAULT_REGRESSION_SLOT_CONFIG,
  applyRegressionSlotConfigDefaults
} from './release-schedule.interface';

export type {
  SemanticVersion,
  ReleaseType,
  ReleaseDates,
  RegressionSlotDate,
  LatestVersionEntry,
  ScheduledReleaseInput,
  ScheduledReleaseBuildResult,
  PlatformTargetWithVersion
} from './release-schedule-utils.interface';

