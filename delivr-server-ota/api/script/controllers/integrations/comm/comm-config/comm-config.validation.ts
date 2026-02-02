/**
 * Slack Channel Configuration Validation
 * Input validation for channel config endpoints
 */

import * as yup from 'yup';
import type { Response } from 'express';
import { HTTP_STATUS } from '~constants/http';

/**
 * Field error type for structured validation errors
 */
export type FieldError = {
  field: string;
  message: string;
};

/**
 * Generic Yup validation helper
 * Validates data against a Yup schema and sends error response if validation fails
 * Returns validated data or null (automatically sends error response)
 */
const validateWithYup = async <T>(
  schema: yup.Schema<T>,
  data: unknown,
  res: Response
): Promise<T | null> => {
  try {
    const validated = await schema.validate(data, { abortEarly: false });
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

      // Convert to array format with messages (plural)
      const details = Array.from(errorsByField.entries()).map(([field, messages]) => ({
        field,
        messages
      }));

      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Request validation failed',
        details
      });
      return null;
    }
    throw error;
  }
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
    }, {} as Record<string, any>)
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
      } catch (err: any) {
        return this.createError({ message: err.message });
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
 * Returns validated data or null (sends error response automatically)
 */
export const validateCreateConfig = async (
  data: unknown,
  res: Response
): Promise<yup.InferType<typeof commConfigCreateSchema> | null> => {
  return validateWithYup(commConfigCreateSchema, data, res);
};

/**
 * Validate configuration for UPDATE operation with Yup
 * Returns validated data or null (sends error response automatically)
 */
export const validateUpdateConfig = async (
  data: unknown,
  res: Response
): Promise<yup.InferType<typeof commConfigUpdateSchema> | null> => {
  return validateWithYup(commConfigUpdateSchema, data, res);
};

