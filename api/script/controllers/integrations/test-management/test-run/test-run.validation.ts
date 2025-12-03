/**
 * Validation utilities for test run operations
 */

import { TEST_PLATFORMS } from '~types/integrations/test-management/platform.interface';
import { isValidTestPlatform } from '~types/integrations/test-management/platform.utils';

/**
 * Validate runName
 * Returns error message if invalid, null if valid
 * 
 * Requirements (from Checkmate API):
 * - Must be a string
 * - Must be 5-50 characters (after trimming)
 */
export const validateRunName = (runName: unknown): string | null => {
  if (!runName || typeof runName !== 'string') {
    return 'runName is required and must be a string';
  }

  const runNameTrimmed = runName.trim();

  if (runNameTrimmed.length === 0) {
    return 'runName cannot be empty';
  }

  if (runNameTrimmed.length < 5) {
    return 'runName must be at least 5 characters';
  }

  if (runNameTrimmed.length > 50) {
    return 'runName must be at most 50 characters';
  }

  return null;
};

/**
 * Validate runDescription
 * Returns error message if invalid, null if valid
 */
export const validateRunDescription = (runDescription: unknown): string | null => {
  if (runDescription !== undefined && typeof runDescription !== 'string') {
    return 'runDescription must be a string';
  }

  return null;
};

/**
 * Validate platforms array
 * Returns error message if invalid, null if valid
 */
export const validatePlatforms = (platforms: unknown): string | null => {
  const isArray = Array.isArray(platforms);

  if (!isArray) {
    return 'platforms must be an array';
  }

  const isEmpty = platforms.length === 0;

  if (isEmpty) {
    return 'platforms array cannot be empty';
  }

  // Check for duplicate platforms
  const seenPlatforms = new Set<string>();
  
  // Validate each platform is a valid TestPlatform enum value
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    const isValid = isValidTestPlatform(platform);

    if (!isValid) {
      const validPlatforms = TEST_PLATFORMS.join(', ');
      return `Invalid platform at index ${i}: "${platform}". Valid platforms: ${validPlatforms}`;
    }
    
    // Check for duplicate platform
    if (seenPlatforms.has(platform)) {
      return `Duplicate platform '${platform}' found at index ${i}. Each platform can only be specified once.`;
    }
    seenPlatforms.add(platform);
  }

  return null;
};

