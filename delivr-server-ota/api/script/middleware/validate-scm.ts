/**
 * SCM Integration Validation Middleware
 * Validates request parameters for SCM integrations
 */

import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http';

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
// COMMON VALIDATORS
// ============================================================================

export const validateTenantId = (req: Request, res: Response, next: NextFunction): void => {
  const appId = req.params.appId;
  const isTenantIdInvalid = !isNonEmptyString(appId);
  
  if (isTenantIdInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: 'appId is required' 
    });
    return;
  }
  
  next();
};

// ============================================================================
// GITHUB VALIDATORS
// ============================================================================

export const validateGitHubVerifyBody = (req: Request, res: Response, next: NextFunction): void => {
  const { owner, repo, accessToken } = req.body || {};
  
  const isOwnerInvalid = !isNonEmptyString(owner);
  const isRepoInvalid = !isNonEmptyString(repo);
  const isTokenInvalid = !isNonEmptyString(accessToken);
  const hasInvalid = isOwnerInvalid || isRepoInvalid || isTokenInvalid;
  
  if (hasInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      verified: false,
      error: 'owner, repo, and accessToken are required' 
    });
    return;
  }
  
  next();
};

export const validateCreateGitHubBody = (req: Request, res: Response, next: NextFunction): void => {
  const { owner, repo, accessToken } = req.body || {};
  
  const isOwnerInvalid = !isNonEmptyString(owner);
  const isRepoInvalid = !isNonEmptyString(repo);
  const isTokenInvalid = !isNonEmptyString(accessToken);
  const hasInvalid = isOwnerInvalid || isRepoInvalid || isTokenInvalid;
  
  if (hasInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: 'owner, repo, and accessToken are required for GitHub integration' 
    });
    return;
  }
  
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
      success: false, 
      verified: false,
      error: 'projectId and accessToken are required' 
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
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: 'projectId and accessToken are required for GitLab integration' 
    });
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
      success: false, 
      verified: false,
      error: 'workspace, repoSlug, and appPassword are required' 
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
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: 'workspace, repoSlug, and appPassword are required for Bitbucket integration' 
    });
    return;
  }
  
  next();
};

