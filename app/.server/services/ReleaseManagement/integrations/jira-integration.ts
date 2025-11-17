/**
 * Jira Project Management Integration Service
 * Handles all Jira integration API calls from the web panel
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

export enum JiraAuthType {
  BASIC = 'BASIC',
  OAUTH2 = 'OAUTH2',
  PAT = 'PAT'
}

export interface VerifyJiraRequest {
  tenantId: string;
  hostUrl: string;
  authType: JiraAuthType;
  username?: string;
  apiToken?: string;
  accessToken?: string;
  personalAccessToken?: string;
  userId: string;
}

export interface VerifyJiraResponse {
  verified: boolean;
  message: string;
  details?: {
    siteName?: string;
    cloudId?: string;
    projectCount?: number;
  };
}

export interface CreateJiraIntegrationRequest {
  tenantId: string;
  displayName?: string;
  hostUrl: string;
  authType: JiraAuthType;
  username?: string;
  apiToken?: string;
  accessToken?: string;
  refreshToken?: string;
  personalAccessToken?: string;
  cloudId?: string;
  defaultProjectKey?: string;
  providerConfig?: {
    issueTypeMapping?: Record<string, string>;
    statusMapping?: Record<string, string>;
    webhookEnabled?: boolean;
    autoCreateIssues?: boolean;
  };
  userId: string;
}

export interface UpdateJiraIntegrationRequest {
  tenantId: string;
  displayName?: string;
  hostUrl?: string;
  authType?: JiraAuthType;
  username?: string;
  apiToken?: string;
  accessToken?: string;
  refreshToken?: string;
  personalAccessToken?: string;
  cloudId?: string;
  defaultProjectKey?: string;
  providerConfig?: {
    issueTypeMapping?: Record<string, string>;
    statusMapping?: Record<string, string>;
    webhookEnabled?: boolean;
    autoCreateIssues?: boolean;
  };
  userId: string;
}

export interface JiraIntegration {
  id: string;
  tenantId: string;
  displayName: string;
  hostUrl: string;
  authType: JiraAuthType;
  username: string | null;
  cloudId: string | null;
  defaultProjectKey: string | null;
  providerConfig: {
    issueTypeMapping?: Record<string, string>;
    statusMapping?: Record<string, string>;
    webhookEnabled?: boolean;
    autoCreateIssues?: boolean;
  };
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string | null;
  verificationError: string | null;
  isActive: boolean;
  hasValidToken: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JiraIntegrationResponse {
  success: boolean;
  integration?: JiraIntegration;
  message?: string;
  error?: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class JiraIntegrationServiceClass extends IntegrationService {
  /**
   * Verify Jira connection
   */
  async verifyJira(data: VerifyJiraRequest): Promise<VerifyJiraResponse> {
    this.logRequest('GET', `/tenants/${data.tenantId}/integrations/project-management/jira/verify`);
    
    try {
      const result = await this.get<VerifyJiraResponse>(
        `/tenants/${data.tenantId}/integrations/project-management/jira/verify`,
        data.userId,
        {
          params: {
            hostUrl: data.hostUrl,
            authType: data.authType,
            username: data.username,
            apiToken: data.apiToken,
            accessToken: data.accessToken,
            personalAccessToken: data.personalAccessToken
          }
        }
      );

      this.logResponse('GET', `/tenants/${data.tenantId}/integrations/project-management/jira/verify`, result.verified);
      return result;
    } catch (error: any) {
      this.logResponse('GET', `/tenants/${data.tenantId}/integrations/project-management/jira/verify`, false);
      
      return {
        verified: false,
        message: error.message || 'Failed to verify Jira connection',
      };
    }
  }

  /**
   * Create Jira integration
   */
  async createIntegration(data: CreateJiraIntegrationRequest): Promise<JiraIntegrationResponse> {
    this.logRequest('POST', `/tenants/${data.tenantId}/integrations/project-management/jira`);
    
    try {
      const result = await this.post<JiraIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/project-management/jira`,
        {
          displayName: data.displayName,
          hostUrl: data.hostUrl,
          authType: data.authType,
          username: data.username,
          apiToken: data.apiToken,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          personalAccessToken: data.personalAccessToken,
          cloudId: data.cloudId,
          defaultProjectKey: data.defaultProjectKey,
          providerConfig: data.providerConfig
        },
        data.userId
      );

      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/project-management/jira`, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create Jira integration'
      };
    }
  }

  /**
   * Get Jira integration for tenant
   */
  async getIntegration(tenantId: string, userId: string): Promise<JiraIntegrationResponse> {
    try {
      return await this.get<JiraIntegrationResponse>(
        `/tenants/${tenantId}/integrations/project-management/jira`,
        userId
      );
    } catch (error: any) {
      if ((error as any).status === 404) {
        return {
          success: false,
          error: 'No Jira integration found'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to get Jira integration'
      };
    }
  }

  /**
   * Update Jira integration
   */
  async updateIntegration(data: UpdateJiraIntegrationRequest): Promise<JiraIntegrationResponse> {
    this.logRequest('PATCH', `/tenants/${data.tenantId}/integrations/project-management/jira`);
    
    try {
      const result = await this.patch<JiraIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/project-management/jira`,
        {
          displayName: data.displayName,
          hostUrl: data.hostUrl,
          authType: data.authType,
          username: data.username,
          apiToken: data.apiToken,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          personalAccessToken: data.personalAccessToken,
          cloudId: data.cloudId,
          defaultProjectKey: data.defaultProjectKey,
          providerConfig: data.providerConfig
        },
        data.userId
      );

      this.logResponse('PATCH', `/tenants/${data.tenantId}/integrations/project-management/jira`, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update Jira integration'
      };
    }
  }

  /**
   * Delete Jira integration
   */
  async deleteIntegration(tenantId: string, userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await this.delete<{ success: boolean; message?: string }>(
        `/tenants/${tenantId}/integrations/project-management/jira`,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete Jira integration'
      };
    }
  }
}

// Export singleton instance
export const JiraIntegrationService = new JiraIntegrationServiceClass();

