/**
 * Scheduled Release Builder Utility
 * Pure functions to build CreateReleasePayload from schedule and config data
 * 
 * NO database calls - all data is pre-fetched and passed in
 */

import type {
  ReleaseScheduleRecord,
  InitialVersion,
  ScheduledReleaseInput,
  ScheduledReleaseBuildResult,
  LatestVersionEntry
} from '~types/release-schedules';
import { applyRegressionSlotConfigDefaults } from '~types/release-schedules';
import type { ReleaseConfiguration } from '~types/release-configs';
import type { CreateReleasePayload, PlatformTargetVersion } from '~types/release';
import {
  calculateReleaseDates,
  calculateRegressionSlotDates,
  calculateNextKickoffDate
} from './date-calculator.utils';
import { bumpVersion, resolveVersionForFirstScheduledRelease } from './version.utils';
import { generateBranchName } from './branch.utils';
import {
  KICKOFF_REMINDER_OFFSET_DAYS,
  DEFAULT_CRON_CONFIG
} from '../release-schedule.constants';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find latest version for a platform-target combination
 * @param latestVersions - Array of latest versions per PT
 * @param platform - Platform to find
 * @param target - Target to find
 * @returns Latest version string, or null if not found
 */
const findLatestVersion = (
  latestVersions: LatestVersionEntry[],
  platform: string,
  target: string
): string | null => {
  const entry = latestVersions.find(
    lv => lv.platform === platform && lv.target === target
  );
  return entry?.version ?? null;
};

/**
 * Determine platform targets with versions
 * - First release of schedule: use resolveVersionForFirstScheduledRelease
 * - Subsequent releases: bump from latest tenant version
 * 
 * @param schedule - Release schedule record
 * @param config - Release configuration
 * @param latestVersions - Array of latest versions per platform-target
 */
const determinePlatformTargets = (
  schedule: ReleaseScheduleRecord,
  config: ReleaseConfiguration,
  latestVersions: LatestVersionEntry[]
): PlatformTargetVersion[] => {
  const isFirstScheduleRelease = schedule.lastCreatedReleaseId === null;
  
  return schedule.initialVersions.map((iv: InitialVersion) => {
    const latestVersion = findLatestVersion(latestVersions, iv.platform, iv.target);
    
    if (isFirstScheduleRelease) {
      // First release of this schedule: use resolveVersionForFirstScheduledRelease
      // This handles both first-ever release AND first release when other releases exist
      const version = resolveVersionForFirstScheduledRelease(
        iv.version, // initialVersion from schedule config
        latestVersion, // latest from tenant (may be null)
        config.releaseType
      );
      return {
        platform: iv.platform,
        target: iv.target,
        version
      };
    }
    
    // Subsequent release: bump from latest tenant version
    // latestVersion should always exist for subsequent releases
    const hasLatestVersion = latestVersion !== null;
    if (!hasLatestVersion) {
      // Fallback - shouldn't happen for subsequent releases
      console.warn(`[determinePlatformTargets] No latest version found for ${iv.platform}-${iv.target}, using initialVersion`);
      return {
        platform: iv.platform,
        target: iv.target,
        version: iv.version
      };
    }
    
    return {
      platform: iv.platform,
      target: iv.target,
      version: bumpVersion(latestVersion, config.releaseType)
    };
  });
};

/**
 * Parse ISO date string to Date object
 */
const parseDate = (isoString: string): Date => {
  return new Date(isoString);
};

/**
 * Build regression build slots array for CreateReleasePayload
 * Applies default config values if not provided
 */
const buildRegressionBuildSlots = (
  kickoffDateStr: string,
  schedule: ReleaseScheduleRecord
): Array<{ date: Date; config: Record<string, boolean> }> => {
  const slotDates = calculateRegressionSlotDates(
    kickoffDateStr,
    schedule.regressionSlots,
    schedule.workingDays,
    schedule.timezone
  );
  
  return slotDates.map(slot => ({
    date: parseDate(slot.date),
    config: applyRegressionSlotConfigDefaults(slot.config)  // Apply defaults here
  }));
};

