import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http';
import { ERROR_MESSAGES } from '../constants/cicd';

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
  const { jobUrl } = req.body || {};
  const isJobUrlMissing = !isNonEmptyString(jobUrl);
  if (isJobUrlMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, parameters: [], error: ERROR_MESSAGES.JENKINS_JOB_URL_REQUIRED });
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


