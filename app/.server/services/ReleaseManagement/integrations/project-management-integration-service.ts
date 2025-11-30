/**
 * Project Management Integration Service
 * Generic service for all PM providers (JIRA, LINEAR, ASANA, MONDAY, CLICKUP)
 * Handles credentials management for project management tools
 */

import { IntegrationService } from './base-integration';
import { PROJECT_MANAGEMENT } from './api-routes';

// ============================================================================
// Types
// ============================================================================

export type ProjectManagementProviderType = 'JIRA' | 'LINEAR' | 'ASANA' | 'MONDAY' | 'CLICKUP';

export interface PMIntegrationConfig {
  baseUrl: string;
  [key: string]: unknown; // Allow provider-specific fields
}

export interface PMIntegration {
  id: string;
  tenantId: string;
  name: string;
  providerType: ProjectManagementProviderType;
  config: PMIntegrationConfig;
  createdByAccountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePMIntegrationRequest {
  name: string;
  providerType: ProjectManagementProviderType;
  config: PMIntegrationConfig;
}

export interface UpdatePMIntegrationRequest {
  name?: string;
  config?: Partial<PMIntegrationConfig>;
}

export interface VerifyPMRequest {
  tenantId?: string;
  providerType: ProjectManagementProviderType;
  config: PMIntegrationConfig;
}

export interface PMIntegrationResponse {
  success: boolean;
  data?: PMIntegration;
  error?: string;
  message?: string;
}

export interface PMVerifyResponse {
  success: boolean;
  verified?: boolean;
  message?: string;
  details?: any;
  error?: string;
}

export interface PMListResponse {
  success: boolean;
  data?: PMIntegration[];
  error?: string;
}

// ============================================================================
// Service Class
// ============================================================================

class ProjectManagementIntegrationServiceClass extends IntegrationService {
  /**
   * Verify PM credentials without saving
   */
  async verifyCredentials(
    data: VerifyPMRequest,
    userId: string
  ): Promise<PMVerifyResponse> {
    const tenantId = data.tenantId || 'default-tenant';
    const endpoint = PROJECT_MANAGEMENT.verify(tenantId);
    
    console.log('[ProjectManagementIntegrationService] Calling backend:', {
      url: `${this.baseUrl}${endpoint}`,
      method: 'POST',
      providerType: data.providerType,
      config: { 
        baseUrl: data.config.baseUrl,
        email: data.config.email,
        jiraType: data.config.jiraType,
        apiToken: data.config.apiToken ? `[${data.config.apiToken.length} chars]` : '[MISSING]',
        password: '[REDACTED]'
      },
      userId: userId
    });
    
    this.logRequest('POST', endpoint, {
      providerType: data.providerType,
      config: { ...data.config, apiToken: '[REDACTED]', password: '[REDACTED]' }
    });
    
    try {
      const result = await this.post<any>(
        endpoint,
        {
          providerType: data.providerType,
          config: data.config,
        },
        userId
      );
      
      console.log('[ProjectManagementIntegrationService] Raw backend response:', JSON.stringify(result, null, 2));
      
      // Backend returns nested structure: { success: true, data: { verified, message, etc } }
      // We need to unwrap it
      let verificationResult: PMVerifyResponse;
      
      if (result.data && typeof result.data === 'object') {
        // Response is wrapped in data field
        verificationResult = {
          success: result.data.success !== false,
          verified: result.data.verified === true,
          message: result.data.message,
          details: result.data.details,
          error: result.data.error,
        };
      } else if (typeof result.verified !== 'undefined') {
        // Response has verified at top level
        verificationResult = {
          success: result.success !== false,
          verified: result.verified === true,
          message: result.message,
          details: result.details,
          error: result.error,
        };
      } else {
        // Invalid response structure
        console.error('[ProjectManagementIntegrationService] Invalid response from backend:', result);
        return {
          success: false,
          verified: false,
          error: 'Invalid response from backend - no verification status',
        };
      }
      
      this.logResponse('POST', endpoint, verificationResult.verified === true);
      
      return verificationResult;
    } catch (error: any) {
      this.logResponse('POST', endpoint, false);
      console.error('[ProjectManagementIntegrationService] Verification error:', error);
      
      // Check if this is a network/connection error
      if (error.message === 'No response from server') {
        return {
          success: false,
          verified: false,
          error: 'Unable to connect to backend server. Please check your backend configuration.',
        };
      }
      
      return {
        success: false,
        verified: false,
        error: error.message || 'Failed to verify credentials',
      };
    }
  }

  /**
   * List all integrations, optionally filtered by provider type
   */
  async listIntegrations(
    tenantId: string,
    userId: string,
    providerType?: ProjectManagementProviderType
  ): Promise<PMListResponse> {
    try {
      const response = await this.get<{ success: boolean; data: any[] }>(
        PROJECT_MANAGEMENT.list(tenantId),
        userId
      );
      
      let integrations = response.data || [];
      
      // Filter by provider type if specified
      if (providerType) {
        integrations = integrations.filter(
          (integration) => integration.providerType === providerType
        );
      }
      
      return {
        success: response.success,
        data: integrations,
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        error: error.message || 'Failed to list integrations'
      };
    }
  }

  /**
   * Get integration for tenant, optionally filtered by provider type
   */
  async getIntegration(
    tenantId: string,
    userId: string,
    providerType?: ProjectManagementProviderType
  ): Promise<PMIntegrationResponse> {
    try {
      const list = await this.listIntegrations(tenantId, userId, providerType);
      
      if (!list.success || !list.data || list.data.length === 0) {
        return {
          success: false,
          error: providerType 
            ? `No ${providerType} integration found`
            : 'No integration found'
        };
      }
      
      // Return the first integration
      return {
        success: true,
        data: list.data[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get integration'
      };
    }
  }

  /**
   * Create PM integration for tenant
   */
  async createIntegration(
    tenantId: string,
    userId: string,
    data: CreatePMIntegrationRequest
  ): Promise<PMIntegrationResponse> {
    try {
      return await this.post<PMIntegrationResponse>(
        PROJECT_MANAGEMENT.create(tenantId),
        {
          name: data.name,
          providerType: data.providerType,
          config: data.config,
        },
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create integration'
      };
    }
  }

  /**
   * Update PM integration for tenant
   */
  async updateIntegration(
    tenantId: string,
    integrationId: string,
    userId: string,
    data: UpdatePMIntegrationRequest
  ): Promise<PMIntegrationResponse> {
    try {
      return await this.put<PMIntegrationResponse>(
        PROJECT_MANAGEMENT.update(tenantId, integrationId),
        data,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update integration'
      };
    }
  }

  /**
   * Delete PM integration for tenant
   */
  async deleteIntegration(
    tenantId: string,
    integrationId: string,
    userId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await this.delete<{ success: boolean; message?: string }>(
        PROJECT_MANAGEMENT.delete(tenantId, integrationId),
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete integration'
      };
    }
  }
}

export const ProjectManagementIntegrationService = new ProjectManagementIntegrationServiceClass();