// ============================================================================
// MAIN BUILDER FUNCTION
// ============================================================================

/**
 * Build CreateReleasePayload from schedule and config data
 * 
 * @param input - Pre-fetched data (schedule, config, latestVersions)
 * @returns Object with payload and nextReleaseKickoffDate
 * 
 * @example
 * const latestVersions = [
 *   { platform: 'ANDROID', target: 'PLAY_STORE', version: '1.5.0' },
 *   { platform: 'IOS', target: 'APP_STORE', version: '1.5.0' }
 * ];
 * const { payload, nextReleaseKickoffDate } = buildScheduledReleasePayload({
 *   schedule: scheduleFromDB,
 *   config: configFromDB,
 *   latestVersions
 * });
 */
export const buildScheduledReleasePayload = (
  input: ScheduledReleaseInput
): ScheduledReleaseBuildResult => {
  const { schedule, config, latestVersions } = input;
  
  // 1. Determine platform targets (with versions)
  const platformTargets = determinePlatformTargets(schedule, config, latestVersions);
  
  // 2. Calculate all release dates
  const kickoffDateStr = getKickoffDateForRelease(schedule);
  
  const releaseDates = calculateReleaseDates(kickoffDateStr, {
    kickoffTime: schedule.kickoffTime,
    kickoffReminderTime: schedule.kickoffReminderTime,
    kickoffReminderOffsetDays: KICKOFF_REMINDER_OFFSET_DAYS,
    targetReleaseTime: schedule.targetReleaseTime,
    targetReleaseDateOffsetFromKickoff: schedule.targetReleaseDateOffsetFromKickoff,
    workingDays: schedule.workingDays,
    timezone: schedule.timezone
  });
  
  // 3. Generate branch name
  const branch = generateBranchName(platformTargets);
  
  // 4. Build regression slots
  const regressionBuildSlots = buildRegressionBuildSlots(kickoffDateStr, schedule);
  
  // 5. Calculate next kickoff date (for updating schedule after creation)
  const nextReleaseKickoffDate = calculateNextKickoffDate(
    kickoffDateStr,
    schedule.releaseFrequency,
    schedule.workingDays
  );
  
  // 6. Build the payload
  const payload: CreateReleasePayload = {
    // From config
    appId: config.appId,
    releaseConfigId: config.id,
    type: config.releaseType,
    baseBranch: config.baseBranch ?? undefined,
    hasManualBuildUpload: config.hasManualBuildUpload,
    
    // From schedule
    accountId: schedule.createdByAccountId,
    releasePilotAccountId: schedule.createdByAccountId,
    
    // Calculated
    platformTargets,
    branch,
    kickOffDate: parseDate(releaseDates.kickOffDate),
    kickOffReminderDate: parseDate(releaseDates.kickOffReminderDate),
    targetReleaseDate: parseDate(releaseDates.targetReleaseDate),
    regressionBuildSlots,
    
    // Defaults
    cronConfig: DEFAULT_CRON_CONFIG,
    
    // Not applicable for scheduled releases (yet)
    baseReleaseId: undefined
  };
  
  return {
    payload,
    nextReleaseKickoffDate
  };
};

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Check if this is the first release for a schedule
 */
export const isFirstScheduledRelease = (
  schedule: ReleaseScheduleRecord
): boolean => {
  return schedule.lastCreatedReleaseId === null;
};

/**
 * Get kickoff date string from schedule
 * For first release: use firstReleaseKickoffDate
 * For subsequent: use nextReleaseKickoffDate
 */
export const getKickoffDateForRelease = (
  schedule: ReleaseScheduleRecord
): string => {
  const isFirst = isFirstScheduledRelease(schedule);
  return isFirst ? schedule.firstReleaseKickoffDate : schedule.nextReleaseKickoffDate;
};

