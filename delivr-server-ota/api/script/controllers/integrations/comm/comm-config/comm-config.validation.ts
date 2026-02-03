/**
 * Slack Channel Configuration Validation
 * Input validation for channel config endpoints
 */

import * as yup from 'yup';
import { validateWithYup } from '~utils/validation.utils';
import type { ValidationResult } from '~types/validation/validation-result.interface';

/**
 * Field error type for structured validation errors
 */
export type FieldError = {
  field: string;
  message: string;
};

/**
 * Channel schema (for nested array validation)
 */
const channelSchema = yup.object({
  id: yup
    .string()
    .required('Channel ID is required')
    .min(1, 'Channel ID cannot be empty'),
  name: yup
    .string()
    .required('Channel name is required')
    .min(1, 'Channel name cannot be empty')
});

/**
 * Stage channel mapping schema
 * Validates that channelData is an object with at least one stage, and each stage has an array of channels
 */
const stageChannelMappingSchema = yup.lazy((obj) =>
  yup.object(
    Object.keys(obj || {}).reduce((acc, key) => {
      acc[key] = yup
        .array()
        .of(channelSchema)
        .required(`Channels for stage '${key}' are required`)
        .min(1, `At least one channel is required for stage '${key}'`);
      return acc;
    }, {} as Record<string, yup.AnySchema>)
  ).test('at-least-one-stage', 'At least one stage must be configured', (value) => {
    return value && Object.keys(value).length > 0;
  })
);

/**
 * Slack Config CREATE schema
 * All fields are required for creating a new configuration
 */
const commConfigCreateSchema = yup.object({
  tenantId: yup
    .string()
    .required('Tenant ID is required')
    .min(1, 'Tenant ID cannot be empty'),
  channelData: yup
    .mixed()
    .required('Channel data is required')
    .test('valid-channel-data', 'Invalid channel data', function(value) {
      if (!value || typeof value !== 'object') {
        return this.createError({ message: 'Channel data must be an object' });
      }
      const stages = Object.keys(value);
      if (stages.length === 0) {
        return this.createError({ message: 'At least one stage must be configured' });
      }
      return true;
    })
    .test('valid-stages', 'Invalid stage configuration', async function(value) {
      if (!value || typeof value !== 'object') return true; // Already checked above
      
      try {
        await stageChannelMappingSchema.validate(value);
        return true;
      } catch (err: unknown) {
        return this.createError({ message: err instanceof Error ? err.message : 'validation failed' });
      }
    })
});

/**
 * Slack Config UPDATE schema
 * All fields are required for updating stage channels
 */
const commConfigUpdateSchema = yup.object({
  id: yup
    .string()
    .required('Configuration ID is required')
    .min(1, 'Configuration ID cannot be empty'),
  stage: yup
    .string()
    .required('Stage name is required')
    .min(1, 'Stage name cannot be empty'),
  action: yup
    .string()
    .required('Action is required')
    .oneOf(['add', 'remove'], 'Action must be either "add" or "remove"'),
  channels: yup
    .array()
    .of(channelSchema)
    .required('Channels are required')
    .min(1, 'At least one channel is required')
});

/**
 * Validate configuration for CREATE operation with Yup
 * Returns ValidationResult with either validated data or errors
 */
export const validateCreateConfig = async (
  data: unknown
): Promise<ValidationResult<yup.InferType<typeof commConfigCreateSchema>>> => {
  return validateWithYup(commConfigCreateSchema, data);
};

/**
 * Validate configuration for UPDATE operation with Yup
 * Returns ValidationResult with either validated data or errors
 */
export const validateUpdateConfig = async (
  data: unknown
): Promise<ValidationResult<yup.InferType<typeof commConfigUpdateSchema>>> => {
  return validateWithYup(commConfigUpdateSchema, data);
};

