import { TestManagementProviderType } from '~types/integrations/test-management';
import { hasProperty } from '~utils/type-guards.utils';
import * as yup from 'yup';
import type { Response } from 'express';
import { HTTP_STATUS } from '~constants/http';

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
 * Generic Yup validation helper
 * Validates data against schema and returns formatted errors
 * @param includeVerifiedField - Whether to include "verified" field in error response (true for verify operations only)
 */
async function validateWithYup<T>(
  schema: yup.Schema<T>,
  data: unknown,
  res: Response,
  includeVerifiedField: boolean = false
): Promise<T | null> {
  try {
    const validated = await schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });
    return validated;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errorsByField = new Map<string, string[]>();
      error.inner.forEach((err) => {
        const field = err.path || 'unknown';
        if (!errorsByField.has(field)) {
          errorsByField.set(field, []);
        }
        errorsByField.get(field)!.push(err.message);
      });
      const details = Array.from(errorsByField.entries()).map(([field, messages]) => ({
        field,
        messages
      }));
      
      const errorResponse: any = {
        success: false,
        error: 'Request validation failed',
        details: details
      };
      
      if (includeVerifiedField) {
        errorResponse.verified = false;
      }
      
      res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse);
      return null;
    }
    
    const errorResponse: any = {
      success: false,
      error: 'Validation error occurred',
      details: []
    };
    
    if (includeVerifiedField) {
      errorResponse.verified = false;
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
    return null;
  }
}

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
 * Includes "verified: false" in error responses
 */
export const validateCheckmateVerifyRequest = async (
  data: unknown,
  res: Response
): Promise<yup.InferType<typeof checkmateConfigFieldsSchema> | null> => {
  return validateWithYup(checkmateConfigFieldsSchema, data, res, true); // true = include "verified" field
};

/**
 * Validate Checkmate config with Yup (for CREATE operations)
 * Does NOT include "verified" field in error responses
 */
export const validateCheckmateConfig = async (
  config: unknown,
  res: Response
): Promise<yup.InferType<typeof checkmateConfigFieldsSchema> | null> => {
  return validateWithYup(checkmateConfigFieldsSchema, config, res, false); // false = no "verified" field
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
 * Does NOT include "verified" field in error responses
 */
export const validateCheckmateUpdateConfig = async (
  config: unknown,
  res: Response
): Promise<yup.InferType<typeof checkmateUpdateConfigSchema> | null> => {
  return validateWithYup(checkmateUpdateConfigSchema, config, res, false); // false = no "verified" field
};

/**
 * Unified validation for VERIFY operation
 * Currently only CHECKMATE is implemented with Yup validation
 * TODO: Implement Yup validation for TESTRAIL and other providers
 */
export const validateVerifyRequest = async (
  body: any,
  providerType: TestManagementProviderType,
  res: Response
): Promise<any | null> => {
  // CHECKMATE: Use Yup validation
  if (providerType === TestManagementProviderType.CHECKMATE) {
    const validatedConfig = await validateCheckmateVerifyRequest(body.config, res);
    if (!validatedConfig) {
      return null;
    }
    return { config: validatedConfig };
  }

  // OTHER PROVIDERS (TESTRAIL, etc.): Not implemented yet, just pass through
  // When implementing, create Yup schemas similar to Checkmate
  const { config } = body;
  return { config };
};
