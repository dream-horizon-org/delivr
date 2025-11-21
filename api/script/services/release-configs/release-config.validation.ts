/**
 * Business logic validation for release configs
 */

import type { 
  CreateReleaseConfigDto, 
  ReleaseScheduling, 
  RegressionSlot,
  FieldValidationError 
} from '~types/release-configs';

/**
 * Check if config has at least one integration configured
 * This is a business rule validation that happens after integration processing
 */
export const hasAtLeastOneIntegration = (config: Partial<CreateReleaseConfigDto>): boolean => {
  // Check all integration configs
  const hasScm = config.sourceCodeManagementConfigId !== undefined && config.sourceCodeManagementConfigId !== null;
  const hasCi = config.ciConfigId !== undefined && config.ciConfigId !== null;
  const hasTcm = config.testManagementConfigId !== undefined && config.testManagementConfigId !== null;
  const hasProjectMgmt = config.projectManagementConfigId !== undefined && config.projectManagementConfigId !== null;
  const hasComms = config.commsConfigId !== undefined && config.commsConfigId !== null;
  
  return hasScm || hasCi || hasTcm || hasProjectMgmt || hasComms;
};

/**
 * Validate scheduling configuration
 * All fields are mandatory except 'name' in regression slots
 */
export const validateScheduling = (scheduling: ReleaseScheduling): FieldValidationError[] => {
  const errors: FieldValidationError[] = [];

  // Validate required fields
  if (!scheduling.releaseFrequency) {
    errors.push({
      field: 'scheduling.releaseFrequency',
      message: 'Release frequency is required'
    });
  }

  if (!scheduling.firstReleaseKickoffDate) {
    errors.push({
      field: 'scheduling.firstReleaseKickoffDate',
      message: 'First release kickoff date is required'
    });
  }

  if (!scheduling.kickoffReminderTime) {
    errors.push({
      field: 'scheduling.kickoffReminderTime',
      message: 'Kickoff reminder time is required'
    });
  }

  if (!scheduling.kickoffTime) {
    errors.push({
      field: 'scheduling.kickoffTime',
      message: 'Kickoff time is required'
    });
  }

  if (!scheduling.targetReleaseTime) {
    errors.push({
      field: 'scheduling.targetReleaseTime',
      message: 'Target release time is required'
    });
  }

  if (scheduling.targetReleaseDateOffsetFromKickoff === undefined || scheduling.targetReleaseDateOffsetFromKickoff === null) {
    errors.push({
      field: 'scheduling.targetReleaseDateOffsetFromKickoff',
      message: 'Target release date offset from kickoff is required'
    });
  }

  if (scheduling.kickoffReminderEnabled === undefined || scheduling.kickoffReminderEnabled === null) {
    errors.push({
      field: 'scheduling.kickoffReminderEnabled',
      message: 'Kickoff reminder enabled flag is required'
    });
  }

  if (!scheduling.timezone) {
    errors.push({
      field: 'scheduling.timezone',
      message: 'Timezone is required'
    });
  }

  if (!scheduling.workingDays || !Array.isArray(scheduling.workingDays)) {
    errors.push({
      field: 'scheduling.workingDays',
      message: 'Working days array is required'
    });
  } else if (scheduling.workingDays.length === 0) {
    errors.push({
      field: 'scheduling.workingDays',
      message: 'At least one working day must be specified'
    });
  }

  if (!scheduling.regressionSlots || !Array.isArray(scheduling.regressionSlots)) {
    errors.push({
      field: 'scheduling.regressionSlots',
      message: 'Regression slots array is required'
    });
  }

  // Validate business rules if basic validation passes
  if (errors.length === 0) {
    // Rule: kickoffReminderTime should be <= kickoffTime
    if (scheduling.kickoffReminderTime && scheduling.kickoffTime) {
      if (timeStringToMinutes(scheduling.kickoffReminderTime) > timeStringToMinutes(scheduling.kickoffTime)) {
        errors.push({
          field: 'scheduling.kickoffReminderTime',
          message: 'Kickoff reminder time must be less than or equal to kickoff time'
        });
      }
    }

    // Rule: targetReleaseDateOffsetFromKickoff should be >= 0
    if (scheduling.targetReleaseDateOffsetFromKickoff < 0) {
      errors.push({
        field: 'scheduling.targetReleaseDateOffsetFromKickoff',
        message: 'Target release date offset from kickoff must be greater than or equal to 0'
      });
    }

    // Validate working days are valid (1-7)
    if (scheduling.workingDays) {
      scheduling.workingDays.forEach((day, index) => {
        if (day < 1 || day > 7) {
          errors.push({
            field: `scheduling.workingDays[${index}]`,
            message: 'Working day must be between 1 (Monday) and 7 (Sunday)'
          });
        }
      });
    }

    // Validate regression slots
    if (scheduling.regressionSlots) {
      scheduling.regressionSlots.forEach((slot, index) => {
        const slotErrors = validateRegressionSlot(slot, index, scheduling);
        errors.push(...slotErrors);
      });
    }
  }

  return errors;
};

/**
 * Validate individual regression slot
 */
const validateRegressionSlot = (
  slot: RegressionSlot, 
  index: number, 
  scheduling: ReleaseScheduling
): FieldValidationError[] => {
  const errors: FieldValidationError[] = [];
  const fieldPrefix = `scheduling.regressionSlots[${index}]`;

  // Validate required fields (name is optional)
  if (slot.regressionSlotOffsetFromKickoff === undefined || slot.regressionSlotOffsetFromKickoff === null) {
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
    // Validate config object properties
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

  // Validate business rules if basic validation passes
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
        if (timeStringToMinutes(slot.time) > timeStringToMinutes(scheduling.targetReleaseTime)) {
          errors.push({
            field: `${fieldPrefix}.time`,
            message: 'Regression slot time must be less than or equal to target release time when on the same day as release'
          });
        }
      }
    }
  }

  return errors;
};

/**
 * Convert time string (HH:mm) to minutes for comparison
 */
const timeStringToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};
