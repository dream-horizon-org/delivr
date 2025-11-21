/**
 * Validation utilities for test management config
 */

import { TEST_PLATFORMS } from '~types/integrations/test-management/platform.interface';
import { isValidTestPlatform } from '~types/integrations/test-management/platform.utils';
import type { PlatformConfiguration } from '~types/integrations/test-management/test-management-config';
import { hasProperty } from '~utils/type-guards.utils';

/**
 * Type guard to check if value is a valid platform configuration
 */
const isPlatformConfiguration = (value: unknown): value is PlatformConfiguration => {
  const hasPlatformProperty = hasProperty(value, 'platform');
  
  if (!hasPlatformProperty) {
    return false;
  }

  const platformValue = value.platform;
  
  // Validate platform is a valid TestPlatform enum value
  const platformIsValid = isValidTestPlatform(platformValue);
  
  if (!platformIsValid) {
    return false;
  }

  const hasParametersProperty = hasProperty(value, 'parameters');
  
  if (!hasParametersProperty) {
    return false;
  }

  const parametersValue = value.parameters;
  const parametersIsObject = typeof parametersValue === 'object';
  const parametersNotNull = parametersValue !== null;
  const parametersValid = parametersIsObject && parametersNotNull;

  return parametersValid;
};

/**
 * Validate platform configurations array
 * Returns error message if invalid, null if valid
 */
export const validatePlatformConfigurations = (
  platformConfigurations: unknown
): string | null => {
  const isArray = Array.isArray(platformConfigurations);

  if (!isArray) {
    return 'platformConfigurations must be an array';
  }

  const arrayIsEmpty = platformConfigurations.length === 0;

  if (arrayIsEmpty) {
    return 'platformConfigurations must contain at least one configuration';
  }

  // Check for duplicate platforms
  const seenPlatforms = new Set<string>();
  
  for (let i = 0; i < platformConfigurations.length; i++) {
    const config = platformConfigurations[i];
    const configIsValid = isPlatformConfiguration(config);

    if (!configIsValid) {
      const validPlatforms = TEST_PLATFORMS.join(', ');
      return `Invalid configuration at index ${i}: must have 'platform' (one of: ${validPlatforms}) and 'parameters' (object)`;
    }
    
    // Check for duplicate platform
    const platform = config.platform;
    if (seenPlatforms.has(platform)) {
      return `Duplicate platform '${platform}' found at index ${i}. Each platform can only be configured once.`;
    }
    seenPlatforms.add(platform);
  }

  return null;
};

/**
 * Validate pass threshold percent
 * Returns error message if invalid, null if valid
 */
export const validatePassThresholdPercent = (value: unknown): string | null => {
  const isNumber = typeof value === 'number';

  if (!isNumber) {
    return 'passThresholdPercent must be a number';
  }

  const isNaN = Number.isNaN(value);

  if (isNaN) {
    return 'passThresholdPercent must be a valid number';
  }

  const isBelowZero = value < 0;
  const isAboveHundred = value > 100;
  const isOutOfRange = isBelowZero || isAboveHundred;

  if (isOutOfRange) {
    return 'passThresholdPercent must be between 0 and 100';
  }

  return null;
};

/**
 * Validate config name
 * Returns error message if invalid, null if valid
 */
export const validateConfigName = (value: unknown): string | null => {
  const isString = typeof value === 'string';

  if (!isString) {
    return 'name must be a string';
  }

  const nameLength = value.length;
  const nameEmpty = nameLength === 0;

  if (nameEmpty) {
    return 'name cannot be empty';
  }

  const maxLength = 255;
  const nameTooLong = nameLength > maxLength;

  if (nameTooLong) {
    return `name cannot exceed ${maxLength} characters`;
  }

  return null;
};

/**
 * Validate project ID
 * Returns error message if invalid, null if valid
 */
export const validateProjectId = (value: unknown): string | null => {
  const isString = typeof value === 'string';

  if (!isString) {
    return 'projectId must be a string';
  }

  const idLength = value.length;
  const idEmpty = idLength === 0;

  if (idEmpty) {
    return 'projectId cannot be empty';
  }

  return null;
};

/**
 * Validate integration ID
 * Returns error message if invalid, null if valid
 */
export const validateIntegrationId = (value: unknown): string | null => {
  const isString = typeof value === 'string';

  if (!isString) {
    return 'integrationId must be a string';
  }

  const idLength = value.length;
  const idEmpty = idLength === 0;

  if (idEmpty) {
    return 'integrationId cannot be empty';
  }

  return null;
};

