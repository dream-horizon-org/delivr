/**
 * Validation utilities for test run operations
 */

import { TEST_PLATFORMS } from '~types/integrations/test-management/platform.interface';
import { isValidTestPlatform } from '~types/integrations/test-management/platform.utils';

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

