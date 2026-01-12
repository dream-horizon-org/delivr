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
 * Combine date and time in a specific timezone and convert to UTC
 * @param dateStr - Date string (ISO format or YYYY-MM-DD)
 * @param timeStr - Time string in HH:mm format
 * @param timezone - IANA timezone string (e.g., 'Asia/Kolkata')
 * @returns Date object in UTC
 */
function combineDateAndTimeInTimezone(
  dateStr: string,
  timeStr: string,
  timezone: string
): Date {
  // Extract date part (YYYY-MM-DD)
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // We need to find the UTC time that, when displayed in the target timezone,
  // gives us our desired local time (year-month-day hours:minutes).
  // Strategy: Use iterative adjustment to find the correct UTC time
  
  // Start with a UTC date using the target values as an initial guess
  let testUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  
  // Use Intl to format this UTC time in the target timezone
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  // Iterate to find the correct UTC time (max 3 iterations to handle DST transitions)
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(testUtc);
    const tzYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const tzMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
    const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const tzMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    
    // Check if we've found the correct time
    if (tzYear === year && tzMonth === month && tzDay === day && 
        tzHour === hours && tzMinute === minutes) {
      return testUtc;
    }
    
    // Calculate the difference
    const targetTotalMinutes = hours * 60 + minutes;
    const actualTotalMinutes = tzHour * 60 + tzMinute;
    let diffMinutes = targetTotalMinutes - actualTotalMinutes;
    
    // Account for day/month/year differences
    if (tzDay !== day || tzMonth !== month || tzYear !== year) {
      const targetDate = new Date(Date.UTC(year, month - 1, day));
      const actualDate = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay));
      const dayDiff = Math.floor((targetDate.getTime() - actualDate.getTime()) / (1000 * 60 * 60 * 24));
      diffMinutes += dayDiff * 24 * 60;
    }
    
    // Adjust the UTC time
    testUtc = new Date(testUtc.getTime() + diffMinutes * 60 * 1000);
  }
  
  // Return the best approximation after iterations
  return testUtc;
}

/**
 * Validate scheduling configuration (matches backend validateScheduling)
 * Returns array of validation errors
 * @param scheduling - The scheduling configuration to validate
 * @param isEditMode - If true, skips future date validation for firstReleaseKickoffDate
 */
export function validateScheduling(
  scheduling: SchedulingConfig,
  isEditMode: boolean = false
): ValidationError[] {
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
  } else {
    // Validate that first release kickoff date + time is in the future
    // Only apply this validation when creating (not editing) a config
    if (!isEditMode) {
      try {
        // If we have kickoffTime and timezone, validate the full datetime
        if (scheduling.kickoffTime && scheduling.timezone) {
          const kickoffDateTime = combineDateAndTimeInTimezone(
            scheduling.firstReleaseKickoffDate,
            scheduling.kickoffTime,
            scheduling.timezone
          );
          const now = new Date(); // Current UTC time
          
          if (kickoffDateTime <= now) {
            errors.push({
              field: 'firstReleaseKickoffDate',
              message: 'First release kickoff date and time must be in the future'
            });
          }
        } else {
          // Fallback: just check if date is today or in the past (using UTC for consistency)
          const kickoffDate = new Date(scheduling.firstReleaseKickoffDate);
          const now = new Date();
          const kickoffDateOnly = new Date(Date.UTC(
            kickoffDate.getUTCFullYear(),
            kickoffDate.getUTCMonth(),
            kickoffDate.getUTCDate()
          ));
          const todayOnly = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
          ));
          
          if (kickoffDateOnly <= todayOnly) {
            errors.push({
              field: 'firstReleaseKickoffDate',
              message: 'First release kickoff date must be in the future'
            });
          }
        }
      } catch (error) {
        // Invalid date format - will be caught by other validations
      }
    }
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
  } else if (scheduling.kickoffReminderEnabled === true) {
    // Only require kickoffReminderTime if kickoffReminderEnabled is true
    if (!scheduling.kickoffReminderTime) {
      errors.push({
        field: 'kickoffReminderTime',
        message: 'Kickoff reminder time is required when kickoff reminder is enabled'
      });
    }
  }

  if (!scheduling.timezone) {
    errors.push({
      field: 'timezone',
      message: 'Timezone is required'
    });
  }

  // Validate initialVersions (array format)
  if (!scheduling.initialVersions || !Array.isArray(scheduling.initialVersions)) {
    errors.push({
      field: 'initialVersions',
      message: 'Initial versions array is required'
    });
  } else if (scheduling.initialVersions.length === 0) {
    errors.push({
      field: 'initialVersions',
      message: 'At least one platform version must be specified'
    });
  } else {
    // Validate each initial version entry
    scheduling.initialVersions.forEach((item, index) => {
      if (!item.platform || !item.target || !item.version) {
        errors.push({
          field: `initialVersions[${index}]`,
          message: 'Each initial version must have platform, target, and version'
        });
      } else {
        const version = item.version;
        if (typeof version !== 'string' || version.trim() === '') {
          errors.push({
            field: `initialVersions[${index}].version`,
            message: `Version must be a non-empty string`
          });
        } else {
          // Validate strict semantic version format (X.Y.Z only, no prefix/suffix)
          const versionTrimmed = version.trim();
          if (!/^\d+\.\d+\.\d+$/.test(versionTrimmed)) {
            errors.push({
              field: `initialVersions[${index}].version`,
              message: `Invalid version format. Expected: 1.0.0 (no prefix or suffix)`
            });
          }
        }
      }
    });
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

  // Validate regressionSlots (required, must have at least one element)
  if (scheduling.regressionSlots === undefined || scheduling.regressionSlots === null) {
    errors.push({
      field: 'regressionSlots',
      message: 'Regression slots are required'
    });
  } else if (!Array.isArray(scheduling.regressionSlots)) {
    errors.push({
      field: 'regressionSlots',
      message: 'Regression slots must be an array'
    });
  } else if (scheduling.regressionSlots.length === 0) {
    errors.push({
      field: 'regressionSlots',
      message: 'At least one regression slot must be specified'
    });
  }

  // ========================================================================
  // BUSINESS RULES VALIDATION (Phase 2 - only if basic validation passes)
  // ========================================================================
  
  if (errors.length === 0) {
    // Rule: kickoffReminderTime should be <= kickoffTime (only validate if reminder is enabled)
    if (scheduling.kickoffReminderEnabled === true && scheduling.kickoffReminderTime && scheduling.kickoffTime) {
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
    // Note: regressionBuilds flag removed from UI but kept in data structure for backward compatibility
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

