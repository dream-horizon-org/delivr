/**
 * GitHub Actions Integration Types
 * Aligned with backend API structure at /apps/:appId/integrations/ci-cd/github-actions
 */

export interface GitHubActionsIntegration {
  id: string;
  appId: string;
  providerType: 'GITHUB_ACTIONS';
  displayName: string;
  hostUrl: string;
  authType: 'BEARER';
  apiToken?: string; // Not returned in GET requests
  verificationStatus: 'VALID' | 'INVALID' | 'PENDING';
  lastVerifiedAt?: string;
  verificationError?: string;
  createdByAccountId: string;
  createdAt: string;
  updatedAt: string;
}

// API Request Types
export interface CreateGitHubActionsRequest {
  displayName?: string;
  apiToken?: string; // Optional - falls back to SCM GitHub token
  hostUrl?: string; // Optional - defaults to https://api.github.com
  _encrypted?: boolean; // Flag to indicate apiToken is encrypted
}

export interface UpdateGitHubActionsRequest {
  displayName?: string;
  apiToken?: string;
  hostUrl?: string;
  _encrypted?: boolean; // Flag to indicate apiToken is encrypted
}

export interface VerifyGitHubActionsRequest {
  displayName?: string;
  hostUrl?: string; // Optional - defaults to https://api.github.com
  apiToken?: string; // Optional - falls back to SCM GitHub token
  _encrypted?: boolean; // Flag to indicate apiToken is encrypted
}

// API Response Types
export interface GitHubActionsIntegrationResponse {
  success: boolean;
  integration?: GitHubActionsIntegration;
  error?: string;
  message?: string;
}

export interface GitHubActionsVerifyResponse {
  verified: boolean;
  message: string;
}

