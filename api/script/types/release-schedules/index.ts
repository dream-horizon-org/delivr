/**
 * Release Schedules Type Exports
 */

export type {
  ReleaseFrequency,
  WorkingDay,
  InitialVersion,
  RegressionSlot,
  ReleaseSchedule,
  ReleaseScheduleRecord,
  CreateReleaseScheduleDto,
  UpdateReleaseScheduleDto
} from './release-schedule.interface';

// Export runtime constants (values, not types)
export { RELEASE_FREQUENCIES } from './release-schedule.interface';

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

