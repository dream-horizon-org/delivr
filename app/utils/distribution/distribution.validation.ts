/**
 * Distribution Form Validation
 * 
 * Pure validation functions for distribution forms.
 * Used by useForm() validate config.
 */

import {
  MAX_ROLLOUT_PERCENT,
  MIN_ROLLOUT_PERCENT,
  IN_APP_UPDATE_PRIORITY_MAX,
  IN_APP_UPDATE_PRIORITY_MIN,
} from '~/constants/distribution/distribution.constants';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates rollout percentage (0-100)
 */
export function validateRolloutPercentage(value: unknown): string | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'Rollout percentage is required';
  }
  if (value < MIN_ROLLOUT_PERCENT || value > MAX_ROLLOUT_PERCENT) {
    return `Must be between ${MIN_ROLLOUT_PERCENT}% and ${MAX_ROLLOUT_PERCENT}%`;
  }
  return null;
}

/**
 * Validates in-app update priority (0-5)
 */
export function validateInAppUpdatePriority(value: unknown): string | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'Priority is required';
  }
  if (value < IN_APP_UPDATE_PRIORITY_MIN || value > IN_APP_UPDATE_PRIORITY_MAX) {
    return `Must be between ${IN_APP_UPDATE_PRIORITY_MIN} and ${IN_APP_UPDATE_PRIORITY_MAX}`;
  }
  return null;
}

/**
 * Validates release notes (non-empty)
 */
export function validateReleaseNotes(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Release notes are required';
  }
  return null;
}

/**
 * Validates reason field (non-empty)
 */
export function validateReason(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Reason is required';
  }
  return null;
}

// ============================================================================
// FORM VALIDITY CHECKS
// ============================================================================

/**
 * Check if Android promotion form is valid
 */
export function isAndroidPromoteFormValid(values: {
  rolloutPercentage: number;
  inAppUpdatePriority: number;
  releaseNotes: string;
}): boolean {
  return (
    validateRolloutPercentage(values.rolloutPercentage) === null &&
    validateInAppUpdatePriority(values.inAppUpdatePriority) === null &&
    validateReleaseNotes(values.releaseNotes) === null
  );
}

/**
 * Check if iOS promotion form is valid
 */
export function isIOSPromoteFormValid(values: {
  releaseNotes: string;
}): boolean {
  return validateReleaseNotes(values.releaseNotes) === null;
}

