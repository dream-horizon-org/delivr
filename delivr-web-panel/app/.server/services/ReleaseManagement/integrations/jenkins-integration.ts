/**
 * Jenkins CI/CD Integration Service
 * Handles all Jenkins integration API calls from the web panel
 */

import { IntegrationService } from './base-integration';
import { CICD, buildUrlWithQuery } from './api-routes';

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
  _encrypted?: boolean; // Flag to indicate apiToken is encrypted
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
  _encrypted?: boolean; // Flag to indicate apiToken is encrypted
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
  _encrypted?: boolean; // Flag to indicate apiToken is encrypted
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
    const endpoint = CICD.verifyConnection(data.tenantId, 'JENKINS');
    this.logRequest('POST', endpoint, { ...data, apiToken: '[REDACTED]', _encrypted: data._encrypted });
    
    try {
      // Send data in body with POST request (backend expects req.body)
      const result = await this.post<VerifyJenkinsResponse>(
        endpoint,
        {
          displayName: data.displayName,
          hostUrl: data.hostUrl,
          username: data.username,
          apiToken: data.apiToken,
          providerConfig: {
            useCrumb: data.useCrumb,
            crumbPath: data.crumbPath
          },
          _encrypted: data._encrypted, // Forward encryption flag
        },
        data.userId
      );

      this.logResponse('POST', endpoint, result.verified);
      return result;
    } catch (error: any) {
      this.logResponse('POST', endpoint, false);
      
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
    const endpoint = CICD.createConnection(data.tenantId, 'JENKINS');
    this.logRequest('POST', endpoint, { _encrypted: data._encrypted });
    
    try {
      const result = await this.post<JenkinsIntegrationResponse>(
        endpoint,
        {
          displayName: data.displayName,
          hostUrl: data.hostUrl,
          username: data.username,
          apiToken: data.apiToken,
          providerConfig: data.providerConfig,
          _encrypted: data._encrypted, // Forward encryption flag
        },
        data.userId
      );

      this.logResponse('POST', endpoint, result.success);
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
        CICD.getProvider(tenantId, 'jenkins'),
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
    const endpoint = CICD.updateConnection(data.tenantId, data.integrationId);
    this.logRequest('PATCH', endpoint, { _encrypted: data._encrypted });
    
    try {
      const result = await this.patch<JenkinsIntegrationResponse>(
        endpoint,
        {
          displayName: data.displayName,
          hostUrl: data.hostUrl,
          username: data.username,
          apiToken: data.apiToken,
          providerConfig: data.providerConfig,
          _encrypted: data._encrypted, // Forward encryption flag
        },
        data.userId
      );

      this.logResponse('PATCH', endpoint, result.success);
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
        CICD.deleteConnection(tenantId, integrationId),
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
  async fetchJobParameters(tenantId: string, userId: string, integrationId: string, jobUrl: string): Promise<any> {
    try {
      return await this.post(
        CICD.jobParameters(tenantId, integrationId),
        { workflowUrl: jobUrl },
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
      const url = buildUrlWithQuery(CICD.listWorkflows(tenantId), {
        providerType: 'JENKINS',
        platform: filters?.platform,
        workflowType: filters?.workflowType
      });

      return await this.get(url, userId);
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
        CICD.createWorkflow(tenantId),
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
        CICD.updateWorkflow(tenantId, workflowId),
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
        CICD.deleteWorkflow(tenantId, workflowId),
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

