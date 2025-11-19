/**
 * GitHub Actions CI/CD Integration Service
 * Handles all GitHub Actions integration API calls from the web panel
 */

import { IntegrationService } from './base-integration';

// ============================================================================
// Types
// ============================================================================

export enum VerificationStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  INVALID = 'INVALID',
  EXPIRED = 'EXPIRED'
}

export interface VerifyGitHubActionsRequest {
  tenantId: string;
  apiToken?: string; // Optional - can reuse SCM token
  userId: string;
}

export interface VerifyGitHubActionsResponse {
  verified: boolean;
  message: string;
  details?: {
    canReuseSCMToken?: boolean;
  };
}

export interface CreateGitHubActionsIntegrationRequest {
  tenantId: string;
  displayName?: string;
  apiToken?: string; // Optional - reuses SCM token if not provided
  hostUrl?: string; // Optional - defaults to https://api.github.com
  userId: string;
}

export interface UpdateGitHubActionsIntegrationRequest {
  tenantId: string;
  displayName?: string;
  apiToken?: string;
  hostUrl?: string;
  userId: string;
}

export interface GitHubActionsIntegration {
  id: string;
  tenantId: string;
  displayName: string;
  hostUrl: string;
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string | null;
  verificationError: string | null;
  isActive: boolean;
  hasValidToken: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubActionsIntegrationResponse {
  success: boolean;
  integration?: GitHubActionsIntegration;
  message?: string;
  error?: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class GitHubActionsIntegrationServiceClass extends IntegrationService {
  /**
   * Verify GitHub Actions connection
   */
  async verifyGitHubActions(data: VerifyGitHubActionsRequest): Promise<VerifyGitHubActionsResponse> {
    this.logRequest('POST', `/tenants/${data.tenantId}/integrations/ci-cd/github-actions/verify`);
    
    try {
      const result = await this.post<VerifyGitHubActionsResponse>(
        `/tenants/${data.tenantId}/integrations/ci-cd/github-actions/verify`,
        {
          apiToken: data.apiToken
        },
        data.userId
      );

      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/ci-cd/github-actions/verify`, result.verified);
      return result;
    } catch (error: any) {
      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/ci-cd/github-actions/verify`, false);
      
      return {
        verified: false,
        message: error.message || 'Failed to verify GitHub Actions connection',
      };
    }
  }

  /**
   * Create GitHub Actions integration
   */
  async createIntegration(data: CreateGitHubActionsIntegrationRequest): Promise<GitHubActionsIntegrationResponse> {
    this.logRequest('POST', `/tenants/${data.tenantId}/integrations/ci-cd/github-actions`);
    
    try {
      const result = await this.post<GitHubActionsIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/ci-cd/github-actions`,
        {
          displayName: data.displayName,
          apiToken: data.apiToken,
          hostUrl: data.hostUrl
        },
        data.userId
      );

      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/ci-cd/github-actions`, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create GitHub Actions integration'
      };
    }
  }

  /**
   * Get GitHub Actions integration for tenant
   */
  async getIntegration(tenantId: string, userId: string): Promise<GitHubActionsIntegrationResponse> {
    try {
      return await this.get<GitHubActionsIntegrationResponse>(
        `/tenants/${tenantId}/integrations/ci-cd/github-actions`,
        userId
      );
    } catch (error: any) {
      if ((error as any).status === 404) {
        return {
          success: false,
          error: 'No GitHub Actions integration found'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to get GitHub Actions integration'
      };
    }
  }

  /**
   * Update GitHub Actions integration
   */
  async updateIntegration(data: UpdateGitHubActionsIntegrationRequest): Promise<GitHubActionsIntegrationResponse> {
    this.logRequest('PATCH', `/tenants/${data.tenantId}/integrations/ci-cd/github-actions`);
    
    try {
      const result = await this.patch<GitHubActionsIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/ci-cd/github-actions`,
        {
          displayName: data.displayName,
          apiToken: data.apiToken,
          hostUrl: data.hostUrl
        },
        data.userId
      );

      this.logResponse('PATCH', `/tenants/${data.tenantId}/integrations/ci-cd/github-actions`, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update GitHub Actions integration'
      };
    }
  }

  /**
   * Delete GitHub Actions integration
   */
  async deleteIntegration(tenantId: string, userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await this.delete<{ success: boolean; message?: string }>(
        `/tenants/${tenantId}/integrations/ci-cd/github-actions`,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete GitHub Actions integration'
      };
    }
  }
}

// Export singleton instance
export const GitHubActionsIntegrationService = new GitHubActionsIntegrationServiceClass();

