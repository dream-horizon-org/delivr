import { TestManagementProviderType } from '~types/integrations/test-management';
import { hasProperty } from '~utils/type-guards.utils';

/**
 * Validation utilities for project integration test management
 */

/**
 * Check if a string is a valid provider type
 */
const isValidProviderTypeValue = (value: string): boolean => {
  const checkmateMatch = value === TestManagementProviderType.CHECKMATE;
  // Add more provider types here when they're added
  // const testRailMatch = value === TestManagementProviderType.TESTRAIL;
  
  return checkmateMatch;
};

/**
 * Validate provider type
 * Returns error message if invalid, null if valid
 */
export const validateProviderType = (value: unknown): string | null => {
  const isString = typeof value === 'string';

  if (!isString) {
    return 'providerType must be a string';
  }

  const isValid = isValidProviderTypeValue(value);

  if (!isValid) {
    const validProviderTypes = Object.values(TestManagementProviderType);
    const validTypesString = validProviderTypes.join(', ');
    return `providerType must be one of: ${validTypesString}`;
  }

  return null;
};

/**
 * Validate config structure based on provider type
 * Returns error message if invalid, null if valid
 */
export const validateConfigStructure = (
  config: unknown,
  providerType: string
): string | null => {
  const isObject = typeof config === 'object';
  const isNotNull = config !== null;
  const configIsValid = isObject && isNotNull;

  if (!configIsValid) {
    return 'config must be a non-null object';
  }

  // Provider-specific validation
  if (providerType === TestManagementProviderType.CHECKMATE) {
    return validateCheckmateConfig(config);
  }

  // For unknown providers, just ensure it's an object
  return null;
};

/**
 * Validate Checkmate-specific config structure
 */
const validateCheckmateConfig = (config: unknown): string | null => {
  const hasBaseUrlProperty = hasProperty(config, 'baseUrl');

  if (!hasBaseUrlProperty) {
    return 'Checkmate config requires baseUrl field';
  }

  const baseUrlValue = config.baseUrl;
  const baseUrlIsString = typeof baseUrlValue === 'string';

  if (!baseUrlIsString) {
    return 'Checkmate config baseUrl must be a string';
  }

  // Convert to string safely after type check
  const baseUrlString = String(baseUrlValue);
  const baseUrlLength = baseUrlString.length;
  const baseUrlEmpty = baseUrlLength === 0;

  if (baseUrlEmpty) {
    return 'Checkmate config baseUrl cannot be empty';
  }

  // Validate URL format
  try {
    new URL(baseUrlString);
  } catch {
    return 'Checkmate config baseUrl must be a valid URL';
  }

  const hasAuthTokenProperty = hasProperty(config, 'authToken');

  if (!hasAuthTokenProperty) {
    return 'Checkmate config requires authToken field';
  }

  const authTokenValue = config.authToken;
  const authTokenIsString = typeof authTokenValue === 'string';

  if (!authTokenIsString) {
    return 'Checkmate config authToken must be a string';
  }

  // Convert to string safely after type check
  const authTokenString = String(authTokenValue);
  const authTokenLength = authTokenString.length;
  const authTokenEmpty = authTokenLength === 0;

  if (authTokenEmpty) {
    return 'Checkmate config authToken cannot be empty';
  }

  return null;
};

/**
 * Validate integration name
 * Returns error message if invalid, null if valid
 */
export const validateIntegrationName = (value: unknown): string | null => {
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

