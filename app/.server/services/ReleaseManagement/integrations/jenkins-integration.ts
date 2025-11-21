/**
 * Jenkins CI/CD Integration Service
 * Handles all Jenkins integration API calls from the web panel
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

export interface VerifyJenkinsRequest {
  tenantId: string;
  displayName?: string;
  hostUrl: string;
  username: string;
  apiToken: string;
  useCrumb?: boolean;
  crumbPath?: string;
  userId: string;
}

export interface VerifyJenkinsResponse {
  verified: boolean;
  message: string;
  details?: {
    version?: string;
    url?: string;
  };
}

export interface CreateJenkinsIntegrationRequest {
  tenantId: string;
  displayName?: string;
  hostUrl: string;
  username: string;
  apiToken: string;
  providerConfig?: {
    useCrumb?: boolean;
    crumbPath?: string;
  };
  userId: string;
}

export interface UpdateJenkinsIntegrationRequest {
  tenantId: string;
  integrationId: string;
  displayName?: string;
  hostUrl?: string;
  username?: string;
  apiToken?: string;
  providerConfig?: {
    useCrumb?: boolean;
    crumbPath?: string;
  };
  userId: string;
}

export interface JenkinsIntegration {
  id: string;
  tenantId: string;
  displayName: string;
  hostUrl: string;
  username: string;
  providerConfig: {
    useCrumb: boolean;
    crumbPath: string;
  };
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string | null;
  verificationError: string | null;
  isActive: boolean;
  hasValidToken: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JenkinsIntegrationResponse {
  success: boolean;
  integration?: JenkinsIntegration;
  message?: string;
  error?: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class JenkinsIntegrationServiceClass extends IntegrationService {
  /**
   * Verify Jenkins connection
   */
  async verifyJenkins(data: VerifyJenkinsRequest): Promise<VerifyJenkinsResponse> {
    this.logRequest('POST', `/tenants/${data.tenantId}/integrations/ci-cd/connections/JENKINS/verify`);
    
    try {
      // Send data in body with POST request (backend expects req.body)
      const result = await this.post<VerifyJenkinsResponse>(
        `/tenants/${data.tenantId}/integrations/ci-cd/connections/JENKINS/verify`,
        {
          displayName: data.displayName,
          hostUrl: data.hostUrl,
          username: data.username,
          apiToken: data.apiToken,
          providerConfig: {
            useCrumb: data.useCrumb,
            crumbPath: data.crumbPath
          }
        },
        data.userId
      );

      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/ci-cd/connections/JENKINS/verify`, result.verified);
      return result;
    } catch (error: any) {
      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/ci-cd/connections/JENKINS/verify`, false);
      
      return {
        verified: false,
        message: error.message || 'Failed to verify Jenkins connection',
      };
    }
  }

  /**
   * Create Jenkins integration
   */
  async createIntegration(data: CreateJenkinsIntegrationRequest): Promise<JenkinsIntegrationResponse> {
    this.logRequest('POST', `/tenants/${data.tenantId}/integrations/ci-cd/connections/JENKINS`);
    
    try {
      const result = await this.post<JenkinsIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/ci-cd/connections/JENKINS`,
        {
          displayName: data.displayName,
          hostUrl: data.hostUrl,
          username: data.username,
          apiToken: data.apiToken,
          providerConfig: data.providerConfig
        },
        data.userId
      );

      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/ci-cd/connections/JENKINS`, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create Jenkins integration'
      };
    }
  }

  /**
   * Get Jenkins integration for tenant
   */
  async getIntegration(tenantId: string, userId: string): Promise<JenkinsIntegrationResponse> {
    try {
      return await this.get<JenkinsIntegrationResponse>(
        `/tenants/${tenantId}/integrations/ci-cd/jenkins`,
        userId
      );
    } catch (error: any) {
      if ((error as any).status === 404) {
        return {
          success: false,
          error: 'No Jenkins integration found'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to get Jenkins integration'
      };
    }
  }

  /**
   * Update Jenkins integration
   */
  async updateIntegration(data: UpdateJenkinsIntegrationRequest): Promise<JenkinsIntegrationResponse> {
    this.logRequest('PATCH', `/tenants/${data.tenantId}/integrations/ci-cd/connections/${data.integrationId}`);
    
    try {
      const result = await this.patch<JenkinsIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/ci-cd/connections/${data.integrationId}`,
        {
          displayName: data.displayName,
          hostUrl: data.hostUrl,
          username: data.username,
          apiToken: data.apiToken,
          providerConfig: data.providerConfig
        },
        data.userId
      );

      this.logResponse('PATCH', `/tenants/${data.tenantId}/integrations/ci-cd/connections/${data.integrationId}`, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update Jenkins integration'
      };
    }
  }

  /**
   * Delete Jenkins integration
   */
  async deleteIntegration(tenantId: string, integrationId: string, userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await this.delete<{ success: boolean; message?: string }>(
        `/tenants/${tenantId}/integrations/ci-cd/connections/${integrationId}`,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete Jenkins integration'
      };
    }
  }

  // ============================================================================
  // Workflow Management
  // ============================================================================

  /**
   * Fetch Jenkins job parameters
   */
  async fetchJobParameters(tenantId: string, userId: string, jobUrl: string): Promise<any> {
    try {
      return await this.post(
        `/tenants/${tenantId}/integrations/ci-cd/jenkins/job-parameters`,
        { jobUrl },
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        parameters: [],
        error: error.message || 'Failed to fetch job parameters'
      };
    }
  }

  /**
   * List Jenkins workflows for tenant
   */
  async listWorkflows(tenantId: string, userId: string, filters?: any): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('providerType', 'JENKINS');
      if (filters?.platform) queryParams.append('platform', filters.platform);
      if (filters?.workflowType) queryParams.append('workflowType', filters.workflowType);

      return await this.get(
        `/tenants/${tenantId}/integrations/ci-cd/workflows?${queryParams.toString()}`,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        workflows: [],
        error: error.message || 'Failed to list workflows'
      };
    }
  }

  /**
   * Create Jenkins workflow configuration
   */
  async createWorkflow(tenantId: string, userId: string, data: any): Promise<any> {
    try {
      return await this.post(
        `/tenants/${tenantId}/integrations/ci-cd/workflows`,
        { ...data, providerType: 'JENKINS' },
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create workflow'
      };
    }
  }

  /**
   * Update Jenkins workflow configuration
   */
  async updateWorkflow(tenantId: string, workflowId: string, userId: string, data: any): Promise<any> {
    try {
      return await this.patch(
        `/tenants/${tenantId}/integrations/ci-cd/workflows/${workflowId}`,
        data,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update workflow'
      };
    }
  }

  /**
   * Delete Jenkins workflow configuration
   */
  async deleteWorkflow(tenantId: string, workflowId: string, userId: string): Promise<any> {
    try {
      return await this.delete(
        `/tenants/${tenantId}/integrations/ci-cd/workflows/${workflowId}`,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete workflow'
      };
    }
  }
}

// Export singleton instance
export const JenkinsIntegrationService = new JenkinsIntegrationServiceClass();

