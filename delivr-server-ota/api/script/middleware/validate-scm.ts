/**
 * SCM Integration Validation Middleware
 * Validates request parameters for SCM integrations
 */

import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http';
import * as yup from 'yup';
import type { ValidationResult } from '~types/validation/validation-result.interface';
import { validationErrorsResponse, simpleErrorResponse } from '../utils/response.utils';

// ============================================================================
// HELPERS
// ============================================================================

const isNonEmptyString = (value: unknown): value is string => {
  const isString = typeof value === 'string';
  const trimmed = isString ? value.trim() : '';
  const isNonEmpty = trimmed.length > 0;
  return isString && isNonEmpty;
};

// ============================================================================
// YUP SCHEMAS
// ============================================================================

const githubVerifySchema = yup.object({
  owner: yup
    .string()
    .trim()
    .required('GitHub owner is required')
    .max(39, 'GitHub owner cannot exceed 39 characters')
    .test(
      'valid-github-owner',
      'GitHub owner can only contain alphanumeric characters and hyphens, cannot start/end with hyphen',
      (value) => {
        if (!value) return true; // Skip validation if empty (required() handles it)
        return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(value);
      }
    ),
  repo: yup
    .string()
    .trim()
    .required('GitHub repository name is required')
    .max(100, 'Repository name cannot exceed 100 characters'),
  
  accessToken: yup
    .string()
    .trim()
    .required('GitHub access token is required'),
  
  _encrypted: yup
    .boolean()
    .optional()
    .default(false)
});

const githubCreateSchema = yup.object({
  owner: yup
    .string()
    .trim()
    .required('GitHub owner is required')
    .max(39, 'GitHub owner cannot exceed 39 characters')
    .test(
      'valid-github-owner',
      'GitHub owner can only contain alphanumeric characters and hyphens, cannot start/end with hyphen',
      (value) => {
        if (!value) return true; // Skip validation if empty (required() handles it)
        return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(value);
      }
    ),
  
  repo: yup
    .string()
    .trim()
    .required('GitHub repository name is required')
    .max(100, 'Repository name cannot exceed 100 characters'),
  
  accessToken: yup
    .string()
    .trim()
    .required('GitHub access token is required'),
  
  displayName: yup
    .string()
    .trim()
    .optional(),
  
  defaultBranch: yup
    .string()
    .trim()
    .max(100, 'Default branch cannot exceed 100 characters')
    .optional()
    .default('main'),
  
  webhookEnabled: yup
    .boolean()
    .optional()
    .default(false),
  
  webhookSecret: yup
    .string()
    .trim()
    .when('webhookEnabled', {
      is: true,
      then: (schema) => schema.required('Webhook secret is required when webhook is enabled'),
      otherwise: (schema) => schema.optional()
    }),
  
  webhookUrl: yup
    .string()
    .trim()
    .url('Webhook URL must be a valid URL')
    .when('webhookEnabled', {
      is: true,
      then: (schema) => schema.required('Webhook URL is required when webhook is enabled'),
      otherwise: (schema) => schema.optional()
    }),
  
  senderLogin: yup
    .string()
    .trim()
    .max(100, 'Sender login cannot exceed 100 characters')
    .optional(),
  
  _encrypted: yup
    .boolean()
    .optional()
    .default(false)
});

const githubUpdateSchema = yup.object({
  owner: yup
    .string()
    .trim()
    .optional()
    .min(1, 'GitHub owner cannot be empty if provided')
    .max(39, 'GitHub owner cannot exceed 39 characters')
    .test(
      'valid-github-owner',
      'GitHub owner can only contain alphanumeric characters and hyphens, cannot start/end with hyphen',
      (value) => {
        if (!value) return true; // Skip validation if empty
        return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(value);
      }
    ),
  
  repo: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Repository name cannot be empty if provided')
    .max(100, 'Repository name cannot exceed 100 characters'),
  
  accessToken: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Access token cannot be empty if provided'),
  
  displayName: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Display name cannot be empty if provided'),
  
  defaultBranch: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Default branch cannot be empty if provided')
    .max(100, 'Default branch cannot exceed 100 characters'),
  
  webhookEnabled: yup
    .boolean()
    .optional(),
  
  webhookSecret: yup
    .string()
    .trim()
    .when('webhookEnabled', {
      is: true,
      then: (schema) => schema.required('Webhook secret is required when webhook is enabled'),
      otherwise: (schema) => schema.optional()
    }),
  
  webhookUrl: yup
    .string()
    .trim()
    .url('Webhook URL must be a valid URL')
    .when('webhookEnabled', {
      is: true,
      then: (schema) => schema.required('Webhook URL is required when webhook is enabled'),
      otherwise: (schema) => schema.optional()
    }),
  
  senderLogin: yup
    .string()
    .trim()
    .max(100, 'Sender login cannot exceed 100 characters')
    .optional(),
  
  _encrypted: yup
    .boolean()
    .optional()
    .default(false)
}).test(
  'at-least-one-field',
  'At least one field must be provided for update',
  (value) => {
    const fields = Object.keys(value || {}).filter(key => key !== '_encrypted');
    return fields.length > 0;
  }
);

