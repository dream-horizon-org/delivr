/**
 * Release Creation Conversion Utilities
 * 
 * Converts between config format (offset-based) and backend format (date-based)
 * No 'any' or 'unknown' types - all conversions are type-safe
 */

import type { RegressionSlot } from '~/types/release-config';
import type {
  RegressionBuildSlotBackend,
  PlatformTargetWithVersion,
  CreateReleaseBackendRequest,
  ReleaseCreationState,
  UpdateReleaseBackendRequest,
  UpdateReleaseState,
} from '~/types/release-creation-backend';
import type { TargetPlatform, Platform } from '~/types/release-config';

// ============================================================================
// Date Conversion Utilities
// ============================================================================

/**
 * Combine date and time strings into ISO date string (UTC)
 * Interprets user input as local timezone, then converts to UTC for storage
 * @param date - Date string in YYYY-MM-DD format
 * @param time - Time string in HH:MM format (optional)
 * @returns ISO date string in UTC
 * 
 * Example: User in IST (UTC+5:30) enters "2026-01-02" and "13:10" (1:10 PM local)
 * - Creates Date object: 2026-01-02 13:10:00 in local timezone (IST)
 * - Converts to UTC: 2026-01-02T07:40:00.000Z (13:10 - 5:30 = 07:40 UTC)
 * - When displayed back: Converts UTC to local timezone, shows 1:10 PM again
 */
export function combineDateAndTime(date: string, time?: string): string {
  // Parse date components (YYYY-MM-DD)
  const [year, month, day] = date.split('-').map(Number);
  
  // Create date in LOCAL timezone (user's timezone)
  // This interprets the date/time as the user intended in their local timezone
  const dateObj = new Date(year, month - 1, day);
  
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    // Set time in LOCAL timezone (user's timezone)
    dateObj.setHours(hours, minutes, 0, 0);
  } else {
    // Default to midnight local time if no time provided
    dateObj.setHours(0, 0, 0, 0);
  }
  
  // Convert to UTC ISO string
  // This automatically accounts for the timezone offset
  return dateObj.toISOString();
}

/**
 * Extract date and time from ISO string
 * Converts UTC ISO string to local timezone for display
 * @param isoString - ISO date string (UTC)
 * @returns Object with date (YYYY-MM-DD) and time (HH:MM) in local timezone
 */
