/**
 * Release Creation Validation Utilities
 * 
 * Validates release creation state before submission.
 * No 'any' or 'unknown' types - all explicitly typed.
 */

import type { ReleaseCreationState, ValidationResult } from '~/types/release-creation-backend';
import { combineDateAndTime } from './release-creation-converter';

/**
 * Validate release creation state
 * Returns validation result with errors for each invalid field
 */
export function validateReleaseCreationState(
  state: Partial<ReleaseCreationState>
): ValidationResult {
  const errors: Record<string, string> = {};

  // Required fields validation
  if (!state.type) {
    errors.type = 'Release type is required';
  } else if (!['MAJOR', 'MINOR', 'HOTFIX'].includes(state.type)) {
    errors.type = 'Release type must be MAJOR, MINOR, or HOTFIX';
  }

  if (!state.platformTargets || state.platformTargets.length === 0) {
    errors.platformTargets = 'At least one platform target must be selected';
  } else {
    // Validate each platform target
    state.platformTargets.forEach((pt, index) => {
      if (!pt.platform || !pt.target || !pt.version) {
        errors[`platformTargets[${index}]`] = 'Platform, target, and version are required';
      } else {
        // Validate platform
        if (!['ANDROID', 'IOS', 'WEB'].includes(pt.platform)) {
          errors[`platformTargets[${index}].platform`] = `Invalid platform: ${pt.platform}`;
        }

        // Validate target
        if (!['PLAY_STORE', 'APP_STORE', 'WEB'].includes(pt.target)) {
          errors[`platformTargets[${index}].target`] = `Invalid target: ${pt.target}`;
        }

        // Validate version format (vX.Y.Z or X.Y.Z)
        const versionTrimmed = (pt.version || '').trim();
        if (!versionTrimmed) {
          errors[`version-${pt.target}`] = 'Version is required';
          errors[`platformTargets[${index}].version`] = 'Version is required';
        } else if (!/^v?\d+\.\d+\.\d+/.test(versionTrimmed)) {
          errors[`version-${pt.target}`] = `Invalid version format. Expected: v1.0.0 or 1.0.0`;
          errors[`platformTargets[${index}].version`] = `Invalid version format. Expected: v1.0.0 or 1.0.0`;
        }

        // Validate platform-target combinations
        if (pt.platform === 'ANDROID' && pt.target !== 'PLAY_STORE') {
          errors[`platformTargets[${index}]`] = 'ANDROID platform must target PLAY_STORE';
        }
        if (pt.platform === 'IOS' && pt.target !== 'APP_STORE') {
          errors[`platformTargets[${index}]`] = 'IOS platform must target APP_STORE';
        }
        if (pt.platform === 'WEB' && pt.target !== 'WEB') {
          errors[`platformTargets[${index}]`] = 'WEB platform must target WEB';
        }
      }
    });
  }

  if (!state.releaseConfigId) {
    errors.releaseConfigId = 'Release configuration ID is required';
  }

  if (!state.baseBranch) {
    errors.baseBranch = 'Base branch is required';
  }

  if (!state.branch || state.branch.trim() === '') {
    errors.branch = 'Release branch name is required';
  }

  // Date validation
  if (!state.kickOffDate) {
    errors.kickOffDate = 'Kickoff date is required';
  } else {
    const kickOff = new Date(state.kickOffDate);
    if (isNaN(kickOff.getTime())) {
      errors.kickOffDate = 'Invalid kickoff date format';
    } else {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (kickOff < now) {
        errors.kickOffDate = 'Kickoff date cannot be in the past';
      }
    }
  }

  if (!state.targetReleaseDate) {
    errors.targetReleaseDate = 'Target release date is required';
  } else {
    const targetRelease = new Date(state.targetReleaseDate);
    if (isNaN(targetRelease.getTime())) {
      errors.targetReleaseDate = 'Invalid target release date format';
    } else {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (targetRelease < now) {
        errors.targetReleaseDate = 'Target release date cannot be in the past';
      }

      // Validate target release date is after kickoff date (including time)
      if (state.kickOffDate) {
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

  // Kickoff time is required
  if (!state.kickOffTime) {
    errors.kickOffTime = 'Kickoff time is required';
  }

  // Validate kickoff reminder date and time (if provided)
  if (state.kickOffReminderDate || state.kickOffReminderTime) {
    // Both date and time should be provided together
    if (!state.kickOffReminderDate) {
      errors.kickOffReminderDate = 'Kickoff reminder date is required when reminder time is set';
    }
    if (!state.kickOffReminderTime) {
      errors.kickOffReminderTime = 'Kickoff reminder time is required when reminder date is set';
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
      
      if (isNaN(reminder.getTime()) || isNaN(kickOff.getTime())) {
        errors.kickOffReminderDate = 'Invalid kickoff reminder date and time format';
        errors.kickOffReminderTime = 'Invalid kickoff reminder date and time format';
      } else if (reminder >= kickOff) {
        const errorMessage = 'Kickoff reminder must be before kickoff time';
        errors.kickOffReminderDate = errorMessage;
        errors.kickOffReminderTime = errorMessage;
      }
    }
  }

  // Validate regression slots if provided
  if (state.regressionBuildSlots && state.regressionBuildSlots.length > 0) {
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
        const slotDate = new Date(slot.date);
        if (isNaN(slotDate.getTime())) {
          errors[`regressionBuildSlots[${index}].date`] = 'Invalid slot date format';
        } else {
          if (slotDate <= kickOff) {
            errors[`regressionBuildSlots[${index}].date`] = 'Slot date and time must be after kickoff date and time';
          }
          if (slotDate >= targetRelease) {
            errors[`regressionBuildSlots[${index}].date`] = 'Slot date and time must be before target release date and time';
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

