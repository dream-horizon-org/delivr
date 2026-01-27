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
  
  // Validate parameters is an object and not null
  if (typeof parametersValue !== 'object' || parametersValue === null) {
    return false;
  }

  // Validate required field: projectId must be a positive number
  const params = parametersValue as Record<string, unknown>;
  if (typeof params.projectId !== 'number' || params.projectId <= 0) {
    return false;
  }

  return true;
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
      return `Invalid configuration at index ${i}: must have 'platform' (one of: ${validPlatforms}) and 'parameters' (object with required 'projectId' as positive number)`;
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
 * 
 * Note: Must be an integer (0-100) to match database INT type
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

  const isInteger = Number.isInteger(value);

  if (!isInteger) {
    return 'passThresholdPercent must be an integer (decimals not supported)';
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
 * Validate app id
 * Returns error message if invalid, null if valid
 */
export const validateTenantId = (value: unknown): string | null => {
  const isString = typeof value === 'string';

  if (!isString) {
    return 'appId must be a string';
  }

  const idLength = value.length;
  const idEmpty = idLength === 0;

  if (idEmpty) {
    return 'appId cannot be empty';
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

