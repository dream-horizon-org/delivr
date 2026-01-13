/**
 * Release Creation Validation Utilities
 * 
 * Validates release creation state before submission.
 * No 'any' or 'unknown' types - all explicitly typed.
 */

import type { ReleaseCreationState, ValidationResult } from '~/types/release-creation-backend';
import { combineDateAndTime } from './release-creation-converter';
import { RELEASE_ACTIVE_STATUS } from '~/constants/release-ui';
import { PLATFORMS, TARGET_PLATFORMS } from '~/types/release-config-constants';

/**
 * Validate release creation state
 * Returns validation result with errors for each invalid field
 * 
 * @param state - The release creation state to validate
 * @param isEditMode - Whether we're in edit mode (default: false)
 * @param activeStatus - The active status of the release (UPCOMING, RUNNING, PAUSED, COMPLETED)
 */
export function validateReleaseCreationState(
  state: Partial<ReleaseCreationState>,
  isEditMode: boolean = false,
  activeStatus?: string
): ValidationResult {
  const errors: Record<string, string> = {};
  const isAfterKickoff = activeStatus === RELEASE_ACTIVE_STATUS.RUNNING || activeStatus === RELEASE_ACTIVE_STATUS.PAUSED;

  // Required fields validation
  if (!state.type) {
    errors.type = 'Release type is required';
  } else if (!['MAJOR', 'MINOR', 'HOTFIX'].includes(state.type)) {
    errors.type = 'Release type must be MAJOR, MINOR, or HOTFIX';
  }

  // Skip platform targets validation in edit mode post-kickoff (not editable)
  if (!isAfterKickoff) {
    if (!state.platformTargets || state.platformTargets.length === 0) {
      errors.platformTargets = 'At least one platform target must be selected';
    } else {
    // Validate each platform target
    state.platformTargets.forEach((pt, index) => {
      if (!pt.platform || !pt.target || !pt.version) {
        errors[`platformTargets[${index}]`] = 'Platform, target, and version are required';
      } else {
        // Validate platform
        const validPlatforms = [PLATFORMS.ANDROID, PLATFORMS.IOS, TARGET_PLATFORMS.WEB];
        if (!validPlatforms.includes(pt.platform as any)) {
          errors[`platformTargets[${index}].platform`] = `Invalid platform: ${pt.platform}`;
        }

        // Validate target
        const validTargets = [TARGET_PLATFORMS.PLAY_STORE, TARGET_PLATFORMS.APP_STORE, TARGET_PLATFORMS.WEB];
        if (!validTargets.includes(pt.target as any)) {
          errors[`platformTargets[${index}].target`] = `Invalid target: ${pt.target}`;
        }

        // Validate version format (strict: X.Y.Z only, no prefix/suffix)
        const versionTrimmed = (pt.version || '').trim();
        if (!versionTrimmed) {
          // Only set version-{target} error to avoid duplicates
          errors[`version-${pt.target}`] = 'Version is required';
        } else if (!/^\d+\.\d+\.\d+$/.test(versionTrimmed)) {
          // Only set version-{target} error to avoid duplicates
          errors[`version-${pt.target}`] = `Invalid version format. Expected: 1.0.0 (no prefix or suffix)`;
        }

        // Validate platform-target combinations
        if (pt.platform === PLATFORMS.ANDROID && pt.target !== TARGET_PLATFORMS.PLAY_STORE) {
          errors[`platformTargets[${index}]`] = 'ANDROID platform must target PLAY_STORE';
        }
        if (pt.platform === PLATFORMS.IOS && pt.target !== TARGET_PLATFORMS.APP_STORE) {
          errors[`platformTargets[${index}]`] = 'IOS platform must target APP_STORE';
        }
        if (pt.platform === TARGET_PLATFORMS.WEB && pt.target !== TARGET_PLATFORMS.WEB) {
          errors[`platformTargets[${index}]`] = 'WEB platform must target WEB';
        }
      }
    });
    }
  }

  // Skip releaseConfigId validation in edit mode (not editable)
  if (!isEditMode) {
    if (!state.releaseConfigId) {
      errors.releaseConfigId = 'Release configuration ID is required';
    }
  }

  // Skip baseBranch validation in edit mode post-kickoff (not editable)
  if (!isAfterKickoff) {
    if (!state.baseBranch) {
      errors.baseBranch = 'Base branch is required';
    }
  }

  // Skip branch validation in edit mode post-kickoff (not editable)
  if (!isAfterKickoff) {
    if (!state.branch || state.branch.trim() === '') {
      errors.branch = 'Release branch name is required';
    }
  }

  // Date validation
  if (!state.kickOffDate) {
    errors.kickOffDate = 'Kickoff date is required';
  } else {
    const kickOffDateOnly = new Date(state.kickOffDate);
    if (isNaN(kickOffDateOnly.getTime())) {
      errors.kickOffDate = 'Invalid kickoff date format';
    } else {
      // Validate datetime (date + time) is not in the past
      const kickOffDateTime = combineDateAndTime(
        state.kickOffDate,
        state.kickOffTime || '00:00'
      );
      const kickOff = new Date(kickOffDateTime);
      const now = new Date();
      if (kickOff <= now) {
        errors.kickOffDate = 'Kickoff date and time cannot be in the past';
      }
    }
  }

  if (!state.targetReleaseDate) {
    errors.targetReleaseDate = 'Target release date is required';
  } else {
    const targetReleaseDateOnly = new Date(state.targetReleaseDate);
    if (isNaN(targetReleaseDateOnly.getTime())) {
      errors.targetReleaseDate = 'Invalid target release date format';
    } else {
      // Validate datetime (date + time) is not in the past
      const targetReleaseDateTime = combineDateAndTime(
        state.targetReleaseDate,
        state.targetReleaseTime || '00:00'
      );
      const targetRelease = new Date(targetReleaseDateTime);
      const now = new Date();
      if (targetRelease <= now) {
        errors.targetReleaseDate = 'Target release date and time cannot be in the past';
      }

      // Validate target release date is after kickoff date (including time)
      if (state.kickOffDate) {
        // Combine date and time for accurate comparison
        const kickOffDateTime = combineDateAndTime(
          state.kickOffDate,
          state.kickOffTime || '00:00'
        );
        const kickOff = new Date(kickOffDateTime);
        
        // Reuse already computed targetRelease datetime
        if (targetRelease <= kickOff) {
          errors.targetReleaseDate = 'Target release date and time must be after kickoff date and time';
        }
      }
    }
  }

  // Target release time is required
  if (!state.targetReleaseTime) {
    errors.targetReleaseTime = 'Target release time is required';
  }

  // Skip kickoff time validation in edit mode post-kickoff (not editable)
  if (!isAfterKickoff) {
    if (!state.kickOffTime) {
      errors.kickOffTime = 'Kickoff time is required';
    }
  }

  // Validate kickoff reminder date and time (only if reminder is enabled)
  // Skip in edit mode post-kickoff (not editable)
  // Reminder is enabled if: cronConfig.kickOffReminder is true OR both date and time are set
  const isReminderEnabled = state.cronConfig?.kickOffReminder === true || 
                            (!!state.kickOffReminderDate && !!state.kickOffReminderTime);
  
  if (!isAfterKickoff && isReminderEnabled) {
    // Both date and time should be provided together when reminder is enabled
    if (!state.kickOffReminderDate) {
      errors.kickOffReminderDate = 'Kickoff reminder date is required when reminder is enabled';
    }
    if (!state.kickOffReminderTime) {
      errors.kickOffReminderTime = 'Kickoff reminder time is required when reminder is enabled';
    }

    // Validate reminder is before kickoff (including time)
    if (state.kickOffReminderDate && state.kickOffReminderTime && state.kickOffDate && state.kickOffTime) {
      // Normalize time format - remove AM/PM and convert to 24-hour if needed
      const normalizeTime = (time: string): string => {
        if (!time) return '00:00';
        // Remove AM/PM and trim
        let normalized = time.replace(/AM|PM/gi, '').trim();
        const isPM = /PM/i.test(time);
        const isAM = /AM/i.test(time);
        
        if (isPM || isAM) {
          const [hours, minutes = '00'] = normalized.split(':');
          let hour24 = parseInt(hours, 10);
          if (isPM && hour24 !== 12) hour24 += 12;
          if (isAM && hour24 === 12) hour24 = 0;
          normalized = `${hour24.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
        
        // Ensure format is HH:MM
        if (!normalized.includes(':')) {
          return '00:00';
        }
        
        return normalized;
      };

      const normalizedReminderTime = normalizeTime(state.kickOffReminderTime);
      const normalizedKickoffTime = normalizeTime(state.kickOffTime);

      const reminderDateTime = combineDateAndTime(
        state.kickOffReminderDate,
        normalizedReminderTime
      );
      const kickOffDateTime = combineDateAndTime(
        state.kickOffDate,
        normalizedKickoffTime
      );
      
      const reminder = new Date(reminderDateTime);
      const kickOff = new Date(kickOffDateTime);
      const now = new Date();
      
      if (isNaN(reminder.getTime()) || isNaN(kickOff.getTime())) {
        errors.kickOffReminderDate = 'Invalid kickoff reminder date and time format';
        errors.kickOffReminderTime = 'Invalid kickoff reminder date and time format';
      } else {
        // Validate reminder date is not in the past
        if (reminder <= now) {
          const errorMessage = 'Kickoff reminder date and time cannot be in the past. All updated dates must be future dates.';
          errors.kickOffReminderDate = errorMessage;
          errors.kickOffReminderTime = errorMessage;
        } else if (reminder >= kickOff) {
          const errorMessage = 'Kickoff reminder must be before kickoff time';
          errors.kickOffReminderDate = errorMessage;
          errors.kickOffReminderTime = errorMessage;
        }
      }
    }
  }

  // Validate regression slots (required, must have at least one element)
  if (!state.regressionBuildSlots || !Array.isArray(state.regressionBuildSlots) || state.regressionBuildSlots.length === 0) {
    errors.regressionBuildSlots = 'At least one regression slot is required. Please add regression build slots to proceed.';
  } else {
    // Validate slot dates if kickoff and target release dates are available
    if (state.kickOffDate && state.targetReleaseDate) {
      // Combine date and time for accurate comparison
      const kickOffDateTime = combineDateAndTime(
        state.kickOffDate,
        state.kickOffTime || '00:00'
      );
      const targetReleaseDateTime = combineDateAndTime(
        state.targetReleaseDate,
        state.targetReleaseTime || '00:00'
      );
      
      const kickOff = new Date(kickOffDateTime);
      const targetRelease = new Date(targetReleaseDateTime);

      state.regressionBuildSlots.forEach((slot, index) => {
        const slotNumber = index + 1;
        const slotDate = new Date(slot.date);
        if (isNaN(slotDate.getTime())) {
          errors[`slot-${slotNumber}`] = `Slot ${slotNumber}:|Invalid slot date format`;
        } else {
          if (slotDate <= kickOff) {
            errors[`slot-${slotNumber}`] = `Slot ${slotNumber}:|Slot date and time must be after kickoff date and time`;
          }
          if (slotDate >= targetRelease) {
            errors[`slot-${slotNumber}`] = `Slot ${slotNumber}:|Slot date and time must be before target release date and time`;
          }
        }
      });
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

