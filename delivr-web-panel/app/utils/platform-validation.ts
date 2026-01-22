/**
 * Platform Validation - Input validation for platform-specific fields
 * 
 * Used throughout distribution forms to ensure data integrity
 * Reference: platform-rules.ts for platform-specific rules
 */


// ============================================================================
// VALIDATION RESULT TYPE
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// ANDROID VALIDATIONS
// ============================================================================

/**
 * Validate Android rollout percentage
 * Android allows: 0-100% with decimals (e.g., 5.5%)
 */
export function validateAndroidRolloutPercent(value: number): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Rollout percentage must be a number' };
  }

  if (value < 0 || value > 100) {
    return { valid: false, error: 'Rollout percentage must be between 0 and 100' };
  }

  // Android supports decimals
  return { valid: true };
}

/**
 * Validate Android in-app priority
 * Must be integer 0-5
 */
export function validateInAppPriority(value: number): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'In-app priority must be a number' };
  }

  if (!Number.isInteger(value)) {
    return { valid: false, error: 'In-app priority must be an integer' };
  }

  if (value < 0 || value > 5) {
    return { valid: false, error: 'In-app priority must be between 0 and 5' };
  }

  return { valid: true };
}

/**
 * Validate Android version code
 * Must be positive integer
 */
export function validateVersionCode(value: number | null | undefined): ValidationResult {
  if (value === null || value === undefined) {
    return { valid: true }; // Optional field
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Version code must be a number' };
  }

  if (!Number.isInteger(value)) {
    return { valid: false, error: 'Version code must be an integer' };
  }

  if (value <= 0) {
    return { valid: false, error: 'Version code must be positive' };
  }

  return { valid: true };
}

// ============================================================================
// iOS VALIDATIONS
// ============================================================================

/**
 * Validate iOS rollout percentage
 * 
 * ✅ Correct iOS Behavior:
 * - phasedRelease=true, rollout 1-99%: Can update to 100% only
 * - phasedRelease=true, rollout 100%: Cannot update (already complete)
 * - phasedRelease=false, rollout 100%: Cannot update (manual release, no controls)
 * - phasedRelease=false, rollout <100%: ❌ INVALID - THIS VALIDATION PREVENTS IT
 * 
 * @param value - The rollout percentage value to validate
 * @param phasedRelease - Whether phased release is enabled
 * @returns ValidationResult with error if invalid
 */
export function validateIOSRolloutPercent(
  value: number,
  phasedRelease: boolean
): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Rollout percentage must be a number' };
  }

  // iOS Phased Release: Can only update to 100% (complete early)
  if (phasedRelease && value !== 100) {
    return { 
      valid: false, 
      error: 'iOS phased release can only skip to 100% (complete early)' 
    };
  }

  // iOS Manual Release: Always 100%, prevent invalid state (phasedRelease=false with <100%)
  if (!phasedRelease && value !== 100) {
    return { 
      valid: false, 
      error: 'iOS manual release is always 100%' 
    };
  }

  return { valid: true };
}

/**
 * Validate iOS TestFlight build number
 * Must be positive integer
 */
export function validateTestFlightBuildNumber(value: number | null): ValidationResult {
  if (value === null || value === undefined) {
    return { valid: false, error: 'TestFlight build number is required' };
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'TestFlight build number must be a number' };
  }

  if (!Number.isInteger(value)) {
    return { valid: false, error: 'TestFlight build number must be an integer' };
  }

  if (value <= 0) {
    return { valid: false, error: 'TestFlight build number must be positive' };
  }

  return { valid: true };
}

// ============================================================================
// COMMON VALIDATIONS
// ============================================================================

/**
 * Validate version string
 * Must be semantic version format (e.g., 2.5.0)
 */
export function validateVersion(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Version is required' };
  }

  // Basic semantic version check: major.minor.patch
  const semverRegex = /^\d+\.\d+\.\d+$/;
  if (!semverRegex.test(value.trim())) {
    return { 
      valid: false, 
      error: 'Version must be in format: major.minor.patch (e.g., 2.5.0)' 
    };
  }

  return { valid: true };
}

/**
 * Validate release notes
 * Must not be empty, min/max length
 */
export function validateReleaseNotes(value: string, minLength = 10, maxLength = 4000): ValidationResult {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Release notes are required' };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return { 
      valid: false, 
      error: `Release notes must be at least ${minLength} characters` 
    };
  }

  if (trimmed.length > maxLength) {
    return { 
      valid: false, 
      error: `Release notes must not exceed ${maxLength} characters` 
    };
  }

  return { valid: true };
}

/**
 * Validate file upload (AAB for Android)
 * Check file type and size
 */
export function validateAABFile(file: File | null): ValidationResult {
  if (!file) {
    return { valid: false, error: 'AAB file is required' };
  }

  // Check file extension
  if (!file.name.endsWith('.aab')) {
    return { valid: false, error: 'File must be an Android App Bundle (.aab)' };
  }

  // Check file size (max 500MB)
  const maxSize = 500 * 1024 * 1024; // 500MB in bytes
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size must not exceed 500MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)` 
    };
  }

  return { valid: true };
}

/**
 * Validate reason text (for cancellation, halt, etc.)
 */
export function validateReason(value: string, required = true, minLength = 5, maxLength = 500): ValidationResult {
  if (!required && (!value || value.trim() === '')) {
    return { valid: true }; // Optional field
  }

  if (!value || value.trim() === '') {
    return { valid: false, error: 'Reason is required' };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return { 
      valid: false, 
      error: `Reason must be at least ${minLength} characters` 
    };
  }

  if (trimmed.length > maxLength) {
    return { 
      valid: false, 
      error: `Reason must not exceed ${maxLength} characters` 
    };
  }

  return { valid: true };
}

// ============================================================================
// COMPREHENSIVE VALIDATION HELPERS
// ============================================================================

/**
 * Validate complete Android submission data
 */
export function validateAndroidSubmission(data: {
  version: string;
  versionCode?: number;
  aabFile: File | null;
  rolloutPercentage: number;
  inAppUpdatePriority: number;
  releaseNotes: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const versionResult = validateVersion(data.version);
  if (!versionResult.valid) errors.version = versionResult.error!;

  const versionCodeResult = validateVersionCode(data.versionCode);
  if (!versionCodeResult.valid) errors.versionCode = versionCodeResult.error!;

  const aabResult = validateAABFile(data.aabFile);
  if (!aabResult.valid) errors.aabFile = aabResult.error!;

  const rolloutResult = validateAndroidRolloutPercent(data.rolloutPercentage);
  if (!rolloutResult.valid) errors.rolloutPercentage = rolloutResult.error!;

  const priorityResult = validateInAppPriority(data.inAppUpdatePriority);
  if (!priorityResult.valid) errors.inAppUpdatePriority = priorityResult.error!;

  const notesResult = validateReleaseNotes(data.releaseNotes);
  if (!notesResult.valid) errors.releaseNotes = notesResult.error!;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate complete iOS submission data
 * Per API spec: uses testflightNumber (not testflightBuildNumber)
 */
export function validateIOSSubmission(data: {
  version: string;
  testflightNumber: number | null;
  phasedRelease: boolean;
  releaseNotes: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const versionResult = validateVersion(data.version);
  if (!versionResult.valid) errors.version = versionResult.error!;

  const buildResult = validateTestFlightBuildNumber(data.testflightNumber);
  if (!buildResult.valid) errors.testflightNumber = buildResult.error!;

  const notesResult = validateReleaseNotes(data.releaseNotes);
  if (!notesResult.valid) errors.releaseNotes = notesResult.error!;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

