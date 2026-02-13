/**
 * Release Management Validation Functions
 * 
 * Validates release creation requests before processing
 * Follows cursorrules: No 'any' types - use explicit types
 */

import type { CreateReleaseRequestBody, UpdateReleaseRequestBody } from '~types/release';
import { RegressionCycleStatus } from '../../models/release/release.interface';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Slot validation result
 */
export interface SlotValidationResult {
  isValid: boolean;
  error?: string;
  invalidSlots: Array<{ id: string; date: string }>;
}

/**
 * Audit info for target date changes
 */
export interface TargetDateAuditInfo {
  oldDate: Date;
  newDate: Date;
  reason: string | undefined;
  changeType: 'EXTENDED' | 'SHORTENED' | 'UNCHANGED';
}

/**
 * Target date change validation result
 */
export interface TargetDateChangeValidationResult {
  isValid: boolean;
  error?: string;
  requiresDelayReason: boolean;
  conflictingSlots: Array<{ id: string; date: string }>;
  shouldLogAudit: boolean;
  auditInfo?: TargetDateAuditInfo;
  /** Updates to apply to the release record */
  releaseUpdates?: {
    delayReason?: string | null;
  };
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
    'targetReleaseDate',
    'branch'
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
  const validTypes = ['MAJOR', 'MINOR', 'HOTFIX'];
  
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
 * Validates branch name follows Git branch naming rules
 * https://git-scm.com/docs/git-check-ref-format
 */
export const validateBranchFormat = (
  body: CreateReleaseRequestBody
): ValidationResult => {
  if (!body.branch) {
    return { isValid: true }; // Skip if not provided
  }

  const branch = body.branch.trim();

  const invalidPattern =
    /(^\/|\/$|^-|\.lock$|\.{2}|\/\/|[~^:?*[\\\s]|@\{|[\x00-\x1F\x7F])/;

  const isValid =
    branch.length > 0 &&
    !branch.endsWith('.') &&
    !invalidPattern.test(branch);

  if (!isValid) {
    return {
      isValid: false,
      error: 'Invalid branch name format. Branch name must follow Git naming conventions.'
    };
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
 * Validates release type for updates
 * Release type cannot be changed after creation because versions are validated
 * against the type at creation time (MAJOR=X.0.0, MINOR=X.Y.0, HOTFIX=X.Y.Z)
 */
export const validateUpdateType = (body: UpdateReleaseRequestBody): ValidationResult => {
  if (body.type !== undefined) {
    return {
      isValid: false,
      error: 'Release type cannot be changed after creation. Versions were validated based on the original type.'
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
 * Validates branch name follows Git branch naming rules for update requests
 * https://git-scm.com/docs/git-check-ref-format
 */
export const validateUpdateBranchFormat = (
  body: UpdateReleaseRequestBody
): ValidationResult => {
  if (!body.branch) {
    return { isValid: true }; // Skip if not provided
  }

  const branch = body.branch.trim();

  const invalidPattern =
    /(^\/|\/$|^-|\.lock$|\.{2}|\/\/|[~^:?*[\\\s]|@\{|[\x00-\x1F\x7F])/;

  const isValid =
    branch.length > 0 &&
    !branch.endsWith('.') &&
    !invalidPattern.test(branch);

  if (!isValid) {
    return {
      isValid: false,
      error: 'Invalid branch name format. Branch name must follow Git naming conventions.'
    };
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
    validateUpdateCronJob(body),
    validateUpdateBranchFormat(body)
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
    validateRegressionBuildSlots(body),
    validateBranchFormat(body)
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
// TARGET DATE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a single slot date against the target release date
 * Rule: slot.date must be STRICTLY before targetReleaseDate
 */
export const validateSlotAgainstTargetDate = (
  slotDate: Date,
  targetReleaseDate: Date | null | undefined
): ValidationResult => {
  // Handle null/undefined target date gracefully
  if (!targetReleaseDate) {
    return { isValid: true };
  }

  const slotTime = slotDate.getTime();
  const targetTime = targetReleaseDate.getTime();

  if (slotTime >= targetTime) {
    return {
      isValid: false,
      error: `Slot date ${slotDate.toISOString()} must be before targetReleaseDate ${targetReleaseDate.toISOString()}`
    };
  }

  return { isValid: true };
};

/**
 * Slot type for validation
 */
type SlotForValidation = {
  id: string;
  date: string;
  status?: RegressionCycleStatus;
  config?: Record<string, unknown>;
};

/**
 * Validates an array of slots against the target release date
 * All slots must have dates before targetReleaseDate
 */
export const validateSlotsArray = (
  slots: SlotForValidation[],
  targetReleaseDate: Date
): SlotValidationResult => {
  const invalidSlots: Array<{ id: string; date: string }> = [];

  for (const slot of slots) {
    const slotDate = new Date(slot.date);
    const validation = validateSlotAgainstTargetDate(slotDate, targetReleaseDate);
    
    if (!validation.isValid) {
      invalidSlots.push({ id: slot.id, date: slot.date });
    }
  }

  if (invalidSlots.length > 0) {
    return {
      isValid: false,
      error: `${invalidSlots.length} slot(s) exceed targetReleaseDate. All regression slots must be scheduled before the target release date.`,
      invalidSlots
    };
  }

  return {
    isValid: true,
    invalidSlots: []
  };
};

/**
 * Parameters for target date change validation
 */
type TargetDateChangeParams = {
  oldDate: Date;
  newDate: Date;
  existingSlots: SlotForValidation[];
  delayReason?: string;
};

/**
 * Validates target release date changes
 * - Shortening: Validates existing slots, rejects if any slot is in progress
 * - Extending: Requires delay reason
 * - Unchanged: No validation needed
 */
export const validateTargetDateChange = (
  params: TargetDateChangeParams
): TargetDateChangeValidationResult => {
  const { oldDate, newDate, existingSlots, delayReason } = params;
  
  const oldTime = oldDate.getTime();
  const newTime = newDate.getTime();
  
  // Determine change type
  const isUnchanged = oldTime === newTime;
  const isExtending = newTime > oldTime;
  const isShortening = newTime < oldTime;
  
  // UNCHANGED: No validation needed, no updates
  if (isUnchanged) {
    return {
      isValid: true,
      requiresDelayReason: false,
      conflictingSlots: [],
      shouldLogAudit: false
      // No releaseUpdates - nothing to change
    };
  }
  
  // EXTENDING: Require delay reason
  if (isExtending) {
    const hasDelayReason = !!delayReason && delayReason.trim().length > 0;
    
    if (!hasDelayReason) {
      return {
        isValid: false,
        error: 'delayReason is required when extending targetReleaseDate',
        requiresDelayReason: true,
        conflictingSlots: [],
        shouldLogAudit: true,
        auditInfo: {
          oldDate,
          newDate,
          reason: delayReason,
          changeType: 'EXTENDED'
        }
      };
    }
    
    // Extension is valid with delay reason - no slot validation needed
    return {
      isValid: true,
      requiresDelayReason: true,
      conflictingSlots: [],
      shouldLogAudit: true,
      auditInfo: {
        oldDate,
        newDate,
        reason: delayReason,
        changeType: 'EXTENDED'
      },
      // Store delayReason in the release record
      releaseUpdates: {
        delayReason
      }
    };
  }
  
  // SHORTENING: Check for in-progress slots first
  const inProgressSlots = existingSlots.filter(
    slot => slot.status === RegressionCycleStatus.IN_PROGRESS
  );
  
  if (inProgressSlots.length > 0) {
    return {
      isValid: false,
      error: `Cannot shorten targetReleaseDate while ${inProgressSlots.length} slot(s) are in progress. Wait for them to complete or cancel them first.`,
      requiresDelayReason: false,
      conflictingSlots: inProgressSlots.map(s => ({ id: s.id, date: s.date })),
      shouldLogAudit: false
    };
  }
  
  // SHORTENING: Validate existing slots against new date
  // Only check non-completed slots (NOT_STARTED status)
  const activeSlots = existingSlots.filter(
    slot => slot.status !== RegressionCycleStatus.DONE
  );
  
  const conflictingSlots: Array<{ id: string; date: string }> = [];
  
  for (const slot of activeSlots) {
    const slotDate = new Date(slot.date);
    if (slotDate.getTime() >= newTime) {
      conflictingSlots.push({ id: slot.id, date: slot.date });
    }
  }
  
  if (conflictingSlots.length > 0) {
    return {
      isValid: false,
      error: `${conflictingSlots.length} existing slot(s) exceed new targetReleaseDate. Remove or reschedule these slots first.`,
      requiresDelayReason: false,
      conflictingSlots,
      shouldLogAudit: false
    };
  }
  
  // Shortening is valid - clear the delayReason
  return {
    isValid: true,
    requiresDelayReason: false,
    conflictingSlots: [],
    shouldLogAudit: true,
    auditInfo: {
      oldDate,
      newDate,
      reason: delayReason,
      changeType: 'SHORTENED'
    },
    // Clear delayReason when shortening (no longer delayed)
    releaseUpdates: {
      delayReason: null
    }
  };
};

/**
 * Logs audit info for target date changes
 * Called by the service layer when a target date change is validated and applied
 */
export const logTargetDateChangeAudit = (
  releaseId: string,
  auditInfo: TargetDateAuditInfo,
  accountId: string
): void => {
  console.log(`[Audit] targetReleaseDate changed for release ${releaseId}:`, {
    oldDate: auditInfo.oldDate.toISOString(),
    newDate: auditInfo.newDate.toISOString(),
    changeType: auditInfo.changeType,
    reason: auditInfo.reason ?? 'No reason provided',
    changedBy: accountId
  });
  
  // TODO: Emit TARGET_DATE_CHANGED event when notification system is ready
  // eventEmitter.emit(ReleaseEvent.TARGET_DATE_CHANGED, {
  //   releaseId,
  //   oldDate: auditInfo.oldDate,
  //   newDate: auditInfo.newDate,
  //   changeType: auditInfo.changeType,
  //   reason: auditInfo.reason,
  //   changedBy: accountId
  // });
};
