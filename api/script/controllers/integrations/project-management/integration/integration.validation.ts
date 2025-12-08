/**
 * Project Management Integration Validation
 */

import { ProjectManagementProviderType } from '~types/integrations/project-management';
import {
  INTEGRATION_NAME_MIN_LENGTH,
  INTEGRATION_NAME_MAX_LENGTH,
  PROJECT_MANAGEMENT_PROVIDERS
} from './integration.constants';

/**
 * Validate integration name
 */
export const validateIntegrationName = (name: unknown): string | null => {
  if (typeof name !== 'string') {
    return 'Name must be a string';
  }

  const trimmedName = name.trim();

  if (trimmedName.length < INTEGRATION_NAME_MIN_LENGTH) {
    return `Name must be at least ${INTEGRATION_NAME_MIN_LENGTH} characters`;
  }

  if (trimmedName.length > INTEGRATION_NAME_MAX_LENGTH) {
    return `Name must not exceed ${INTEGRATION_NAME_MAX_LENGTH} characters`;
  }

  return null;
};

/**
 * Validate provider type
 */
export const validateProviderType = (providerType: unknown): string | null => {
  if (typeof providerType !== 'string') {
    return 'Provider type must be a string';
  }

  const isValidProvider = PROJECT_MANAGEMENT_PROVIDERS.includes(
    providerType as ProjectManagementProviderType
  );

  if (!isValidProvider) {
    return `Invalid provider type. Must be one of: ${PROJECT_MANAGEMENT_PROVIDERS.join(', ')}`;
  }

  return null;
};

/**
 * Helper to check if a value is a non-empty string
 */
const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

/**
 * Helper to validate required field exists and is non-empty string
 */
const validateRequiredString = (
  obj: Record<string, unknown>,
  field: string,
  label: string
): string | null => {
  return isNonEmptyString(obj[field]) ? null : `${label} must include ${field}`;
};

/**
 * Helper to validate optional field (if present, must be non-empty string)
 */
const validateOptionalString = (
  obj: Record<string, unknown>,
  field: string
): string | null => {
  const fieldExists = field in obj;
  if (!fieldExists) return null;
  return isNonEmptyString(obj[field]) ? null : `${field} must be a non-empty string`;
};

/**
 * Helper to validate enum value
 */
const validateEnum = (
  value: unknown,
  validValues: readonly string[],
  fieldName: string
): string | null => {
  const isString = typeof value === 'string';
  const isValidValue = isString && validValues.includes(value);
  return isValidValue ? null : `${fieldName} must be one of: ${validValues.join(', ')}`;
};

/**
 * Validate config structure based on provider type (for CREATE operations)
 */
export const validateConfigStructure = (
  config: unknown,
  providerType: ProjectManagementProviderType
): string | null => {
  const isObject = typeof config === 'object' && config !== null;
  if (!isObject) return 'Config must be an object';

  const configObj = config as Record<string, unknown>;

  // Validate common field
  const baseUrlError = validateRequiredString(configObj, 'baseUrl', 'Config');
  if (baseUrlError) return baseUrlError;

  // Provider-specific validation
  switch (providerType) {
    case ProjectManagementProviderType.JIRA: {
      const apiTokenError = validateRequiredString(configObj, 'apiToken', 'JIRA config');
      if (apiTokenError) return apiTokenError;

      const emailError = validateRequiredString(configObj, 'email', 'JIRA config');
      if (emailError) return emailError;

      const jiraTypeError = validateRequiredString(configObj, 'jiraType', 'JIRA config');
      if (jiraTypeError) return jiraTypeError;

      const validJiraTypes = ['CLOUD', 'SERVER', 'DATA_CENTER'] as const;
      return validateEnum(configObj.jiraType, validJiraTypes, 'jiraType');
    }
    case ProjectManagementProviderType.LINEAR: {
      const apiKeyError = validateRequiredString(configObj, 'apiKey', 'Linear config');
      if (apiKeyError) return apiKeyError;

      return validateRequiredString(configObj, 'teamId', 'Linear config');
    }
    default:
      return null;
  }
};

/**
 * Validate partial config structure (for UPDATE operations)
 * Only validates fields that are present - allows partial updates
 */
export const validatePartialConfigStructure = (
  config: unknown,
  providerType: ProjectManagementProviderType
): string | null => {
  const isObject = typeof config === 'object' && config !== null;
  if (!isObject) return 'Config must be an object';

  const configObj = config as Record<string, unknown>;

  // Validate baseUrl if provided
  const baseUrlError = validateOptionalString(configObj, 'baseUrl');
  if (baseUrlError) return baseUrlError;

  // Provider-specific validation (only validate fields that are present)
  switch (providerType) {
    case ProjectManagementProviderType.JIRA: {
      const apiTokenError = validateOptionalString(configObj, 'apiToken');
      if (apiTokenError) return apiTokenError;

      const emailError = validateOptionalString(configObj, 'email');
      if (emailError) return emailError;

      const jiraTypeError = validateOptionalString(configObj, 'jiraType');
      if (jiraTypeError) return jiraTypeError;

      const jiraTypeExists = 'jiraType' in configObj;
      if (jiraTypeExists) {
        const validJiraTypes = ['CLOUD', 'SERVER', 'DATA_CENTER'] as const;
        return validateEnum(configObj.jiraType, validJiraTypes, 'jiraType');
      }
      return null;
    }
    case ProjectManagementProviderType.LINEAR: {
      const apiKeyError = validateOptionalString(configObj, 'apiKey');
      if (apiKeyError) return apiKeyError;

      return validateOptionalString(configObj, 'teamId');
    }
    default:
      return null;
  }
};

