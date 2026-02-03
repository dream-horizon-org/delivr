/**
 * Project Management Configuration Validation
 */

import * as yup from 'yup';
import { validateWithYup } from '~utils/validation.utils';
import type { ValidationResult } from '~types/validation/validation-result.interface';
import { isValidPlatform, Platform, type PlatformConfiguration } from '~types/integrations/project-management';
import {
  CONFIG_NAME_MIN_LENGTH,
  CONFIG_NAME_MAX_LENGTH
} from './configuration.constants';

/**
 * Validated configuration data for CREATE operation
 * Platform is transformed to enum by Yup schema
 */
export type ValidatedCreateConfig = {
  name: string;
  integrationId: string;
  platformConfigurations: PlatformConfiguration[];
};

/**
 * Validated configuration data for UPDATE operation
 * Platform is transformed to enum by Yup schema
 */
export type ValidatedUpdateConfig = {
  name?: string;
  platformConfigurations?: PlatformConfiguration[];
};

/**
 * Field error structure for detailed validation feedback
 */
export type FieldError = {
  field: string;
  message: string;
};

/**
 * Platform configuration schema (for nested array validation)
 */
const platformConfigSchema = yup.object({
  platform: yup
    .string()
    .required('Platform is required')
    .test('valid-platform', 'Invalid platform', (value) => {
      return value ? isValidPlatform(value) : false;
    })
    .transform((value) => value as Platform),
  parameters: yup.object({
    projectKey: yup
      .string()
      .required('Project key is required')
      .min(1, 'Project key cannot be empty'),
    completedStatus: yup
      .string()
      .required('Completed status is required')
      .min(1, 'Completed status cannot be empty'),
    issueType: yup.string().optional(),
    priority: yup.string().optional(),
    labels: yup.array().of(yup.string()).optional(),
    assignee: yup.string().optional()
  }).required('Parameters object is required')
});

/**
 * Project Management Config CREATE schema
 * All fields are required for creating a new configuration
 */
const projectManagementConfigCreateSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(CONFIG_NAME_MIN_LENGTH, `Name must be at least ${CONFIG_NAME_MIN_LENGTH} characters`)
    .max(CONFIG_NAME_MAX_LENGTH, `Name must not exceed ${CONFIG_NAME_MAX_LENGTH} characters`)
    .transform((value) => value?.trim()),
  integrationId: yup
    .string()
    .required('Integration ID is required')
    .min(1, 'Integration ID cannot be empty'),
  platformConfigurations: yup
    .array()
    .of(platformConfigSchema)
    .required('Platform configurations are required')
    .min(1, 'At least one platform configuration is required')
    .test('unique-platforms', 'Duplicate platform detected. Each platform can only be configured once.', function(value) {
      if (!value || value.length === 0) return true;
      
      const platforms = value.map((v) => (v as { platform: string }).platform);
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
 * Project Management Config UPDATE schema
 * All fields are optional since this is for partial updates
 */
const projectManagementConfigUpdateSchema = yup.object({
  name: yup
    .string()
    .optional()
    .min(CONFIG_NAME_MIN_LENGTH, `Name must be at least ${CONFIG_NAME_MIN_LENGTH} characters`)
    .max(CONFIG_NAME_MAX_LENGTH, `Name must not exceed ${CONFIG_NAME_MAX_LENGTH} characters`)
    .transform((value) => value?.trim()),
  platformConfigurations: yup
    .array()
    .of(platformConfigSchema)
    .optional()
    .min(1, 'platformConfigurations must contain at least one configuration if provided')
    .test('unique-platforms', 'Duplicate platform detected. Each platform can only be configured once.', function(value) {
      if (!value || value.length === 0) return true;
      
      const platforms = value.map((v) => (v as { platform: string }).platform);
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
 * Returns ValidationResult with either validated data or errors
 */
export const validateCreateConfig = async (
  data: unknown
): Promise<ValidationResult<ValidatedCreateConfig>> => {
  const result = await validateWithYup(projectManagementConfigCreateSchema, data);
  // Type assertion is safe because Yup transform converts string to Platform enum
  return result as ValidationResult<ValidatedCreateConfig>;
};

/**
 * Validate configuration for UPDATE operation with Yup
 * Returns ValidationResult with either validated data or errors
 */
export const validateUpdateConfig = async (
  data: unknown
): Promise<ValidationResult<ValidatedUpdateConfig>> => {
  const result = await validateWithYup(projectManagementConfigUpdateSchema, data);
  // Type assertion is safe because Yup transform converts string to Platform enum
  return result as ValidationResult<ValidatedUpdateConfig>;
};

