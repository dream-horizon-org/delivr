/**
 * Release Management Validation Functions
 * 
 * Validates release creation requests before processing
 * Follows cursorrules: No 'any' types - use explicit types
 */

import type { CreateReleaseRequestBody } from '~types/release';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates mandatory fields for release creation
 */
export const validateMandatoryFields = (body: CreateReleaseRequestBody): ValidationResult => {
  const mandatoryFields: Array<keyof CreateReleaseRequestBody> = [
    'releaseConfigId',
    'platformTargets',
    'type',
    'baseBranch',
    'kickOffDate',
    'targetReleaseDate'
  ];

  const missingFields = mandatoryFields.filter(field => {
    const value = body[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }

  return { isValid: true };
};

/**
 * Validates platformTargets format and content
 */
export const validatePlatformTargets = (body: CreateReleaseRequestBody): ValidationResult => {
  // Check if platformTargets is an array
  if (!Array.isArray(body.platformTargets)) {
    return {
      isValid: false,
      error: 'platformTargets must be an array'
    };
  }

  // Check if array is not empty
  if (body.platformTargets.length === 0) {
    return {
      isValid: false,
      error: 'platformTargets must be a non-empty array'
    };
  }

  const validPlatforms = ['IOS', 'ANDROID', 'WEB'];
  const validTargets = ['WEB', 'PLAY_STORE', 'APP_STORE'];

  // Validate each platform-target pair
  for (const pt of body.platformTargets) {
    // Check required fields
    if (!pt.platform || !pt.target || !pt.version) {
      return {
        isValid: false,
        error: 'Each platformTarget must have platform, target, and version fields'
      };
    }

    // Validate platform
    if (!validPlatforms.includes(pt.platform)) {
      return {
        isValid: false,
        error: `Invalid platform: ${pt.platform}. Must be one of: ${validPlatforms.join(', ')}`
      };
    }

    // Validate target
    if (!validTargets.includes(pt.target)) {
      return {
        isValid: false,
        error: `Invalid target: ${pt.target}. Must be one of: ${validTargets.join(', ')}`
      };
    }

    // Validate version format (vX.Y.Z)
    if (typeof pt.version !== 'string' || !/^v?\d+\.\d+\.\d+/.test(pt.version)) {
      return {
        isValid: false,
        error: `Invalid version format for ${pt.platform}-${pt.target}. Expected format: vX.Y.Z (e.g., v1.0.0)`
      };
    }
  }

  return { isValid: true };
};

/**
 * Validates date fields
 */
export const validateDates = (body: CreateReleaseRequestBody): ValidationResult => {
  const now = new Date();
  
  // Validate kickOffDate
  if (body.kickOffDate) {
    const kickOffDate = new Date(body.kickOffDate);
    
    if (isNaN(kickOffDate.getTime())) {
      return {
        isValid: false,
        error: 'Invalid kickOffDate format'
      };
    }

    if (kickOffDate < now) {
      return {
        isValid: false,
        error: 'kickOffDate cannot be in the past'
      };
    }
  }

  // Validate targetReleaseDate
  if (body.targetReleaseDate) {
    const targetReleaseDate = new Date(body.targetReleaseDate);
    
    if (isNaN(targetReleaseDate.getTime())) {
      return {
        isValid: false,
        error: 'Invalid targetReleaseDate format'
      };
    }

    if (targetReleaseDate < now) {
      return {
        isValid: false,
        error: 'targetReleaseDate cannot be in the past'
      };
    }

    // Validate targetReleaseDate is after kickOffDate
    if (body.kickOffDate) {
      const kickOffDate = new Date(body.kickOffDate);
      if (targetReleaseDate <= kickOffDate) {
        return {
          isValid: false,
          error: 'targetReleaseDate must be after kickOffDate'
        };
      }
    }
  }

  // Validate kickOffReminderDate (optional)
  if (body.kickOffReminderDate) {
    const kickOffReminderDate = new Date(body.kickOffReminderDate);
    
    if (isNaN(kickOffReminderDate.getTime())) {
      return {
        isValid: false,
        error: 'Invalid kickOffReminderDate format'
      };
    }
  }

  return { isValid: true };
};

/**
 * Validates release type
 */
export const validateType = (body: CreateReleaseRequestBody): ValidationResult => {
  const validTypes = ['PLANNED', 'HOTFIX', 'UNPLANNED'];
  
  if (!validTypes.includes(body.type)) {
    return {
      isValid: false,
      error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
    };
  }

  return { isValid: true };
};

/**
 * Validates regression build slots
 */
export const validateRegressionBuildSlots = (body: CreateReleaseRequestBody): ValidationResult => {
  if (!body.regressionBuildSlots) {
    return { isValid: true };
  }

  if (!Array.isArray(body.regressionBuildSlots)) {
    return {
      isValid: false,
      error: 'regressionBuildSlots must be an array'
    };
  }

  for (const slot of body.regressionBuildSlots) {
    if (!slot.date || isNaN(new Date(slot.date).getTime())) {
      return {
        isValid: false,
        error: 'Each regressionBuildSlots entry must have a valid date'
      };
    }
  }

  return { isValid: true };
};

/**
 * Validates pre-created builds
 */
export const validatePreCreatedBuilds = (body: CreateReleaseRequestBody): ValidationResult => {
  if (!body.preCreatedBuilds) {
    return { isValid: true };
  }

  if (!Array.isArray(body.preCreatedBuilds)) {
    return {
      isValid: false,
      error: 'preCreatedBuilds must be an array'
    };
  }

  for (const build of body.preCreatedBuilds) {
    if (!build.platform || !build.target || !build.buildNumber || !build.buildUrl) {
      return {
        isValid: false,
        error: 'Each preCreatedBuilds entry must have platform, target, buildNumber, and buildUrl'
      };
    }
  }

  return { isValid: true };
};

/**
 * Master validation function that runs all validations
 */
export const validateCreateReleaseRequest = (body: CreateReleaseRequestBody): ValidationResult => {
  // Run all validations in sequence
  const validations = [
    validateMandatoryFields(body),
    validatePlatformTargets(body),
    validateDates(body),
    validateType(body),
    validateRegressionBuildSlots(body),
    validatePreCreatedBuilds(body)
  ];

  // Return the first validation that fails
  for (const validation of validations) {
    if (!validation.isValid) {
      return validation;
    }
  }

  return { isValid: true };
};

