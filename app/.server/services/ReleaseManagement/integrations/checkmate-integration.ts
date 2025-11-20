/**
 * Checkmate Test Management Integration Service
 * Handles all Checkmate integration API calls from the web panel
 */

import { IntegrationService } from './base-integration';

// ============================================================================
// Types
// ============================================================================

export enum VerificationStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  INVALID = 'INVALID',
  ERROR = 'ERROR'
}

export interface CheckmateConfig {
  baseUrl: string;
  authToken: string;
  orgId: number;
}

export interface VerifyCheckmateRequest {
  projectId: string;
  integrationId: string;
  userId: string;
}

export interface VerifyCheckmateResponse {
  success: boolean;
  status: VerificationStatus;
  message: string;
  error?: string;
}

export interface CreateCheckmateIntegrationRequest {
  projectId: string;
  name: string;
  config: CheckmateConfig;
  userId: string;
}

export interface UpdateCheckmateIntegrationRequest {
  projectId: string;
  integrationId: string;
  name?: string;
  config?: Partial<CheckmateConfig>;
  userId: string;
}

export interface CheckmateIntegration {
  id: string;
  projectId: string;
  name: string;
  providerType: 'CHECKMATE';
  config: CheckmateConfig;
  createdByAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckmateIntegrationResponse {
  success: boolean;
  data?: CheckmateIntegration | CheckmateIntegration[];
  message?: string;
  error?: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class CheckmateIntegrationServiceClass extends IntegrationService {
  /**
   * Create Checkmate integration
   */
  async createIntegration(data: CreateCheckmateIntegrationRequest): Promise<CheckmateIntegrationResponse> {
    this.logRequest('POST', `/projects/${data.projectId}/integrations/test-management`);
    
    try {
      const result = await this.post<{ success: boolean; data: CheckmateIntegration; error?: string }>(
        `/projects/${data.projectId}/integrations/test-management`,
        {
          name: data.name,
          providerType: 'CHECKMATE',
          config: {
            baseUrl: data.config.baseUrl,
            authToken: data.config.authToken,
            orgId: data.config.orgId
          }
        },
        data.userId
      );

      this.logResponse('POST', `/projects/${data.projectId}/integrations/test-management`, result.success);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create Checkmate integration'
      };
    }
  }

  /**
   * Get all Checkmate integrations for a project
   */
  async listIntegrations(projectId: string, userId: string): Promise<CheckmateIntegrationResponse> {
    try {
      const result = await this.get<{ success: boolean; data: CheckmateIntegration[]; error?: string }>(
        `/projects/${projectId}/integrations/test-management`,
        userId
      );

      // Filter only Checkmate integrations
      const checkmateIntegrations = result.data?.filter((i: any) => i.providerType === 'CHECKMATE') || [];

      return {
        success: result.success,
        data: checkmateIntegrations,
        error: result.error
      };
    } catch (error: any) {
      if ((error as any).status === 404) {
        return {
          success: true,
          data: []
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to list Checkmate integrations'
      };
    }
  }

  /**
   * Get single Checkmate integration
   */
  async getIntegration(projectId: string, integrationId: string, userId: string): Promise<CheckmateIntegrationResponse> {
    try {
      const result = await this.get<{ success: boolean; data: CheckmateIntegration; error?: string }>(
        `/projects/${projectId}/integrations/test-management/${integrationId}`,
        userId
      );

      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      if ((error as any).status === 404) {
        return {
          success: false,
          error: 'Checkmate integration not found'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to get Checkmate integration'
      };
    }
  }

  /**
   * Update Checkmate integration
   */
  async updateIntegration(data: UpdateCheckmateIntegrationRequest): Promise<CheckmateIntegrationResponse> {
    this.logRequest('PUT', `/projects/${data.projectId}/integrations/test-management/${data.integrationId}`);
    
    try {
      const payload: any = {};
      if (data.name) payload.name = data.name;
      if (data.config) {
        payload.config = {
          ...(data.config.baseUrl && { baseUrl: data.config.baseUrl }),
          ...(data.config.authToken && { authToken: data.config.authToken }),
          ...(data.config.orgId !== undefined && { orgId: data.config.orgId })
        };
      }

      const result = await this.put<{ success: boolean; data: CheckmateIntegration; error?: string }>(
        `/projects/${data.projectId}/integrations/test-management/${data.integrationId}`,
        payload,
        data.userId
      );

      this.logResponse('PUT', `/projects/${data.projectId}/integrations/test-management/${data.integrationId}`, result.success);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update Checkmate integration'
      };
    }
  }

  /**
   * Delete Checkmate integration
   */
  async deleteIntegration(projectId: string, integrationId: string, userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const result = await this.delete<{ success: boolean; message?: string; error?: string }>(
        `/projects/${projectId}/integrations/test-management/${integrationId}`,
        userId
      );

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete Checkmate integration'
      };
    }
  }

  /**
   * Verify Checkmate integration connection
   */
  async verifyIntegration(data: VerifyCheckmateRequest): Promise<VerifyCheckmateResponse> {
    this.logRequest('POST', `/projects/${data.projectId}/integrations/test-management/${data.integrationId}/verify`);
    
    try {
      const result = await this.post<{ success: boolean; data: VerifyCheckmateResponse }>(
        `/projects/${data.projectId}/integrations/test-management/${data.integrationId}/verify`,
        {},
        data.userId
      );

      this.logResponse('POST', `/projects/${data.projectId}/integrations/test-management/${data.integrationId}/verify`, result.data.success);
      return result.data;
    } catch (error: any) {
      return {
        success: false,
        status: VerificationStatus.ERROR,
        message: error.message || 'Failed to verify Checkmate connection',
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const CheckmateIntegrationService = new CheckmateIntegrationServiceClass();
