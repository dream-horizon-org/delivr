/**
 * Validation utilities for test management config
 */

import * as yup from 'yup';
import type { Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import { TEST_PLATFORMS } from '~types/integrations/test-management/platform.interface';
import { isValidTestPlatform } from '~types/integrations/test-management/platform.utils';

/**
 * Field error structure for detailed validation feedback
 */
export type FieldError = {
  field: string;
  message: string;
};

/**
 * Custom error class for Test Management Config validation
 * Collects all validation errors and provides structured error response
 */
export class TestManagementConfigValidationError extends Error {
  readonly integration: string = 'testManagement';
  readonly errors: FieldError[];

  constructor(errors: FieldError[]) {
    super('Test Management configuration validation failed');
    this.name = 'TestManagementConfigValidationError';
    this.errors = errors;
  }
}

/* ==================== YUP VALIDATION SCHEMAS ==================== */

/**
 * Generic Yup validation helper
 * Validates data against schema and returns validated data or null
 * Sends error response directly to client if validation fails
 */
async function validateWithYup<T>(
  schema: yup.Schema<T>,
  data: unknown,
  res: Response
): Promise<T | null> {
  try {
    const validated = await schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });
    return validated;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      // Group errors by field
      const errorsByField = new Map<string, string[]>();
      error.inner.forEach((err) => {
        const field = err.path || 'unknown';
        if (!errorsByField.has(field)) {
          errorsByField.set(field, []);
        }
        errorsByField.get(field)!.push(err.message);
      });
      
      // Format as array of field errors
      const details = Array.from(errorsByField.entries()).map(([field, messages]) => ({
        field,
        messages
      }));
      
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Request validation failed',
        details: details
      });
      return null;
    }
    
    // Unexpected validation error
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Validation error occurred',
      details: []
    });
    return null;
  }
}

/**
 * Platform configuration schema (nested in array)
 */
const platformConfigSchema = yup.object({
  platform: yup
    .string()
    .required('platform is required')
    .test('valid-platform', `platform must be one of: ${TEST_PLATFORMS.join(', ')}`, (value) => {
      return value ? isValidTestPlatform(value) : false;
    }),
  parameters: yup
    .object({
      projectId: yup
        .number()
        .required('projectId is required')
        .positive('projectId must be a positive number')
        .typeError('projectId must be a number')
    })
    .required('parameters is required')
});

/**
 * CREATE schema - All fields required
 */
const testManagementConfigCreateSchema = yup.object({
  tenantId: yup
    .string()
    .required('tenantId is required and must be a non-empty string')
    .trim()
    .min(1, 'tenantId cannot be empty'),
  
  integrationId: yup
    .string()
    .required('integrationId is required and must be a non-empty string')
    .trim()
    .min(1, 'integrationId cannot be empty'),
  
  name: yup
    .string()
    .required('name is required')
    .trim()
    .min(1, 'name cannot be empty')
    .max(255, 'name cannot exceed 255 characters'),
  
  passThresholdPercent: yup
    .number()
    .required('passThresholdPercent is required')
    .typeError('passThresholdPercent must be a number')
    .integer('passThresholdPercent must be an integer (decimals not supported)')
    .min(0, 'passThresholdPercent must be between 0 and 100')
    .max(100, 'passThresholdPercent must be between 0 and 100'),
  
  platformConfigurations: yup
    .array()
    .of(platformConfigSchema)
    .required('platformConfigurations is required')
    .min(1, 'platformConfigurations must contain at least one configuration')
    .test('unique-platforms', 'Duplicate platform detected. Each platform can only be configured once.', function(value) {
      if (!value || value.length === 0) return true;
      
      const platforms = value.map((v: any) => v.platform);
      const uniquePlatforms = new Set(platforms);
      
      if (platforms.length !== uniquePlatforms.size) {
        // Find the duplicate platform for better error message
        const seen = new Set<string>();
        const duplicate = platforms.find((p: string) => {
          if (seen.has(p)) return true;
          seen.add(p);
          return false;
        });
        
        return this.createError({
          message: `Duplicate platform '${duplicate}'. Each platform can only be configured once.`
        });
      }
      
      return true;
    })
});

/**
 * UPDATE schema - All fields optional but validated if present
 */
const testManagementConfigUpdateSchema = yup.object({
  name: yup
    .string()
    .optional()
    .trim()
    .min(1, 'name cannot be empty if provided'),
  
  passThresholdPercent: yup
    .number()
    .optional()
    .typeError('passThresholdPercent must be a number')
    .integer('passThresholdPercent must be an integer (decimals not supported)')
    .min(0, 'passThresholdPercent must be between 0 and 100')
    .max(100, 'passThresholdPercent must be between 0 and 100'),
  
  platformConfigurations: yup
    .array()
    .of(platformConfigSchema)
    .optional()
    .min(1, 'platformConfigurations must contain at least one configuration if provided')
    .test('unique-platforms', 'Duplicate platform detected. Each platform can only be configured once.', function(value) {
      if (!value || value.length === 0) return true;
      
      const platforms = value.map((v: any) => v.platform);
      const uniquePlatforms = new Set(platforms);
      
      if (platforms.length !== uniquePlatforms.size) {
        // Find the duplicate platform for better error message
        const seen = new Set<string>();
        const duplicate = platforms.find((p: string) => {
          if (seen.has(p)) return true;
          seen.add(p);
          return false;
        });
        
        return this.createError({
          message: `Duplicate platform '${duplicate}'. Each platform can only be configured once.`
        });
      }
      
      return true;
    })
});

/**
 * Validate configuration for CREATE operation with Yup
 * Returns validated data or null (sends error response automatically)
 */
export const validateCreateConfig = async (
  data: unknown,
  res: Response
): Promise<yup.InferType<typeof testManagementConfigCreateSchema> | null> => {
  return validateWithYup(testManagementConfigCreateSchema, data, res);
};

/**
 * Validate configuration for UPDATE operation with Yup
 * Returns validated data or null (sends error response automatically)
 */
export const validateUpdateConfig = async (
  data: unknown,
  res: Response
): Promise<yup.InferType<typeof testManagementConfigUpdateSchema> | null> => {
  return validateWithYup(testManagementConfigUpdateSchema, data, res);
};

/**
 * Validate tenant ID (simple validation for route parameters)
 * Returns error message if invalid, null if valid
 * Used in listConfigsByTenantHandler for route parameter validation
 */
export const validateTenantId = (value: unknown): string | null => {
  const isString = typeof value === 'string';

  if (!isString) {
    return 'tenantId must be a string';
  }

  const idLength = value.length;
  const idEmpty = idLength === 0;

  if (idEmpty) {
    return 'tenantId cannot be empty';
  }

  return null;
};

