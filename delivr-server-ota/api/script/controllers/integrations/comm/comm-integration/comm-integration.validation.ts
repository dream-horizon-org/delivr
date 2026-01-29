/**
 * Slack Integration Validation
 * Input validation for integration endpoints
 */

import * as yup from 'yup';
import type { Response } from 'express';
import { HTTP_STATUS } from '~constants/http';

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
 * Yup schema for Slack verification (stateless verify)
 */
const slackVerifySchema = yup.object({
  botToken: yup
    .string()
    .trim()
    .required('Bot token is required'),
  _encrypted: yup.boolean().optional()
});

/**
 * Yup schema for Slack CREATE
 */
const slackConfigSchema = yup.object({
  botToken: yup
    .string()
    .trim()
    .required('Bot token is required'),
  botUserId: yup.string().trim().optional(),
  workspaceId: yup.string().trim().optional(),
  workspaceName: yup.string().trim().optional(),
  _encrypted: yup.boolean().optional()
});

/**
 * Yup schema for Slack UPDATE (all fields optional but validated if present)
 */
const slackUpdateSchema = yup.object({
  botToken: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Bot token cannot be empty if provided'),
  botUserId: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Bot user ID cannot be empty if provided'),
  workspaceId: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Workspace ID cannot be empty if provided'),
  workspaceName: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Workspace name cannot be empty if provided'),
  _encrypted: yup.boolean().optional()
});

/**
 * Validate Slack verify request with Yup
 * Includes "verified: false" in error responses
 */
export const validateSlackVerifyRequest = async (
  data: unknown,
  res: Response
): Promise<yup.InferType<typeof slackVerifySchema> | null> => {
  return validateWithYup(slackVerifySchema, data, res, true); // true = include "verified" field
};

/**
 * Validate Slack config with Yup (for CREATE operations)
 * Does NOT include "verified" field in error responses
 */
export const validateSlackConfig = async (
  data: unknown,
  res: Response
): Promise<yup.InferType<typeof slackConfigSchema> | null> => {
  return validateWithYup(slackConfigSchema, data, res, false); // false = no "verified" field
};

/**
 * Validate Slack config with Yup (for UPDATE operations)
 * Validates only fields that are present (partial update)
 * Does NOT include "verified" field in error responses
 */
export const validateSlackUpdateConfig = async (
  data: unknown,
  res: Response
): Promise<yup.InferType<typeof slackUpdateSchema> | null> => {
  return validateWithYup(slackUpdateSchema, data, res, false); // false = no "verified" field
};

