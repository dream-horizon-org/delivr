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
} from '~/types/release-creation-backend';
import type { TargetPlatform, Platform } from '~/types/release-config';

// ============================================================================
// Date Conversion Utilities
// ============================================================================

/**
 * Combine date and time strings into ISO date string
 * @param date - Date string in YYYY-MM-DD format
 * @param time - Time string in HH:MM format (optional)
 * @returns ISO date string
 */
export function combineDateAndTime(date: string, time?: string): string {
  const dateObj = new Date(date);
  
  if (time) {
    const [hours, minutes] = time.split(':');
    dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  } else {
    // Default to midnight if no time provided
    dateObj.setHours(0, 0, 0, 0);
  }
  
  return dateObj.toISOString();
}

/**
 * Extract date and time from ISO string
 * @param isoString - ISO date string
 * @returns Object with date (YYYY-MM-DD) and time (HH:MM)
 */
export function extractDateAndTime(isoString: string): { date: string; time: string } {
  const dateObj = new Date(isoString);
  const date = dateObj.toISOString().split('T')[0] || '';
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
    // Calculate absolute date: kickoff date + offset days
    const slotDate = new Date(kickOff);
    slotDate.setDate(slotDate.getDate() + slot.regressionSlotOffsetFromKickoff);

    // Combine date with time from slot
    const [hours, minutes] = slot.time.split(':');
    slotDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    // Validate slot date is between kickoff and target release
    if (slotDate < kickOff || slotDate > targetRelease) {
      console.warn(
        `Regression slot date ${slotDate.toISOString()} is outside valid range ` +
        `(kickoff: ${kickOff.toISOString()}, target: ${targetRelease.toISOString()})`
      );
    }

    return {
      date: slotDate.toISOString(),
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
        version: versions.ANDROID || 'v1.0.0', // Default version if not specified
      });
    } else if (target === 'PLAY_STORE') {
      platformTargets.push({
        platform: 'ANDROID',
        target: 'PLAY_STORE',
        version: versions.ANDROID || 'v1.0.0',
      });
    } else if (target === 'APP_STORE') {
      platformTargets.push({
        platform: 'IOS',
        target: 'APP_STORE',
        version: versions.IOS || 'v1.0.0',
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
    ANDROID: 'v1.0.0',
    IOS: 'v1.0.0',
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
 * @returns Backend-compatible request payload
 */
export function convertStateToBackendRequest(
  state: ReleaseCreationState
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
    type: state.type,
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
  if (state.regressionTimings) {
    request.regressionTimings = state.regressionTimings;
  }
  if (state.preCreatedBuilds && state.preCreatedBuilds.length > 0) {
    request.preCreatedBuilds = state.preCreatedBuilds;
  }
  if (state.cronConfig) {
    request.cronConfig = state.cronConfig;
  }
  if (state.customIntegrationConfigs) {
    request.customIntegrationConfigs = state.customIntegrationConfigs;
  }

  return request;
}

