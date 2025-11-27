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
    try {
      const tenantId = data.tenantId || 'default-tenant';
      
      return await this.post<PMVerifyResponse>(
        PROJECT_MANAGEMENT.verify(tenantId),
        {
          providerType: data.providerType,
          config: data.config,
        },
        userId
      );
    } catch (error: any) {
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

