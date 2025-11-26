/**
 * Release Creation Validation Utilities
 * 
 * Validates release creation state before submission.
 * No 'any' or 'unknown' types - all explicitly typed.
 */

import type { ReleaseCreationState, ValidationResult } from '~/types/release-creation-backend';

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
  } else if (!['PLANNED', 'HOTFIX', 'UNPLANNED'].includes(state.type)) {
    errors.type = 'Release type must be PLANNED, HOTFIX, or UNPLANNED';
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

        // Validate version format (vX.Y.Z)
        if (!/^v?\d+\.\d+\.\d+/.test(pt.version)) {
          errors[`platformTargets[${index}].version`] = `Invalid version format: ${pt.version}. Expected: vX.Y.Z`;
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

      // Validate target release date is after kickoff date
      if (state.kickOffDate) {
        const kickOff = new Date(state.kickOffDate);
        if (targetRelease <= kickOff) {
          errors.targetReleaseDate = 'Target release date must be after kickoff date';
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

  // Validate regression slots if provided
  if (state.regressionBuildSlots && state.regressionBuildSlots.length > 0) {
    if (state.kickOffDate && state.targetReleaseDate) {
      const kickOff = new Date(state.kickOffDate);
      const targetRelease = new Date(state.targetReleaseDate);

      state.regressionBuildSlots.forEach((slot, index) => {
        const slotDate = new Date(slot.date);
        if (isNaN(slotDate.getTime())) {
          errors[`regressionBuildSlots[${index}].date`] = 'Invalid slot date format';
        } else {
          if (slotDate < kickOff) {
            errors[`regressionBuildSlots[${index}].date`] = 'Slot date must be after kickoff date';
          }
          if (slotDate > targetRelease) {
            errors[`regressionBuildSlots[${index}].date`] = 'Slot date must be before target release date';
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

