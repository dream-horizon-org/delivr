/**
 * GitHub Actions Integration Types
 * Aligned with backend API structure at /tenants/:tenantId/integrations/ci-cd/github-actions
 */

export interface GitHubActionsIntegration {
  id: string;
  tenantId: string;
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
}

export interface UpdateGitHubActionsRequest {
  displayName?: string;
  apiToken?: string;
  hostUrl?: string;
}

export interface VerifyGitHubActionsRequest {
  apiToken?: string; // Optional - falls back to SCM GitHub token
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

