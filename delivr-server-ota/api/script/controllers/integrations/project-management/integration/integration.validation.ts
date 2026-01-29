/**
 * Project Management Integration Validation
 */

import * as yup from 'yup';
import type { Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import { ProjectManagementProviderType } from '~types/integrations/project-management';
import { validationErrorResponse } from '~utils/response.utils';
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
 * TODO: Implement Yup validation for LINEAR and other providers
 */
export const validateVerifyRequest = async (
  body: any,
  providerType: ProjectManagementProviderType,
  res: Response
): Promise<any | null> => {
  // JIRA: Use Yup validation
  if (providerType.toUpperCase() === ProjectManagementProviderType.JIRA) {
    return await validateJiraVerifyRequest(body, res);
  }

  // OTHER PROVIDERS (LINEAR, etc.): Not implemented yet, just pass through
  // When implementing, create Yup schemas similar to Jira
  const { config } = body;
  return { config };
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
      
      // Only include "verified: false" for verify operations
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
    
    // Only include "verified: false" for verify operations
    if (includeVerifiedField) {
      errorResponse.verified = false;
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
    return null;
  }
}

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
 * Includes "verified: false" in error responses
 */
export const validateJiraVerifyRequest = async (
  data: unknown,
  res: Response
): Promise<yup.InferType<typeof jiraVerifySchema> | null> => {
  return validateWithYup(jiraVerifySchema, data, res, true); // true = include "verified" field
};

/**
 * Validate Jira config with Yup (for CREATE operations)
 * Does NOT include "verified" field in error responses
 */
export const validateJiraConfig = async (
  config: unknown,
  res: Response
): Promise<yup.InferType<typeof jiraConfigFieldsSchema> | null> => {
  return validateWithYup(jiraConfigFieldsSchema, config, res, false); // false = no "verified" field
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
 * Does NOT include "verified" field in error responses
 */
export const validateJiraUpdateConfig = async (
  config: unknown,
  res: Response
): Promise<yup.InferType<typeof jiraUpdateConfigSchema> | null> => {
  return validateWithYup(jiraUpdateConfigSchema, config, res, false); // false = no "verified" field
};
