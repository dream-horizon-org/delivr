import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import { ERROR_MESSAGES, PROVIDER_DEFAULTS } from '../controllers/integrations/ci-cd/constants';
import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';
import * as yup from 'yup';

/**
 * CI/CD validation middleware
 *
 * Contains small, focused validators for CI/CD routes. Each validator:
 * - Validates only its own scope (params or body)
 * - Returns early with an HTTP 400 and domain-specific error message
 * - Delegates provider-specific validation where applicable
 */

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
// YUP VALIDATION SCHEMAS
// ============================================================================

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
 * Jenkins config fields schema (reusable for CREATE and UPDATE)
 */
const jenkinsConfigFieldsSchema = yup.object({
  hostUrl: yup
    .string()
    .trim()
    .required('Host URL is required')
    .url('Host URL must be a valid URL (e.g., https://jenkins.example.com)'),
  username: yup
    .string()
    .trim()
    .required('Username is required'),
  apiToken: yup
    .string()
    .trim()
    .required('API Token is required'),
  useCrumb: yup
    .boolean()
    .optional()
    .default(true),
  crumbPath: yup
    .string()
    .trim()
    .optional()
    .default(PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH),
  displayName: yup
    .string()
    .trim()
    .optional(),
  _encrypted: yup.boolean().optional()
});

/**
 * Yup schema for Jenkins verification
 */
const jenkinsVerifySchema = jenkinsConfigFieldsSchema.pick([
  'hostUrl',
  'username',
  'apiToken',
  'useCrumb',
  'crumbPath',
  '_encrypted'
]);

/**
 * Yup schema for Jenkins CREATE
 */
const jenkinsCreateSchema = jenkinsConfigFieldsSchema;

/**
 * Yup schema for Jenkins UPDATE (all fields optional but validated if present)
 */
const jenkinsUpdateSchema = yup.object({
  hostUrl: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Host URL cannot be empty if provided')
    .url('Host URL must be a valid URL (e.g., https://jenkins.example.com)'),
  username: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Username cannot be empty if provided'),
  apiToken: yup
    .string()
    .trim()
    .optional()
    .min(1, 'API Token cannot be empty if provided'),
  useCrumb: yup
    .boolean()
    .optional(),
  crumbPath: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Crumb path cannot be empty if provided'),
  displayName: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Display name cannot be empty if provided'),
  _encrypted: yup.boolean().optional()
});

/**
 * GitHub Actions config fields schema (reusable for CREATE and UPDATE)
 */
const githubActionsConfigFieldsSchema = yup.object({
  apiToken: yup
    .string()
    .trim()
    .required('API Token is required'),
  displayName: yup
    .string()
    .trim()
    .optional(),
  _encrypted: yup.boolean().optional()
});

/**
 * Yup schema for GitHub Actions verification
 */
const githubActionsVerifySchema = githubActionsConfigFieldsSchema.pick([
  'apiToken',
  '_encrypted'
]);

/**
 * Yup schema for GitHub Actions CREATE
 */
const githubActionsCreateSchema = githubActionsConfigFieldsSchema;

/**
 * Yup schema for GitHub Actions UPDATE (all fields optional but validated if present)
 */
const githubActionsUpdateSchema = yup.object({
  apiToken: yup
    .string()
    .trim()
    .optional()
    .min(1, 'API Token cannot be empty if provided'),
  displayName: yup
    .string()
    .trim()
    .optional()
    .min(1, 'Display name cannot be empty if provided'),
  _encrypted: yup.boolean().optional()
});

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

/**
 * Validate presence of :tenantId path parameter.
 */
export const validateTenantId = (req: Request, res: Response, next: NextFunction): void => {
  const tenantId = req.params.tenantId;
  const isTenantIdInvalid = !isNonEmptyString(tenantId);
  if (isTenantIdInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ verified: false, message: 'tenantId is required' });
    return;
  }
  next();
};

/**
 * Jenkins verify body: hostUrl, username and apiToken must be present.
 */
export const validateJenkinsVerifyBody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validated = await validateWithYup(jenkinsVerifySchema, req.body, res, true);
  if (validated) {
    req.body = validated;  // ✅ Replace with trimmed values
    next();
  }
};

/**
 * Jenkins job-parameters body: workflowUrl must be present.
 */
export const validateJenkinsJobParamsBody = (req: Request, res: Response, next: NextFunction): void => {
  const { workflowUrl } = req.body || {};
  const isWorkflowUrlMissing = !isNonEmptyString(workflowUrl);
  if (isWorkflowUrlMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, parameters: [], error: ERROR_MESSAGES.JENKINS_WORKFLOW_URL_REQUIRED });
    return;
  }
  next();
};

