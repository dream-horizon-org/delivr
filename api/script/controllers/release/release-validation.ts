/**
 * Release Management Validation Functions
 * 
 * Validates release creation requests before processing
 * Follows cursorrules: No 'any' types - use explicit types
 */

import type { CreateReleaseRequestBody, UpdateReleaseRequestBody } from '~types/release';

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

  // Validate date sequence: kickOffReminderDate < kickOffDate < all regression dates < targetReleaseDate
  const sequenceValidation = validateDateSequence(body);
  if (!sequenceValidation.isValid) {
    return sequenceValidation;
  }

  return { isValid: true };
};

/**
 * Validates the logical sequence of datetimes in a release
 * Rule: kickOffReminderDate < kickOffDate < all regression slot datetimes < targetReleaseDate
 */
export const validateDateSequence = (body: CreateReleaseRequestBody): ValidationResult => {
  // Parse and validate datetime strings
  const kickOffReminderDate = body.kickOffReminderDate ? new Date(body.kickOffReminderDate) : null;
  const kickOffDate = body.kickOffDate ? new Date(body.kickOffDate) : null;
  const targetReleaseDate = body.targetReleaseDate ? new Date(body.targetReleaseDate) : null;
  
  // Validate that all dates are valid datetime objects
  if (kickOffReminderDate && isNaN(kickOffReminderDate.getTime())) {
    return { isValid: false, error: 'Invalid kickOffReminderDate datetime format' };
  }
  if (kickOffDate && isNaN(kickOffDate.getTime())) {
    return { isValid: false, error: 'Invalid kickOffDate datetime format' };
  }
  if (targetReleaseDate && isNaN(targetReleaseDate.getTime())) {
    return { isValid: false, error: 'Invalid targetReleaseDate datetime format' };
  }

  // Parse regression slot datetimes
  const regressionDates: Date[] = [];
  if (body.regressionBuildSlots) {
    for (const slot of body.regressionBuildSlots) {
      const regressionDate = new Date(slot.date);
      if (isNaN(regressionDate.getTime())) {
        return { isValid: false, error: `Invalid regression slot datetime format: ${slot.date}` };
      }
      regressionDates.push(regressionDate);
    }
  }

  // 1. kickOffReminderDate datetime < kickOffDate datetime
  if (kickOffReminderDate && kickOffDate) {
    if (kickOffReminderDate.getTime() >= kickOffDate.getTime()) {
      return {
        isValid: false,
        error: `kickOffReminderDate must be before kickOffDate. kickOffReminderDate: ${kickOffReminderDate.toISOString()}, kickOffDate: ${kickOffDate.toISOString()}`
      };
    }
  }

  // 2. kickOffDate datetime < all regression datetimes
  if (kickOffDate && regressionDates.length > 0) {
    for (const regressionDate of regressionDates) {
      if (regressionDate.getTime() <= kickOffDate.getTime()) {
        return {
          isValid: false,
          error: `All regression slot datetimes must be after kickOffDate. Found regression datetime ${regressionDate.toISOString()} which is not after kickOffDate ${kickOffDate.toISOString()}`
        };
      }
    }
  }

  // 3. all regression datetimes < targetReleaseDate datetime
  if (targetReleaseDate && regressionDates.length > 0) {
    for (const regressionDate of regressionDates) {
      if (regressionDate.getTime() >= targetReleaseDate.getTime()) {
        return {
          isValid: false,
          error: `All regression slot datetimes must be before targetReleaseDate. Found regression datetime ${regressionDate.toISOString()} which is not before targetReleaseDate ${targetReleaseDate.toISOString()}`
        };
      }
    }
  }

  // 4. kickOffDate datetime < targetReleaseDate datetime
  if (kickOffDate && targetReleaseDate) {
    if (kickOffDate.getTime() >= targetReleaseDate.getTime()) {
      return {
        isValid: false,
        error: `kickOffDate must be before targetReleaseDate. kickOffDate: ${kickOffDate.toISOString()}, targetReleaseDate: ${targetReleaseDate.toISOString()}`
      };
    }
  }

  return { isValid: true };
};

/**
 * Validates release type
 */
