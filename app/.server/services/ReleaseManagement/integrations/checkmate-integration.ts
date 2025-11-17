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
  EXPIRED = 'EXPIRED'
}

export interface VerifyCheckmateRequest {
  tenantId: string;
  hostUrl: string;
  apiKey: string;
  workspaceId: string;
  userId: string;
}

export interface VerifyCheckmateResponse {
  verified: boolean;
  message: string;
  details?: {
    workspaceName?: string;
    projectCount?: number;
  };
}

export interface CreateCheckmateIntegrationRequest {
  tenantId: string;
  displayName?: string;
  hostUrl: string;
  apiKey: string;
  workspaceId: string;
  providerConfig?: {
    defaultProjectId?: string;
    syncEnabled?: boolean;
    webhookEnabled?: boolean;
  };
  userId: string;
}

export interface UpdateCheckmateIntegrationRequest {
  tenantId: string;
  displayName?: string;
  hostUrl?: string;
  apiKey?: string;
  workspaceId?: string;
  providerConfig?: {
    defaultProjectId?: string;
    syncEnabled?: boolean;
    webhookEnabled?: boolean;
  };
  userId: string;
}

export interface CheckmateIntegration {
  id: string;
  tenantId: string;
  displayName: string;
  hostUrl: string;
  workspaceId: string;
  providerConfig: {
    defaultProjectId?: string;
    syncEnabled?: boolean;
    webhookEnabled?: boolean;
  };
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string | null;
  verificationError: string | null;
  isActive: boolean;
  hasValidToken: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckmateIntegrationResponse {
  success: boolean;
  integration?: CheckmateIntegration;
  message?: string;
  error?: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class CheckmateIntegrationServiceClass extends IntegrationService {
  /**
   * Verify Checkmate connection
   */
  async verifyCheckmate(data: VerifyCheckmateRequest): Promise<VerifyCheckmateResponse> {
    this.logRequest('GET', `/tenants/${data.tenantId}/integrations/test-management/checkmate/verify`);
    
    try {
      const result = await this.get<VerifyCheckmateResponse>(
        `/tenants/${data.tenantId}/integrations/test-management/checkmate/verify`,
        data.userId,
        {
          params: {
            hostUrl: data.hostUrl,
            apiKey: data.apiKey,
            workspaceId: data.workspaceId
          }
        }
      );

      this.logResponse('GET', `/tenants/${data.tenantId}/integrations/test-management/checkmate/verify`, result.verified);
      return result;
    } catch (error: any) {
      this.logResponse('GET', `/tenants/${data.tenantId}/integrations/test-management/checkmate/verify`, false);
      
      return {
        verified: false,
        message: error.message || 'Failed to verify Checkmate connection',
      };
    }
  }

  /**
   * Create Checkmate integration
   */
  async createIntegration(data: CreateCheckmateIntegrationRequest): Promise<CheckmateIntegrationResponse> {
    this.logRequest('POST', `/tenants/${data.tenantId}/integrations/test-management/checkmate`);
    
    try {
      const result = await this.post<CheckmateIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/test-management/checkmate`,
        {
          displayName: data.displayName,
          hostUrl: data.hostUrl,
          apiKey: data.apiKey,
          workspaceId: data.workspaceId,
          providerConfig: data.providerConfig
        },
        data.userId
      );

      this.logResponse('POST', `/tenants/${data.tenantId}/integrations/test-management/checkmate`, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create Checkmate integration'
      };
    }
  }

  /**
   * Get Checkmate integration for tenant
   */
  async getIntegration(tenantId: string, userId: string): Promise<CheckmateIntegrationResponse> {
    try {
      return await this.get<CheckmateIntegrationResponse>(
        `/tenants/${tenantId}/integrations/test-management/checkmate`,
        userId
      );
    } catch (error: any) {
      if ((error as any).status === 404) {
        return {
          success: false,
          error: 'No Checkmate integration found'
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
    this.logRequest('PATCH', `/tenants/${data.tenantId}/integrations/test-management/checkmate`);
    
    try {
      const result = await this.patch<CheckmateIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/test-management/checkmate`,
        {
          displayName: data.displayName,
          hostUrl: data.hostUrl,
          apiKey: data.apiKey,
          workspaceId: data.workspaceId,
          providerConfig: data.providerConfig
        },
        data.userId
      );

      this.logResponse('PATCH', `/tenants/${data.tenantId}/integrations/test-management/checkmate`, result.success);
      return result;
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
  async deleteIntegration(tenantId: string, userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await this.delete<{ success: boolean; message?: string }>(
        `/tenants/${tenantId}/integrations/test-management/checkmate`,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete Checkmate integration'
      };
    }
  }
}

// Export singleton instance
export const CheckmateIntegrationService = new CheckmateIntegrationServiceClass();