/**
 * Jenkins queue-status body: queueUrl must be present.
 */
export const validateJenkinsQueueBody = (req: Request, res: Response, next: NextFunction): void => {
  const { queueUrl } = req.body || {};
  const isQueueUrlMissing = !isNonEmptyString(queueUrl);
  if (isQueueUrlMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.JENKINS_NO_QUEUE_URL });
    return;
  }
  next();
};

/**
 * Jenkins queue-status query: queueUrl must be present.
 */
export const validateJenkinsQueueQuery = (req: Request, res: Response, next: NextFunction): void => {
  const queueUrl = req.query.queueUrl;
  const isQueueUrlMissing = !isNonEmptyString(typeof queueUrl === 'string' ? queueUrl : '');
  if (isQueueUrlMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.JENKINS_NO_QUEUE_URL });
    return;
  }
  next();
};

/**
 * Jenkins create body: hostUrl, username and apiToken must be present.
 */
export const validateCreateJenkinsBody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validated = await validateWithYup(jenkinsCreateSchema, req.body, res, false);
  if (validated) {
    req.body = validated;  // ✅ Replace with trimmed values
    next();
  }
};

/**
 * Create workflow body: required fields must be present for provider-agnostic workflow metadata.
 */
export const validateCreateWorkflowBody = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body || {};
  const required = ['providerType', 'integrationId', 'displayName', 'platform', 'workflowType', 'workflowUrl'] as const;
  const missing = required.filter((k) => !isNonEmptyString(body[k]));
  const hasMissing = missing.length > 0;
  if (hasMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.WORKFLOW_CREATE_REQUIRED });
    return;
  }
  next();
};

/**
 * Jenkins update body: validates fields if present.
 */
export const validateUpdateJenkinsBody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validated = await validateWithYup(jenkinsUpdateSchema, req.body, res, false);
  if (validated) {
    req.body = validated;  // ✅ Replace with trimmed values
    next();
  }
};

/**
 * GitHub Actions verify body: apiToken must be present.
 */
export const validateGHAVerifyBody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validated = await validateWithYup(githubActionsVerifySchema, req.body, res, true);
  if (validated) {
    req.body = validated;  // ✅ Replace with trimmed values
    next();
  }
};

/**
 * GitHub Actions create body: apiToken must be present.
 */
export const validateCreateGHABody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validated = await validateWithYup(githubActionsCreateSchema, req.body, res, false);
  if (validated) {
    req.body = validated;  // ✅ Replace with trimmed values
    next();
  }
};

/**
 * GitHub Actions update body: validates fields if present.
 */
export const validateUpdateGHABody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validated = await validateWithYup(githubActionsUpdateSchema, req.body, res, false);
  if (validated) {
    req.body = validated;  // ✅ Replace with trimmed values
    next();
  }
};

/**
 * Validate :providerType path parameter and allow only supported providers.
 */
export const validateProviderTypeParam = (req: Request, res: Response, next: NextFunction): void => {
  const raw = String(req.params.providerType || '');
  const providerKey = raw.toUpperCase().replace('-', '_') as keyof typeof CICDProviderType;
  const provider = CICDProviderType[providerKey] as CICDProviderType | undefined;
  const isJenkins = provider === CICDProviderType.JENKINS;
  const isGha = provider === CICDProviderType.GITHUB_ACTIONS;
  const isSupported = isJenkins || isGha;
  if (!isSupported) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.OPERATION_NOT_SUPPORTED });
    return;
  }
  next();
};

/**
 * Validate verify body for the resolved provider.
 */
export const validateConnectionVerifyBody = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const raw = String(req.params.providerType || '');
  const providerKey = raw.toUpperCase().replace('-', '_') as keyof typeof CICDProviderType;
  const provider = CICDProviderType[providerKey] as CICDProviderType | undefined;
  const isJenkins = provider === CICDProviderType.JENKINS;
  const isGha = provider === CICDProviderType.GITHUB_ACTIONS;
  if (isJenkins) {
    return validateJenkinsVerifyBody(req, res, next);
  }
  if (isGha) {
    return validateGHAVerifyBody(req, res, next);
  }
  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.OPERATION_NOT_SUPPORTED });
};

/**
 * Validate create body for the resolved provider.
 */
export const validateConnectionCreateBody = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const raw = String(req.params.providerType || '');
  const providerKey = raw.toUpperCase().replace('-', '_') as keyof typeof CICDProviderType;
  const provider = CICDProviderType[providerKey] as CICDProviderType | undefined;
  const isJenkins = provider === CICDProviderType.JENKINS;
  const isGha = provider === CICDProviderType.GITHUB_ACTIONS;
  if (isJenkins) {
    return validateCreateJenkinsBody(req, res, next);
  }
  if (isGha) {
    return validateCreateGHABody(req, res, next);
  }
  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.OPERATION_NOT_SUPPORTED });
};