export const validateType = (body: CreateReleaseRequestBody): ValidationResult => {
  const validTypes = ['PLANNED', 'HOTFIX', 'MAJOR'];
  
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


// ============================================================================
// UPDATE RELEASE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates update release request body structure
 */
export const validateUpdateReleaseRequestBody = (body: UpdateReleaseRequestBody): ValidationResult => {
  if (!body || Object.keys(body).length === 0) {
    return {
      isValid: false,
      error: 'Request body cannot be empty'
    };
  }

  return { isValid: true };
};

/**
 * Validates date formats and future date requirements for update requests
 */
export const validateUpdateDates = (body: UpdateReleaseRequestBody): ValidationResult => {
  const now = new Date();
  const dateFields = [
    { field: 'kickOffReminderDate', value: body.kickOffReminderDate },
    { field: 'kickOffDate', value: body.kickOffDate },
    { field: 'targetReleaseDate', value: body.targetReleaseDate }
  ];

  for (const { field, value } of dateFields) {
    if (value !== undefined && value !== null) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return {
          isValid: false,
          error: `Invalid date format for ${field}`
        };
      }

      // All updated dates must be in the future
      if (date < now) {
        return {
          isValid: false,
          error: `${field} cannot be in the past. All updated dates must be future dates.`
        };
      }
    }
  }

  // Validate date relationships if both are provided
  if (body.kickOffDate && body.targetReleaseDate) {
    const kickOffDate = new Date(body.kickOffDate);
    const targetReleaseDate = new Date(body.targetReleaseDate);
    
    if (targetReleaseDate <= kickOffDate) {
      return {
        isValid: false,
        error: 'targetReleaseDate must be after kickOffDate'
      };
    }
  }

  if (body.kickOffReminderDate && body.kickOffDate) {
    const kickOffReminderDate = new Date(body.kickOffReminderDate);
    const kickOffDate = new Date(body.kickOffDate);
    
    if (kickOffReminderDate >= kickOffDate) {
      return {
        isValid: false,
        error: 'kickOffReminderDate must be before kickOffDate'
      };
    }
  }

  return { isValid: true };
};

/**
 * Validates release type for updates (reuses create validation logic)
 */
export const validateUpdateType = (body: UpdateReleaseRequestBody): ValidationResult => {
  if (body.type === undefined) {
    return { isValid: true };
  }

  const validTypes = ['PLANNED', 'HOTFIX', 'MAJOR'];
  
  if (!validTypes.includes(body.type)) {
    return {
      isValid: false,
      error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
    };
  }

  return { isValid: true };
};

/**
 * Validates platform target mappings structure for updates
 */
export const validateUpdatePlatformTargetMappings = (body: UpdateReleaseRequestBody): ValidationResult => {
  if (!body.platformTargetMappings) {
    return { isValid: true };
  }

  if (!Array.isArray(body.platformTargetMappings)) {
    return {
      isValid: false,
      error: 'platformTargetMappings must be an array'
    };
  }

  for (const mapping of body.platformTargetMappings) {
    if (!mapping.id || !mapping.platform || !mapping.target || !mapping.version) {
      return {
        isValid: false,
        error: 'Each platform target mapping must have id, platform, target, and version'
      };
    }

    // Validate platform values
    const validPlatforms = ['ANDROID', 'IOS', 'WEB'];
    if (!validPlatforms.includes(mapping.platform)) {
      return {
        isValid: false,
        error: `Invalid platform "${mapping.platform}". Must be one of: ${validPlatforms.join(', ')}`
      };
    }

    // Validate target values
    const validTargets = ['PLAY_STORE', 'APP_STORE', 'WEB'];
    if (!validTargets.includes(mapping.target)) {
      return {
        isValid: false,
        error: `Invalid target "${mapping.target}". Must be one of: ${validTargets.join(', ')}`
      };
    }

    // Validate platform-target combinations
    if (mapping.platform === 'ANDROID' && mapping.target !== 'PLAY_STORE' && mapping.target !== 'WEB') {
      return {
        isValid: false,
        error: 'ANDROID platform can only target PLAY_STORE or WEB'
      };
    }

    if (mapping.platform === 'IOS' && mapping.target !== 'APP_STORE' && mapping.target !== 'WEB') {
      return {
        isValid: false,
        error: 'IOS platform can only target APP_STORE or WEB'
      };
    }

    if (mapping.platform === 'WEB' && mapping.target !== 'WEB') {
      return {
        isValid: false,
        error: 'WEB platform can only target WEB'
      };
    }

    // Validate version format (basic check)
    if (!mapping.version.trim()) {
      return {
        isValid: false,
        error: 'Version cannot be empty'
      };
    }
  }

  return { isValid: true };
};

/**
 * Validates cron job updates structure
 */
export const validateUpdateCronJob = (body: UpdateReleaseRequestBody): ValidationResult => {
  if (!body.cronJob) {
    return { isValid: true };
  }

  const cronJob = body.cronJob;

  // Validate upcomingRegressions if provided
  if (cronJob.upcomingRegressions !== undefined) {
    if (!Array.isArray(cronJob.upcomingRegressions)) {
      return {
        isValid: false,
        error: 'upcomingRegressions must be an array'
      };
    }

    for (const regression of cronJob.upcomingRegressions) {
      if (!regression.date || !regression.config) {
        return {
          isValid: false,
          error: 'Each regression must have date and config'
        };
      }
      
      const date = new Date(regression.date);
      if (isNaN(date.getTime())) {
        return {
          isValid: false,
          error: 'Invalid date format in upcomingRegressions'
        };
      }

      // Regression dates should be in the future
      const now = new Date();
      if (date < now) {
        return {
          isValid: false,
          error: 'Regression dates must be in the future'
        };
      }

      // Validate config is an object
      if (typeof regression.config !== 'object' || regression.config === null) {
        return {
          isValid: false,
          error: 'Regression config must be an object'
        };
      }
    }
  }

  // Validate cronConfig if provided (basic structure check)
  if (cronJob.cronConfig !== undefined) {
    if (typeof cronJob.cronConfig !== 'object' || cronJob.cronConfig === null) {
      return {
        isValid: false,
        error: 'cronConfig must be an object'
      };
    }
  }

  return { isValid: true };
};

