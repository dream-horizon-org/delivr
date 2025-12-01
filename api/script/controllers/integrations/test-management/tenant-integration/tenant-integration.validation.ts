import { TestManagementProviderType } from '~types/integrations/test-management';
import { hasProperty } from '~utils/type-guards.utils';

/**
 * Validation utilities for tenant integration test management
 */

/**
 * Helper: Check if value is a non-empty string
 */
const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

/**
 * Helper: Check if value is a valid URL
 */
const isValidUrl = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Helper: Validate required string field
 */
const validateRequiredString = (
  obj: Record<string, unknown>,
  field: string,
  prefix = ''
): string | null => {
  const label = prefix ? `${prefix} ${field}` : field;
  
  if (!hasProperty(obj, field)) {
    return `${label} is required`;
  }
  
  if (!isNonEmptyString(obj[field])) {
    return `${label} must be a non-empty string`;
  }
  
  return null;
};

/**
 * Helper: Validate optional string field (if present, must be non-empty)
 */
const validateOptionalString = (
  obj: Record<string, unknown>,
  field: string
): string | null => {
  if (!hasProperty(obj, field)) return null;
  
  return isNonEmptyString(obj[field]) 
    ? null 
    : `${field} must be a non-empty string`;
};

/**
 * Helper: Validate required positive number field
 */
const validateRequiredPositiveNumber = (
  obj: Record<string, unknown>,
  field: string,
  prefix = ''
): string | null => {
  const label = prefix ? `${prefix} ${field}` : field;
  
  if (!hasProperty(obj, field)) {
    return `${label} is required`;
  }
  
  const value = obj[field];
  
  if (typeof value !== 'number') {
    return `${label} must be a number`;
  }
  
  if (value <= 0) {
    return `${label} must be a positive number`;
  }
  
  return null;
};

/**
 * Helper: Validate optional positive number field
 */
const validateOptionalPositiveNumber = (
  obj: Record<string, unknown>,
  field: string
): string | null => {
  if (!hasProperty(obj, field)) return null;
  
  const value = obj[field];
  
  if (typeof value !== 'number') {
    return `${field} must be a number`;
  }
  
  if (value <= 0) {
    return `${field} must be a positive number`;
  }
  
  return null;
};

/**
 * Validate provider type
 * Returns error message if invalid, null if valid
 */
export const validateProviderType = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return 'providerType must be a string';
  }

  const validProviderTypes = Object.values(TestManagementProviderType);
  const isValid = validProviderTypes.includes(value as TestManagementProviderType);

  return isValid 
    ? null 
    : `providerType must be one of: ${validProviderTypes.join(', ')}`;
};

/**
 * Validate config structure based on provider type
 * Returns error message if invalid, null if valid
 */
export const validateConfigStructure = (
  config: unknown,
  providerType: string
): string | null => {
  const isValidObject = typeof config === 'object' && config !== null;

  if (!isValidObject) {
    return 'config must be a non-null object';
  }

  // Provider-specific validation
  if (providerType === TestManagementProviderType.CHECKMATE) {
    return validateCheckmateConfig(config);
  }

  return null;
};

/**
 * Validate Checkmate-specific config structure
 */
const validateCheckmateConfig = (config: unknown): string | null => {
  const configObj = config as Record<string, unknown>;

  // Validate baseUrl
  const baseUrlError = validateRequiredString(configObj, 'baseUrl', 'Checkmate config');
  if (baseUrlError) return baseUrlError;

  const baseUrl = String(configObj.baseUrl);
  if (!isValidUrl(baseUrl)) {
    return 'Checkmate config baseUrl must be a valid URL';
  }

  // Validate authToken
  const authTokenError = validateRequiredString(configObj, 'authToken', 'Checkmate config');
  if (authTokenError) return authTokenError;

  // Validate orgId
  return validateRequiredPositiveNumber(configObj, 'orgId', 'Checkmate config');
};

/**
 * Validate partial config structure (for UPDATE operations)
 * Only validates fields that are present - allows partial updates
 */
export const validatePartialConfigStructure = (
  config: unknown,
  providerType: string
): string | null => {
  const isValidObject = typeof config === 'object' && config !== null;

  if (!isValidObject) {
    return 'config must be a non-null object';
  }

  // Provider-specific validation
  if (providerType === TestManagementProviderType.CHECKMATE) {
    return validatePartialCheckmateConfig(config);
  }

  return null;
};

/**
 * Validate partial Checkmate config (for UPDATE operations)
 * Only validates fields that are present
 */
const validatePartialCheckmateConfig = (config: unknown): string | null => {
  const configObj = config as Record<string, unknown>;

  // Validate baseUrl if provided
  if (hasProperty(configObj, 'baseUrl')) {
    const baseUrlError = validateOptionalString(configObj, 'baseUrl');
    if (baseUrlError) return baseUrlError;

    const baseUrl = String(configObj.baseUrl);
    if (!isValidUrl(baseUrl)) {
      return 'baseUrl must be a valid URL';
    }
  }

  // Validate authToken if provided
  const authTokenError = validateOptionalString(configObj, 'authToken');
  if (authTokenError) return authTokenError;

  // Validate orgId if provided
  return validateOptionalPositiveNumber(configObj, 'orgId');
};

/**
 * Validate integration name
 * Returns error message if invalid, null if valid
 */
export const validateIntegrationName = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return 'name must be a string';
  }

  if (value.length === 0) {
    return 'name cannot be empty';
  }

  const maxLength = 255;
  if (value.length > maxLength) {
    return `name cannot exceed ${maxLength} characters`;
  }

  return null;
};

