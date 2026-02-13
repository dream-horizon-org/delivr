/**
 * Slack Integration Validation
 * Input validation for integration endpoints
 */

import * as yup from 'yup';
import { validateWithYup } from '~utils/validation.utils';
import type { ValidationResult } from '~types/validation/validation-result.interface';

/* ==================== YUP VALIDATION SCHEMAS ==================== */

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
 * Returns ValidationResult with either validated data or errors
 * Note: Controller should add "verified: false" to error response
 */
export const validateSlackVerifyRequest = async (
  data: unknown
): Promise<ValidationResult<yup.InferType<typeof slackVerifySchema>>> => {
  return validateWithYup(slackVerifySchema, data);
};

/**
 * Validate Slack config with Yup (for CREATE operations)
 * Returns ValidationResult with either validated data or errors
 */
export const validateSlackConfig = async (
  data: unknown
): Promise<ValidationResult<yup.InferType<typeof slackConfigSchema>>> => {
  return validateWithYup(slackConfigSchema, data);
};

/**
 * Validate Slack config with Yup (for UPDATE operations)
 * Validates only fields that are present (partial update)
 * Returns ValidationResult with either validated data or errors
 */
export const validateSlackUpdateConfig = async (
  data: unknown
): Promise<ValidationResult<yup.InferType<typeof slackUpdateSchema>>> => {
  return validateWithYup(slackUpdateSchema, data);
};

