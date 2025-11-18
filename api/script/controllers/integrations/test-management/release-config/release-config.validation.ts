import type { PlatformConfiguration } from '~types/integrations/test-management/release-config/release-config.interface';

/**
 * Validation utilities for release config test management
 */

/**
 * Type guard to check if value has a property
 */
const hasProperty = <K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> => {
  const isObject = typeof obj === 'object';
  const isNotNull = obj !== null;
  const objIsValid = isObject && isNotNull;
  
  if (!objIsValid) {
    return false;
  }
  
  return key in obj;
};

/**
 * Type guard to check if value is a valid platform configuration
 */
const isPlatformConfiguration = (value: unknown): value is PlatformConfiguration => {
  const hasPlatformProperty = hasProperty(value, 'platform');
  
  if (!hasPlatformProperty) {
    return false;
  }

  const platformValue = value.platform;
  const platformIsString = typeof platformValue === 'string';
  
  if (!platformIsString) {
    return false;
  }
  
  const platformLength = platformValue.length;
  const platformNonEmpty = platformLength > 0;
  
  if (!platformNonEmpty) {
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

  for (let i = 0; i < platformConfigurations.length; i++) {
    const config = platformConfigurations[i];
    const configIsValid = isPlatformConfiguration(config);

    if (!configIsValid) {
      return `Invalid configuration at index ${i}: must have 'platform' (non-empty string) and 'parameters' (object)`;
    }
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