/**
 * Validates the logical sequence of datetimes in an update release request
 * Rule: kickOffReminderDate < kickOffDate < all regression datetimes < targetReleaseDate
 */
export const validateUpdateDateSequence = (body: UpdateReleaseRequestBody): ValidationResult => {
  // Parse and validate datetime strings
  const kickOffReminderDate = body.kickOffReminderDate ? new Date(body.kickOffReminderDate) : null;
  const kickOffDate = body.kickOffDate ? new Date(body.kickOffDate) : null;
  const targetReleaseDate = body.targetReleaseDate ? new Date(body.targetReleaseDate) : null;
  
  // Validate that all dates are valid datetime objects
  if (kickOffReminderDate && isNaN(kickOffReminderDate.getTime())) {
    return { isValid: false, error: 'Invalid kickOffReminderDate datetime format' };
  }
  if (kickOffDate && isNaN(kickOffDate.getTime())) {
    return { isValid: false, error: 'Invalid kickOffDate datetime format' };
  }
  if (targetReleaseDate && isNaN(targetReleaseDate.getTime())) {
    return { isValid: false, error: 'Invalid targetReleaseDate datetime format' };
  }

  // Parse regression slot datetimes
  const regressionDates: Date[] = [];
  if (body.cronJob?.upcomingRegressions) {
    for (const slot of body.cronJob.upcomingRegressions) {
      const regressionDate = new Date(slot.date);
      if (isNaN(regressionDate.getTime())) {
        return { isValid: false, error: `Invalid regression slot datetime format: ${slot.date}` };
      }
      regressionDates.push(regressionDate);
    }
  }

  // 1. kickOffReminderDate datetime < kickOffDate datetime
  if (kickOffReminderDate && kickOffDate) {
    if (kickOffReminderDate.getTime() >= kickOffDate.getTime()) {
      return {
        isValid: false,
        error: `kickOffReminderDate must be before kickOffDate. kickOffReminderDate: ${kickOffReminderDate.toISOString()}, kickOffDate: ${kickOffDate.toISOString()}`
      };
    }
  }

  // 2. kickOffDate datetime < all regression datetimes
  if (kickOffDate && regressionDates.length > 0) {
    for (const regressionDate of regressionDates) {
      if (regressionDate.getTime() <= kickOffDate.getTime()) {
        return {
          isValid: false,
          error: `All regression slot datetimes must be after kickOffDate. Found regression datetime ${regressionDate.toISOString()} which is not after kickOffDate ${kickOffDate.toISOString()}`
        };
      }
    }
  }

  // 3. all regression datetimes < targetReleaseDate datetime
  if (targetReleaseDate && regressionDates.length > 0) {
    for (const regressionDate of regressionDates) {
      if (regressionDate.getTime() >= targetReleaseDate.getTime()) {
        return {
          isValid: false,
          error: `All regression slot datetimes must be before targetReleaseDate. Found regression datetime ${regressionDate.toISOString()} which is not before targetReleaseDate ${targetReleaseDate.toISOString()}`
        };
      }
    }
  }

  // 4. kickOffDate datetime < targetReleaseDate datetime
  if (kickOffDate && targetReleaseDate) {
    if (kickOffDate.getTime() >= targetReleaseDate.getTime()) {
      return {
        isValid: false,
        error: `kickOffDate must be before targetReleaseDate. kickOffDate: ${kickOffDate.toISOString()}, targetReleaseDate: ${targetReleaseDate.toISOString()}`
      };
    }
  }

  return { isValid: true };
};

/**
 * Master validation function for update release requests
 */
export const validateUpdateReleaseRequest = (body: UpdateReleaseRequestBody): ValidationResult => {
  // Run all update validations in sequence
  const validations = [
    validateUpdateReleaseRequestBody(body),
    validateUpdateDates(body),
    validateUpdateDateSequence(body),
    validateUpdateType(body),
    validateUpdatePlatformTargetMappings(body),
    validateUpdateCronJob(body)
  ];

  // Return the first validation that fails
  for (const validation of validations) {
    if (!validation.isValid) {
      return validation;
    }
  }

  return { isValid: true };
};

// ============================================================================
// CREATE RELEASE VALIDATION FUNCTIONS
// ============================================================================

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
    validateRegressionBuildSlots(body)
  ];

  // Return the first validation that fails
  for (const validation of validations) {
    if (!validation.isValid) {
      return validation;
    }
  }

  return { isValid: true };
};