export function extractDateAndTime(isoString: string): { date: string; time: string } {
  const dateObj = new Date(isoString);
  
  // Use local timezone methods to convert UTC to local for display
  // This ensures the user sees the date/time in their local timezone
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes}`;
  
  return { date, time };
}

// ============================================================================
// Regression Slot Conversion
// ============================================================================

/**
 * Convert config's offset-based regression slots to backend's date-based format
 * Uses user-provided kickoff date to calculate absolute dates
 * Interprets slot times as local timezone, then converts to UTC for storage
 * 
 * @param configSlots - Regression slots from config (offset-based)
 * @param kickOffDate - User-provided kickoff date (ISO string or Date)
 * @param targetReleaseDate - User-provided target release date (ISO string or Date)
 * @returns Backend-compatible regression slots with absolute dates
 */
export function convertConfigSlotsToBackend(
  configSlots: RegressionSlot[],
  kickOffDate: string | Date,
  targetReleaseDate: string | Date
): RegressionBuildSlotBackend[] {
  const kickOff = typeof kickOffDate === 'string' ? new Date(kickOffDate) : kickOffDate;
  const targetRelease = typeof targetReleaseDate === 'string' 
    ? new Date(targetReleaseDate) 
    : targetReleaseDate;

  return configSlots.map((slot) => {
    // Extract kickoff date components in LOCAL timezone
    // This ensures we're working with the user's intended local date
    const kickOffLocal = new Date(kickOff);
    const kickOffYear = kickOffLocal.getFullYear();
    const kickOffMonth = kickOffLocal.getMonth();
    const kickOffDay = kickOffLocal.getDate();
    
    // Calculate slot date: kickoff date + offset days (in local timezone)
    const slotDateLocal = new Date(kickOffYear, kickOffMonth, kickOffDay);
    slotDateLocal.setDate(slotDateLocal.getDate() + slot.regressionSlotOffsetFromKickoff);

    // Set slot time in LOCAL timezone (user's timezone)
    // This interprets the slot time as the user intended in their local timezone
    const [hours, minutes] = slot.time.split(':');
    slotDateLocal.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    // Convert to UTC ISO string (automatically accounts for timezone offset)
    const slotDateISO = slotDateLocal.toISOString();
    const slotDateUTC = new Date(slotDateISO);

    // Validate slot date is between kickoff and target release
    if (slotDateUTC < kickOff || slotDateUTC > targetRelease) {
      console.warn(
        `Regression slot date ${slotDateISO} is outside valid range ` +
        `(kickoff: ${kickOff.toISOString()}, target: ${targetRelease.toISOString()})`
      );
    }

    return {
      date: slotDateISO,
      config: {
        regressionBuilds: slot.config.regressionBuilds,
        postReleaseNotes: slot.config.postReleaseNotes,
        automationBuilds: slot.config.automationBuilds,
        automationRuns: slot.config.automationRuns,
      },
    };
  });
}

/**
 * Convert backend's date-based slots back to config's offset-based format (for editing)
 * Useful if user wants to edit slots in offset format
 * 
 * @param backendSlots - Backend regression slots (date-based)
 * @param kickOffDate - Kickoff date (ISO string or Date)
 * @returns Config-compatible regression slots with offsets
 */
export function convertBackendSlotsToConfig(
  backendSlots: RegressionBuildSlotBackend[],
  kickOffDate: string | Date
): RegressionSlot[] {
  const kickOff = typeof kickOffDate === 'string' ? new Date(kickOffDate) : kickOffDate;

  return backendSlots.map((slot, index) => {
    const slotDate = new Date(slot.date);
    const offsetDays = Math.floor(
      (slotDate.getTime() - kickOff.getTime()) / (1000 * 60 * 60 * 24)
    );

    const hours = String(slotDate.getHours()).padStart(2, '0');
    const minutes = String(slotDate.getMinutes()).padStart(2, '0');
    const time = `${hours}:${minutes}`;

    return {
      id: `slot-${index}`,
      name: slot.config.name as string | undefined || `Slot ${index + 1}`,
      regressionSlotOffsetFromKickoff: offsetDays,
      time,
      config: {
        regressionBuilds: slot.config.regressionBuilds,
        postReleaseNotes: slot.config.postReleaseNotes ?? false,
        automationBuilds: slot.config.automationBuilds ?? false,
        automationRuns: slot.config.automationRuns ?? false,
      },
    };
  });
}

// ============================================================================
// Platform Target Conversion
// ============================================================================

/**
 * Convert config targets to platformTargets array format
 * 
 * @param targets - Target platforms from config (e.g., ['PLAY_STORE', 'APP_STORE'])
 * @param versions - Per-platform versions (e.g., { ANDROID: 'v6.5.0', IOS: 'v6.3.0' })
 * @returns Backend-compatible platformTargets array
 */
export function convertConfigTargetsToPlatformTargets(
  targets: TargetPlatform[],
  versions: Record<Platform, string>
): PlatformTargetWithVersion[] {
  const platformTargets: PlatformTargetWithVersion[] = [];

  targets.forEach((target) => {
    if (target === 'WEB') {
      platformTargets.push({
        platform: 'WEB',
        target: 'WEB',
        version: versions.ANDROID || '1.0.0', // Default version if not specified
      });
    } else if (target === 'PLAY_STORE') {
      platformTargets.push({
        platform: 'ANDROID',
        target: 'PLAY_STORE',
        version: versions.ANDROID || '1.0.0',
      });
    } else if (target === 'APP_STORE') {
      platformTargets.push({
        platform: 'IOS',
        target: 'APP_STORE',
        version: versions.IOS || '1.0.0',
      });
    }
  });

  return platformTargets;
}

/**
 * Convert platformTargets array back to config format
 * 
 * @param platformTargets - Backend platformTargets array
 * @returns Object with targets array and versions record
 */
export function convertPlatformTargetsToConfig(
  platformTargets: PlatformTargetWithVersion[]
): {
  targets: TargetPlatform[];
  versions: Record<Platform, string>;
} {
  const targets: TargetPlatform[] = [];
  const versions: Record<Platform, string> = {
    ANDROID: '1.0.0',
    IOS: '1.0.0',
  };

  platformTargets.forEach((pt) => {
    if (pt.target === 'WEB') {
      if (!targets.includes('WEB')) {
        targets.push('WEB');
      }
      // Use ANDROID version for WEB (or could use a separate WEB version)
      versions.ANDROID = pt.version;
    } else if (pt.target === 'PLAY_STORE') {
      if (!targets.includes('PLAY_STORE')) {
        targets.push('PLAY_STORE');
      }
      versions.ANDROID = pt.version;
    } else if (pt.target === 'APP_STORE') {
      if (!targets.includes('APP_STORE')) {
        targets.push('APP_STORE');
      }
      versions.IOS = pt.version;
    }
  });

  return { targets, versions };
}

// ============================================================================
// State to Backend Request Conversion
// ============================================================================

/**
 * Convert UI state to backend-compatible request format
 * 
 * @param state - Release creation state from UI
 * @param configReleaseType - Release type from the selected config (MAJOR, MINOR, HOTFIX)
 * @returns Backend-compatible request payload
 */
export function convertStateToBackendRequest(
  state: ReleaseCreationState,
  configReleaseType?: string
): CreateReleaseBackendRequest {
  // Convert dates to ISO strings
  const kickOffDate = combineDateAndTime(state.kickOffDate, state.kickOffTime);
  const targetReleaseDate = combineDateAndTime(
    state.targetReleaseDate,
    state.targetReleaseTime
  );
  const kickOffReminderDate = state.kickOffReminderDate
    ? combineDateAndTime(state.kickOffReminderDate, state.kickOffReminderTime)
    : undefined;

  const request: CreateReleaseBackendRequest = {
    // Use config's releaseType (MAJOR/MINOR/HOTFIX) instead of state.type (PLANNED/IMMEDIATE)
    type: (configReleaseType || state.type) as any,
    platformTargets: state.platformTargets,
    releaseConfigId: state.releaseConfigId || '',
    baseBranch: state.baseBranch,
    kickOffDate,
    targetReleaseDate,
  };

  // Add optional fields if present
  if (state.branch) {
    request.branch = state.branch;
  }
  if (state.baseReleaseId) {
    request.baseReleaseId = state.baseReleaseId;
  }
  if (kickOffReminderDate) {
    request.kickOffReminderDate = kickOffReminderDate;
  }
  if (state.hasManualBuildUpload !== undefined) {
    request.hasManualBuildUpload = state.hasManualBuildUpload;
  }
  if (state.regressionBuildSlots && state.regressionBuildSlots.length > 0) {
    request.regressionBuildSlots = state.regressionBuildSlots;
  }
  if (state.cronConfig) {
    request.cronConfig = state.cronConfig;
  }

  return request;
}

// ============================================================================
// Update Release Conversion
// ============================================================================

/**
 * Convert UI update state to backend-compatible update request format
 * Only includes fields that have been changed (not undefined)
 * 
 * @param state - Update release state from UI
 * @returns Backend-compatible update request payload
 */
export function convertUpdateStateToBackendRequest(
  state: UpdateReleaseState
): UpdateReleaseBackendRequest {
  const request: UpdateReleaseBackendRequest = {};

  // Basic Info
  if (state.type !== undefined) {
    request.type = state.type;
  }
  if (state.branch !== undefined) {
    request.branch = state.branch;
  }
  if (state.baseBranch !== undefined) {
    request.baseBranch = state.baseBranch;
  }
  if (state.baseReleaseId !== undefined) {
    request.baseReleaseId = state.baseReleaseId;
  }

  // Dates - convert to ISO strings if provided
  if (state.kickOffDate) {
    request.kickOffDate = combineDateAndTime(state.kickOffDate, state.kickOffTime);
  }
  if (state.targetReleaseDate) {
    request.targetReleaseDate = combineDateAndTime(state.targetReleaseDate, state.targetReleaseTime);
  }
  if (state.kickOffReminderDate) {
    request.kickOffReminderDate = combineDateAndTime(state.kickOffReminderDate, state.kickOffReminderTime);
  }
  
  // Delay Reason - include if provided (required when extending targetReleaseDate)
  if (state.delayReason !== undefined) {
    request.delayReason = state.delayReason || undefined;
  }

  // Platform Target Mappings
  if (state.platformTargetMappings !== undefined) {
    request.platformTargetMappings = state.platformTargetMappings;
  }

  // Cron Config
  if (state.cronConfig || state.upcomingRegressions !== undefined) {
    request.cronJob = {};
    if (state.cronConfig) {
      request.cronJob.cronConfig = state.cronConfig as Record<string, unknown>;
    }
    // Always include upcomingRegressions if defined (even if empty array)
    // This ensures backend deletes all slots when array is empty
    if (state.upcomingRegressions !== undefined && state.upcomingRegressions !== null) {
      request.cronJob.upcomingRegressions = state.upcomingRegressions.map(slot => ({
        date: slot.date,
        config: slot.config as Record<string, unknown>,
      }));
    }
  }

  // Other fields
  if (state.hasManualBuildUpload !== undefined) {
    request.hasManualBuildUpload = state.hasManualBuildUpload;
  }
  if (state.releasePilotAccountId !== undefined) {
    request.releasePilotAccountId = state.releasePilotAccountId;
  }

  return request;
}

// ============================================================================
// Release to Form State Conversion (for Edit Mode)
// ============================================================================

/**
 * Convert backend release response to release creation form state
 * Used for editing existing releases
 * 
 * @param release - Backend release response
 * @returns Release creation state for form
 */
export function convertReleaseToFormState(
  release: any
): Partial<ReleaseCreationState> {
  const kickOffDate = release.kickOffDate ? extractDateAndTime(release.kickOffDate) : undefined;
  const targetReleaseDate = release.targetReleaseDate ? extractDateAndTime(release.targetReleaseDate) : undefined;
  const kickOffReminderDate = release.kickOffReminderDate ? extractDateAndTime(release.kickOffReminderDate) : undefined;

  // Convert platformTargetMappings to platformTargets format
  const platformTargets: PlatformTargetWithVersion[] = (release.platformTargetMappings || []).map((mapping: any) => ({
    platform: mapping.platform as Platform,
    target: mapping.target as TargetPlatform,
    version: mapping.version,
  }));

  // Convert regression slots from backend format (date-based) to form format
  const regressionBuildSlots: RegressionBuildSlotBackend[] = (release.cronJob?.upcomingRegressions || []).map((reg: any) => ({
    date: reg.date,
    config: reg.config || {},
  }));

  return {
    type: release.type,
    releaseConfigId: release.releaseConfigId || undefined,
    platformTargets,
    baseBranch: release.baseBranch || '',
    branch: release.branch || undefined,
    baseReleaseId: release.baseReleaseId || undefined,
    kickOffDate: kickOffDate?.date || '',
    kickOffTime: kickOffDate?.time || '',
    targetReleaseDate: targetReleaseDate?.date || '',
    targetReleaseTime: targetReleaseDate?.time || '',
    kickOffReminderDate: kickOffReminderDate?.date || undefined,
    kickOffReminderTime: kickOffReminderDate?.time || undefined,
    regressionBuildSlots,
    hasManualBuildUpload: release.hasManualBuildUpload || false,
    cronConfig: release.cronJob?.cronConfig || undefined,
  };
}

