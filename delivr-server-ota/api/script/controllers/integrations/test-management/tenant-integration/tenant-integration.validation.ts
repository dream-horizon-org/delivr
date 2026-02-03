import { TestManagementProviderType } from '~types/integrations/test-management';
import { hasProperty } from '~utils/type-guards.utils';
import * as yup from 'yup';
import { validateWithYup } from '~utils/validation.utils';
import type { ValidationResult } from '~types/validation/validation-result.interface';

/**
 * Validation utilities for tenant integration test management
 */

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
 * Validate config structure based on provider type (for non-Checkmate providers)
 * Returns error message if invalid, null if valid
 * NOTE: Checkmate uses Yup validation
 * TODO: Implement Yup validation for TESTRAIL and other providers, then remove this function
 */
export const validateConfigStructure = (
  config: unknown,
  providerType: string
): string | null => {
  const isValidObject = typeof config === 'object' && config !== null;

  if (!isValidObject) {
    return 'config must be a non-null object';
  }

  // Basic validation only - other providers not implemented yet
  // When implementing TESTRAIL or other providers, use Yup validation instead
  return null;
};

/**
 * Validate partial config structure (for UPDATE operations - non-Checkmate providers)
 * Currently used as a fallback for providers without Yup validation
 * NOTE: Checkmate uses Yup validation (validateCheckmateUpdateConfig)
 * TODO: Implement Yup validation for TESTRAIL and other providers, then remove this function
 */
export const validatePartialConfigStructure = (
  config: unknown,
  providerType: string
): string | null => {
  const isValidObject = typeof config === 'object' && config !== null;

  if (!isValidObject) {
    return 'config must be a non-null object';
  }

  // Basic validation only - other providers (TESTRAIL, etc.) not implemented yet
  // When implementing, use Yup validation similar to Checkmate instead of this function
  return null;
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

/* ==================== YUP VALIDATION SCHEMAS ==================== */

/**
 * Checkmate config fields schema (reusable for CREATE and UPDATE)
 */
const checkmateConfigFieldsSchema = yup.object({
  baseUrl: yup
    .string()
    .trim()
    .required('Base URL is required')
    .url('Base URL must be a valid URL (e.g., https://checkmate.example.com)'),
  authToken: yup
    .string()
    .trim()
    .required('Auth Token is required'),
  orgId: yup
    .number()
    .typeError('Organization ID must be a number')
    .required('Organization ID is required')
    .positive('Organization ID must be a positive number')
});



/**
 * Validate Checkmate verify request with Yup
 * Returns ValidationResult with either validated data or errors
 * Note: Controller should add "verified: false" to error response
 */
export const validateCheckmateVerifyRequest = async (
  data: unknown
): Promise<ValidationResult<yup.InferType<typeof checkmateConfigFieldsSchema>>> => {
  return validateWithYup(checkmateConfigFieldsSchema, data);
};

/**
 * Validate Checkmate config with Yup (for CREATE operations)
 * Returns ValidationResult with either validated data or errors
 */
export const validateCheckmateConfig = async (
  config: unknown
): Promise<ValidationResult<yup.InferType<typeof checkmateConfigFieldsSchema>>> => {
  return validateWithYup(checkmateConfigFieldsSchema, config);
};

/**
 * Yup schema for Checkmate UPDATE (all fields optional but validated if present)
 */
const checkmateUpdateConfigSchema = yup.object({
  baseUrl: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Base URL cannot be empty if provided')
    .url('Base URL must be a valid URL (e.g., https://checkmate.example.com)'),
  authToken: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Auth Token cannot be empty if provided'),
  orgId: yup
    .number()
    .typeError('Organization ID must be a number')
    .optional()
    .positive('Organization ID must be a positive number')
    .integer('Organization ID must be an integer')
});

/**
 * Validate Checkmate config with Yup (for UPDATE operations)
 * Validates only fields that are present (partial update)
 * Returns ValidationResult with either validated data or errors
 */
export const validateCheckmateUpdateConfig = async (
  config: unknown
): Promise<ValidationResult<yup.InferType<typeof checkmateUpdateConfigSchema>>> => {
  return validateWithYup(checkmateUpdateConfigSchema, config);
};

/**
 * Unified validation for VERIFY operation
 * Currently only CHECKMATE is implemented with Yup validation
 * Returns ValidationResult or passes through for non-Checkmate providers
 * TODO: Implement Yup validation for TESTRAIL and other providers
 */
export const validateVerifyRequest = async (
  body: any,
  providerType: TestManagementProviderType
): Promise<ValidationResult<any> | { success: true; data: any }> => {
  // CHECKMATE: Use Yup validation
  if (providerType === TestManagementProviderType.CHECKMATE) {
    const validationResult = await validateCheckmateVerifyRequest(body.config);
    if (!validationResult.success) {
      return validationResult;
    }
    return { success: true, data: { config: validationResult.data } };
  }

  // OTHER PROVIDERS (TESTRAIL, etc.): Not implemented yet, just pass through
  // When implementing, create Yup schemas similar to Checkmate
  const { config } = body;
  return { success: true, data: { config } };
};