/**
 * Validate update body for the resolved provider (from database, not params).
 * This requires reading the integration from DB first to determine the provider.
 * For now, we'll create provider-specific update validators and call them based on integration lookup.
 */
export const validateConnectionUpdateBody = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // For update, we don't have providerType in params, it's determined by integrationId
  // The controller will handle provider-specific validation after fetching the integration
  // For now, just pass through - validation will be done in controller based on provider
  next();
};

/**
 * Validate presence of :integrationId path parameter.
 */
export const validateIntegrationIdParam = (req: Request, res: Response, next: NextFunction): void => {
  const integrationId = req.params.integrationId;
  const invalid = !isNonEmptyString(integrationId);
  if (invalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.WORKFLOW_INTEGRATION_INVALID });
    return;
  }
  next();
};

/**
 * Validate presence of :configId path parameter.
 */
export const validateConfigIdParam = (req: Request, res: Response, next: NextFunction): void => {
  const configId = req.params.configId;
  const invalid = !isNonEmptyString(configId);
  if (invalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.CONFIG_FETCH_FAILED });
    return;
  }
  next();
};

/**
 * Validate minimal inputs for workflow parameter discovery.
 */
export const validateWorkflowParamFetchBody = (req: Request, res: Response, next: NextFunction): void => {
  const { workflowUrl } = req.body || {};
  const hasWorkflowUrl = isNonEmptyString(workflowUrl);
  const neitherProvided = !hasWorkflowUrl;
  if (neitherProvided) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.WORKFLOW_MIN_PARAMS_REQUIRED });
    return;
  }
  next();
};

/**
 * Validate selection inputs for triggering a workflow by integrationId.
 * Requires either a workflowId OR (workflowType AND platform).
 */
export const validateWorkflowTriggerBody = (req: Request, res: Response, next: NextFunction): void => {
  const { workflowId, workflowType, platform } = req.body || {};
  const hasWorkflowId = isNonEmptyString(workflowId);
  const hasTypeAndPlatform = isNonEmptyString(workflowType) && isNonEmptyString(platform);
  const invalid = !hasWorkflowId && !hasTypeAndPlatform;
  if (invalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.WORKFLOW_SELECTION_REQUIRED });
    return;
  }
  next();
};

/**
 * Validate inputs for run-status: runUrl OR (owner/repo/runId).
 */
export const validateWorkflowRunStatusBody = (req: Request, res: Response, next: NextFunction): void => {
  const { runUrl, owner, repo, runId } = req.body || {};
  const hasRunUrl = isNonEmptyString(runUrl);
  const hasOwnerRepoId = isNonEmptyString(owner) && isNonEmptyString(repo) && isNonEmptyString(runId);
  const invalid = !hasRunUrl && !hasOwnerRepoId;
  if (invalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.GHA_RUN_IDENTIFIERS_REQUIRED });
    return;
  }
  next();
};

/**
 * Validate query inputs for run-status: runUrl OR (owner/repo/runId) via query string.
 */
export const validateWorkflowRunStatusQuery = (req: Request, res: Response, next: NextFunction): void => {
  const runUrl = req.query.runUrl;
  const owner = req.query.owner;
  const repo = req.query.repo;
  const runId = req.query.runId;
  const hasRunUrl = isNonEmptyString(typeof runUrl === 'string' ? runUrl : '');
  const hasOwnerRepoId =
    isNonEmptyString(typeof owner === 'string' ? owner : '') &&
    isNonEmptyString(typeof repo === 'string' ? repo : '') &&
    isNonEmptyString(typeof runId === 'string' ? runId : '');
  const invalid = !hasRunUrl && !hasOwnerRepoId;
  if (invalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.GHA_RUN_IDENTIFIERS_REQUIRED });
    return;
  }
  next();
};

/**
 * Validate inputs for config-level trigger: platform/platformType AND workflowType required.
 */
export const validateConfigWorkflowTriggerBody = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body || {};
  const platform = body.platform;
  const platformType = body.platformType;
  const workflowType = body.workflowType;

  const hasPlatform = isNonEmptyString(platform) || isNonEmptyString(platformType);
  const hasWorkflowType = isNonEmptyString(workflowType);
  const invalid = !hasPlatform || !hasWorkflowType;
  if (invalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.WORKFLOW_SELECTION_REQUIRED });
    return;
  }
  next();
};