// ============================================================================
// YUP VALIDATOR HELPER
// ============================================================================

async function validateWithYup<T>(
  schema: yup.Schema<T>,
  data: unknown
): Promise<ValidationResult<T>> {
  try {
    const validated = await schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });
    return { success: true, data: validated };
  } catch (error: unknown) {
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

      // Convert to ValidationError array format
      const errors = Array.from(errorsByField.entries()).map(([field, messages]) => ({
        field,
        messages
      }));

      return { success: false, errors };
    }
    
    // Unexpected error - rethrow to be handled by caller
    throw error;
  }
}

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

export const validateTenantId = (req: Request, res: Response, next: NextFunction): void => {
  const tenantId = req.params.tenantId;
  const isTenantIdInvalid = !isNonEmptyString(tenantId);
  
  if (isTenantIdInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('tenantId is required', 'validation_failed')
    );
    return;
  }
  
  next();
};

// ============================================================================
// GITHUB VALIDATORS
// ============================================================================

export const validateGitHubVerifyBody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validationResult = await validateWithYup(githubVerifySchema, req.body);
  if (validationResult.success === false) {
    const errorsWithCode = validationResult.errors.map(err => ({ ...err, errorCode: 'validation_failed' }));
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      ...validationErrorsResponse('Request validation failed', errorsWithCode),
      verified: false
    });
    return;
  }
  req.body = validationResult.data;  // ✅ Replace with trimmed values
  next();
};

export const validateCreateGitHubBody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validationResult = await validateWithYup(githubCreateSchema, req.body);
  if (validationResult.success === false) {
    const errorsWithCode = validationResult.errors.map(err => ({ ...err, errorCode: 'validation_failed' }));
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      validationErrorsResponse('Request validation failed', errorsWithCode)
    );
    return;
  }
  req.body = validationResult.data;  // ✅ Replace with trimmed values
  next();
};

export const validateUpdateGitHubBody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validationResult = await validateWithYup(githubUpdateSchema, req.body);
  if (validationResult.success === false) {
    const errorsWithCode = validationResult.errors.map(err => ({ ...err, errorCode: 'validation_failed' }));
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      validationErrorsResponse('Request validation failed', errorsWithCode)
    );
    return;
  }
  req.body = validationResult.data;  // ✅ Replace with trimmed values
  next();
};

// ============================================================================
// GITLAB VALIDATORS (Stub for future implementation)
// ============================================================================

export const validateGitLabVerifyBody = (req: Request, res: Response, next: NextFunction): void => {
  const { projectId, accessToken } = req.body || {};
  
  const isProjectIdInvalid = !isNonEmptyString(projectId);
  const isTokenInvalid = !isNonEmptyString(accessToken);
  const hasInvalid = isProjectIdInvalid || isTokenInvalid;
  
  if (hasInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      ...simpleErrorResponse('projectId and accessToken are required', 'validation_failed'),
      verified: false
    });
    return;
  }
  
  next();
};

export const validateCreateGitLabBody = (req: Request, res: Response, next: NextFunction): void => {
  const { projectId, accessToken } = req.body || {};
  
  const isProjectIdInvalid = !isNonEmptyString(projectId);
  const isTokenInvalid = !isNonEmptyString(accessToken);
  const hasInvalid = isProjectIdInvalid || isTokenInvalid;
  
  if (hasInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('projectId and accessToken are required for GitLab integration', 'validation_failed')
    );
    return;
  }
  
  next();
};

// ============================================================================
// BITBUCKET VALIDATORS (Stub for future implementation)
// ============================================================================

export const validateBitbucketVerifyBody = (req: Request, res: Response, next: NextFunction): void => {
  const { workspace, repoSlug, appPassword } = req.body || {};
  
  const isWorkspaceInvalid = !isNonEmptyString(workspace);
  const isRepoInvalid = !isNonEmptyString(repoSlug);
  const isPasswordInvalid = !isNonEmptyString(appPassword);
  const hasInvalid = isWorkspaceInvalid || isRepoInvalid || isPasswordInvalid;
  
  if (hasInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      ...simpleErrorResponse('workspace, repoSlug, and appPassword are required', 'validation_failed'),
      verified: false
    });
    return;
  }
  
  next();
};

export const validateCreateBitbucketBody = (req: Request, res: Response, next: NextFunction): void => {
  const { workspace, repoSlug, appPassword } = req.body || {};
  
  const isWorkspaceInvalid = !isNonEmptyString(workspace);
  const isRepoInvalid = !isNonEmptyString(repoSlug);
  const isPasswordInvalid = !isNonEmptyString(appPassword);
  const hasInvalid = isWorkspaceInvalid || isRepoInvalid || isPasswordInvalid;
  
  if (hasInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('workspace, repoSlug, and appPassword are required for Bitbucket integration', 'validation_failed')
    );
    return;
  }
  
  next();
};

