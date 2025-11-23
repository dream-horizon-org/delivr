/**
 * Frontend Scheduling Validation
 * Mirrors backend validation logic from:
 * api/script/services/release-configs/release-config.validation.ts
 */

import type { SchedulingConfig, RegressionSlot } from '~/types/release-config';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Convert time string (HH:mm) to minutes for comparison
 */
const timeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Validate scheduling configuration (matches backend validateScheduling)
 * Returns array of validation errors
 */
export function validateScheduling(scheduling: SchedulingConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // ========================================================================
  // REQUIRED FIELDS VALIDATION (Phase 1)
  // ========================================================================

  if (!scheduling.releaseFrequency) {
    errors.push({
      field: 'releaseFrequency',
      message: 'Release frequency is required'
    });
  }

  if (!scheduling.firstReleaseKickoffDate || scheduling.firstReleaseKickoffDate.trim() === '') {
    errors.push({
      field: 'firstReleaseKickoffDate',
      message: 'First release kickoff date is required'
    });
  }

  if (!scheduling.kickoffReminderTime) {
    errors.push({
      field: 'kickoffReminderTime',
      message: 'Kickoff reminder time is required'
    });
  }

  if (!scheduling.kickoffTime) {
    errors.push({
      field: 'kickoffTime',
      message: 'Kickoff time is required'
    });
  }

  if (!scheduling.targetReleaseTime) {
    errors.push({
      field: 'targetReleaseTime',
      message: 'Target release time is required'
    });
  }

  if (scheduling.targetReleaseDateOffsetFromKickoff === undefined || 
      scheduling.targetReleaseDateOffsetFromKickoff === null) {
    errors.push({
      field: 'targetReleaseDateOffsetFromKickoff',
      message: 'Target release date offset from kickoff is required'
    });
  }

  if (scheduling.kickoffReminderEnabled === undefined || 
      scheduling.kickoffReminderEnabled === null) {
    errors.push({
      field: 'kickoffReminderEnabled',
      message: 'Kickoff reminder enabled flag is required'
    });
  }

  if (!scheduling.timezone) {
    errors.push({
      field: 'timezone',
      message: 'Timezone is required'
    });
  }

  // Validate initialVersions
  if (!scheduling.initialVersions || typeof scheduling.initialVersions !== 'object') {
    errors.push({
      field: 'initialVersions',
      message: 'Initial versions object is required'
    });
  } else {
    const platforms = Object.keys(scheduling.initialVersions);
    if (platforms.length === 0) {
      errors.push({
        field: 'initialVersions',
        message: 'At least one platform version must be specified'
      });
    } else {
      // Validate each platform version
      platforms.forEach(platform => {
        const version = scheduling.initialVersions[platform as keyof typeof scheduling.initialVersions];
        if (!version || typeof version !== 'string' || version.trim() === '') {
          errors.push({
            field: `initialVersions.${platform}`,
            message: `Version for platform ${platform} must be a non-empty string`
          });
        }
      });
    }
  }

  // Validate workingDays
  if (!scheduling.workingDays || !Array.isArray(scheduling.workingDays)) {
    errors.push({
      field: 'workingDays',
      message: 'Working days array is required'
    });
  } else if (scheduling.workingDays.length === 0) {
    errors.push({
      field: 'workingDays',
      message: 'At least one working day must be specified'
    });
  }

  // Validate regressionSlots if present (optional field)
  if (scheduling.regressionSlots !== undefined && scheduling.regressionSlots !== null) {
    if (!Array.isArray(scheduling.regressionSlots)) {
      errors.push({
        field: 'regressionSlots',
        message: 'Regression slots must be an array if provided'
      });
    }
  }

  // ========================================================================
  // BUSINESS RULES VALIDATION (Phase 2 - only if basic validation passes)
  // ========================================================================
  
  if (errors.length === 0) {
    // Rule: kickoffReminderTime should be <= kickoffTime
    if (scheduling.kickoffReminderTime && scheduling.kickoffTime) {
      if (timeToMinutes(scheduling.kickoffReminderTime) > timeToMinutes(scheduling.kickoffTime)) {
        errors.push({
          field: 'kickoffReminderTime',
          message: 'Kickoff reminder time must be less than or equal to kickoff time'
        });
      }
    }

    // Rule: targetReleaseDateOffsetFromKickoff should be >= 0
    if (scheduling.targetReleaseDateOffsetFromKickoff < 0) {
      errors.push({
        field: 'targetReleaseDateOffsetFromKickoff',
        message: 'Target release date offset from kickoff must be greater than or equal to 0'
      });
    }

    // Validate working days are valid (1-7)
    if (scheduling.workingDays) {
      scheduling.workingDays.forEach((day, index) => {
        if (day < 1 || day > 7) {
          errors.push({
            field: `workingDays[${index}]`,
            message: 'Working day must be between 1 (Monday) and 7 (Sunday)'
          });
        }
      });
    }

    // Validate regression slots
    if (scheduling.regressionSlots && Array.isArray(scheduling.regressionSlots)) {
      scheduling.regressionSlots.forEach((slot, index) => {
        const slotErrors = validateRegressionSlot(slot, index, scheduling);
        errors.push(...slotErrors);
      });
    }
  }

  return errors;
}

