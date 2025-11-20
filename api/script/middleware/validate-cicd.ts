import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http';
import { ERROR_MESSAGES } from '../controllers/integrations/ci-cd/constants';
import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';

const isNonEmptyString = (value: unknown): value is string => {
  const isString = typeof value === 'string';
  const trimmed = isString ? value.trim() : '';
  const isNonEmpty = trimmed.length > 0;
  return isString && isNonEmpty;
};

export const validateTenantId = (req: Request, res: Response, next: NextFunction): void => {
  const tenantId = req.params.tenantId;
  const isTenantIdInvalid = !isNonEmptyString(tenantId);
  if (isTenantIdInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ verified: false, message: 'tenantId is required' });
    return;
  }
  next();
};

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

export const validateJenkinsJobParamsBody = (req: Request, res: Response, next: NextFunction): void => {
  const { workflowUrl } = req.body || {};
  const isWorkflowUrlMissing = !isNonEmptyString(workflowUrl);
  if (isWorkflowUrlMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, parameters: [], error: ERROR_MESSAGES.JENKINS_WORKFLOW_URL_REQUIRED });
    return;
  }
  next();
};

export const validateJenkinsQueueBody = (req: Request, res: Response, next: NextFunction): void => {
  const { queueUrl } = req.body || {};
  const isQueueUrlMissing = !isNonEmptyString(queueUrl);
  if (isQueueUrlMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.JENKINS_NO_QUEUE_URL });
    return;
  }
  next();
};

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

export const validateGHAVerifyBody = (req: Request, res: Response, next: NextFunction): void => {
  const { apiToken } = req.body || {};
  const tokenInvalid = !isNonEmptyString(apiToken);
  if (tokenInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ verified: false, message: ERROR_MESSAGES.MISSING_TOKEN_AND_SCM });
    return;
  }
  next();
};

export const validateCreateGHABody = (req: Request, res: Response, next: NextFunction): void => {
  const { apiToken } = req.body || {};
  const tokenInvalid = !isNonEmptyString(apiToken);
  if (tokenInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.GHA_CREATE_REQUIRED });
    return;
  }
  next();
};

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

export const validateIntegrationIdParam = (req: Request, res: Response, next: NextFunction): void => {
  const integrationId = req.params.integrationId;
  const invalid = !isNonEmptyString(integrationId);
  if (invalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.WORKFLOW_INTEGRATION_INVALID });
    return;
  }
  next();
};

export const validateConfigIdParam = (req: Request, res: Response, next: NextFunction): void => {
  const configId = req.params.configId;
  const invalid = !isNonEmptyString(configId);
  if (invalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.CONFIG_FETCH_FAILED });
    return;
  }
  next();
};

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


