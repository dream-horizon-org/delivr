/**
 * Project Management Integration Validation
 */

import * as yup from 'yup';
import { validateWithYup } from '~utils/validation.utils';
import type { ValidationResult } from '~types/validation/validation-result.interface';
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
 * Unified validation for VERIFY operation
 * Currently only JIRA is implemented with Yup validation
 * Returns ValidationResult or passes through for non-Jira providers
 * TODO: Implement Yup validation for LINEAR and other providers
 */
export const validateVerifyRequest = async (
  body: any,
  providerType: ProjectManagementProviderType
): Promise<ValidationResult<any> | { success: true; data: any }> => {
  // JIRA: Use Yup validation
  if (providerType.toUpperCase() === ProjectManagementProviderType.JIRA) {
    return await validateJiraVerifyRequest(body);
  }

  // OTHER PROVIDERS (LINEAR, etc.): Not implemented yet, just pass through
  // When implementing, create Yup schemas similar to Jira
  const { config } = body;
  return { success: true, data: { config } };
};

/**
 * Validate partial config structure (for UPDATE operations - non-Jira providers)
 * Currently used as a fallback for providers without Yup validation
 * NOTE: Jira uses Yup validation (validateJiraUpdateConfig)
 * TODO: Implement Yup validation for LINEAR and other providers, then remove this function
 */
export const validatePartialConfigStructure = (
  config: unknown,
  providerType: ProjectManagementProviderType
): string | null => {
  const isObject = typeof config === 'object' && config !== null;
  if (!isObject) return 'Config must be an object';

  // Basic validation only - other providers (LINEAR, etc.) not implemented yet
  // When implementing, use Yup validation similar to Jira instead of this function
  return null;
};

/* ==================== YUP VALIDATION SCHEMAS ==================== */

/**
 * Shared Yup schema for Jira config fields
 * Used by both verify and create/update operations
 */
const jiraConfigFieldsSchema = yup.object({
  baseUrl: yup
    .string()
    .trim()
    .required('Base URL is required')
    .url('Base URL must be a valid URL (e.g., https://yourcompany.atlassian.net)'),
  email: yup
    .string()
    .trim()
    .required('Email is required')
    .email('Email must be a valid email address'),
  apiToken: yup
    .string()
    .trim()
    .required('API Token is required'),
  jiraType: yup
    .string()
    .trim()
    .required('Jira type is required')
    .test('valid-jira-type',
      "Jira type must be one of: 'CLOUD', 'SERVER', 'DATA_CENTER'",
      (value) => {
        if (!value) return true;
        const validTypes = ['CLOUD', 'SERVER', 'DATA_CENTER'];
        return validTypes.includes(value.toUpperCase());
      }
    )
    .transform((value) => value ? value.toUpperCase() : value)
});

/**
 * Yup schema for Jira verification (includes providerType wrapper)
 */
const jiraVerifySchema = yup.object({
  providerType: yup
    .string()
    .trim()
    .required('Provider type is required')
    .test('valid-provider-type',
      `Provider type must be '${ProjectManagementProviderType.JIRA}'`,
      (value) => {
        if (!value) return true;
        return value.toUpperCase() === ProjectManagementProviderType.JIRA;
      }
    ),
  config: jiraConfigFieldsSchema.required('Config is required')
});

/**
 * Validate Jira verify request with Yup
 * Returns ValidationResult with either validated data or errors
 * Note: Controller should add "verified: false" to error response
 */
export const validateJiraVerifyRequest = async (
  data: unknown
): Promise<ValidationResult<yup.InferType<typeof jiraVerifySchema>>> => {
  return validateWithYup(jiraVerifySchema, data);
};

/**
 * Validate Jira config with Yup (for CREATE operations)
 * Returns ValidationResult with either validated data or errors
 */
export const validateJiraConfig = async (
  config: unknown
): Promise<ValidationResult<yup.InferType<typeof jiraConfigFieldsSchema>>> => {
  return validateWithYup(jiraConfigFieldsSchema, config);
};

/**
 * Yup schema for Jira UPDATE (all fields optional but validated if present)
 */
const jiraUpdateConfigSchema = yup.object({
  baseUrl: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Base URL cannot be empty if provided')
    .url('Base URL must be a valid URL (e.g., https://yourcompany.atlassian.net)'),
  email: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Email cannot be empty if provided')
    .email('Email must be a valid email address'),
  apiToken: yup
    .string()
    .trim()
    .optional()
    .min(1, 'API Token cannot be empty if provided'),
  jiraType: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Jira type cannot be empty if provided')
    .test('valid-jira-type',
      "Jira type must be one of: 'CLOUD', 'SERVER', 'DATA_CENTER'",
      (value) => {
        if (!value) return true;
        const validTypes = ['CLOUD', 'SERVER', 'DATA_CENTER'];
        return validTypes.includes(value.toUpperCase());
      }
    )
    .transform((value) => value ? value.toUpperCase() : value)
});

/**
 * Validate Jira config with Yup (for UPDATE operations)
 * Validates only fields that are present (partial update)
 * Returns ValidationResult with either validated data or errors
 */
export const validateJiraUpdateConfig = async (
  config: unknown
): Promise<ValidationResult<yup.InferType<typeof jiraUpdateConfigSchema>>> => {
  return validateWithYup(jiraUpdateConfigSchema, config);
};