/**
 * Validate individual regression slot (matches backend validateRegressionSlot)
 */
function validateRegressionSlot(
  slot: RegressionSlot,
  index: number,
  scheduling: SchedulingConfig
): ValidationError[] {
  const errors: ValidationError[] = [];
  const fieldPrefix = `regressionSlots[${index}]`;

  // ========================================================================
  // REQUIRED FIELDS
  // ========================================================================

  if (slot.regressionSlotOffsetFromKickoff === undefined || 
      slot.regressionSlotOffsetFromKickoff === null) {
    errors.push({
      field: `${fieldPrefix}.regressionSlotOffsetFromKickoff`,
      message: 'Regression slot offset from kickoff is required'
    });
  }

  if (!slot.time) {
    errors.push({
      field: `${fieldPrefix}.time`,
      message: 'Regression slot time is required'
    });
  }

  if (!slot.config) {
    errors.push({
      field: `${fieldPrefix}.config`,
      message: 'Regression slot config is required'
    });
  } else {
    // Validate config object properties (all boolean flags are required)
    if (slot.config.regressionBuilds === undefined || slot.config.regressionBuilds === null) {
      errors.push({
        field: `${fieldPrefix}.config.regressionBuilds`,
        message: 'Regression builds flag is required'
      });
    }

    if (slot.config.postReleaseNotes === undefined || slot.config.postReleaseNotes === null) {
      errors.push({
        field: `${fieldPrefix}.config.postReleaseNotes`,
        message: 'Post release notes flag is required'
      });
    }

    if (slot.config.automationBuilds === undefined || slot.config.automationBuilds === null) {
      errors.push({
        field: `${fieldPrefix}.config.automationBuilds`,
        message: 'Automation builds flag is required'
      });
    }

    if (slot.config.automationRuns === undefined || slot.config.automationRuns === null) {
      errors.push({
        field: `${fieldPrefix}.config.automationRuns`,
        message: 'Automation runs flag is required'
      });
    }
  }

  // ========================================================================
  // BUSINESS RULES (only if basic validation passes)
  // ========================================================================
  
  if (errors.length === 0) {
    // Rule: regressionSlotOffsetFromKickoff should be <= targetReleaseDateOffsetFromKickoff
    if (slot.regressionSlotOffsetFromKickoff > scheduling.targetReleaseDateOffsetFromKickoff) {
      errors.push({
        field: `${fieldPrefix}.regressionSlotOffsetFromKickoff`,
        message: 'Regression slot offset must be less than or equal to target release date offset from kickoff'
      });
    }

    // Rule: time should be <= targetReleaseTime if regressionSlotOffsetFromKickoff == targetReleaseDateOffsetFromKickoff
    if (slot.regressionSlotOffsetFromKickoff === scheduling.targetReleaseDateOffsetFromKickoff) {
      if (slot.time && scheduling.targetReleaseTime) {
        if (timeToMinutes(slot.time) > timeToMinutes(scheduling.targetReleaseTime)) {
          errors.push({
            field: `${fieldPrefix}.time`,
            message: 'Regression slot time must be less than or equal to target release time when on the same day as release'
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string[] {
  return errors.map(error => {
    // Make field names more user-friendly
    const fieldName = error.field
      .replace(/([A-Z])/g, ' $1')
      .replace(/\./g, ' → ')
      .replace(/\[(\d+)\]/g, ' #$1')
      .toLowerCase()
      .trim();
    
    return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}: ${error.message}`;
  });
}

