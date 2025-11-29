import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import { ERROR_MESSAGES } from '../controllers/integrations/ci-cd/constants';
import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';

/**
 * CI/CD validation middleware
 *
 * Contains small, focused validators for CI/CD routes. Each validator:
 * - Validates only its own scope (params or body)
 * - Returns early with an HTTP 400 and domain-specific error message
 * - Delegates provider-specific validation where applicable
 */
const isNonEmptyString = (value: unknown): value is string => {
  const isString = typeof value === 'string';
  const trimmed = isString ? value.trim() : '';
  const isNonEmpty = trimmed.length > 0;
  return isString && isNonEmpty;
};

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
export const validateJenkinsVerifyBody = (req: Request, res: Response, next: NextFunction): void => {
  const { hostUrl, username, apiToken } = req.body || {};
  const isHostInvalid = !isNonEmptyString(hostUrl);
  const isUsernameInvalid = !isNonEmptyString(username);
  const isTokenInvalid = !isNonEmptyString(apiToken);
  const hasInvalid = isHostInvalid || isUsernameInvalid || isTokenInvalid;
  if (hasInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ verified: false, message: ERROR_MESSAGES.JENKINS_VERIFY_REQUIRED });
    return;
  }
  next();
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
export const validateCreateJenkinsBody = (req: Request, res: Response, next: NextFunction): void => {
  const { hostUrl, username, apiToken } = req.body || {};
  const isHostInvalid = !isNonEmptyString(hostUrl);
  const isUsernameInvalid = !isNonEmptyString(username);
  const isTokenInvalid = !isNonEmptyString(apiToken);
  const hasInvalid = isHostInvalid || isUsernameInvalid || isTokenInvalid;
  if (hasInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.JENKINS_CREATE_REQUIRED });
    return;
  }
  next();
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
 * GitHub Actions verify body: apiToken must be present.
 */
export const validateGHAVerifyBody = (req: Request, res: Response, next: NextFunction): void => {
  const { apiToken, hostUrl } = req.body || {};
  const tokenInvalid = !isNonEmptyString(apiToken);
  if (tokenInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ verified: false, message: ERROR_MESSAGES.MISSING_TOKEN_AND_SCM });
    return;
  }
  const hostUrlInvalid = !isNonEmptyString(hostUrl);
  if (hostUrlInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ verified: false, message: 'hostUrl is required' });
    return;
  }
  next();
};

/**
 * GitHub Actions create body: apiToken must be present.
 */
export const validateCreateGHABody = (req: Request, res: Response, next: NextFunction): void => {
  const { apiToken, hostUrl } = req.body || {};
  const tokenInvalid = !isNonEmptyString(apiToken);
  if (tokenInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.GHA_CREATE_REQUIRED });
    return;
  }
  const hostUrlInvalid = !isNonEmptyString(hostUrl);
  if (hostUrlInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'hostUrl is required' });
    return;
  }
  next();
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
export const validateConnectionVerifyBody = (req: Request, res: Response, next: NextFunction): void => {
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
export const validateConnectionCreateBody = (req: Request, res: Response, next: NextFunction): void => {
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


