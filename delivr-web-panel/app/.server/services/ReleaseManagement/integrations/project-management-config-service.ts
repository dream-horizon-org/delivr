/**
 * Project Management Configuration Service
 * Handles CRUD operations for PM configurations
 */

import { IntegrationService } from './base-integration';
import { PROJECT_MANAGEMENT } from './api-routes';

export interface PMConfig {
  id: string;
  integrationId: string;
  name: string;
  platformConfigurations: any[];
  createdByAccountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PMConfigResponse {
  success: boolean;
  data?: PMConfig | PMConfig[];
  error?: string;
}

class ProjectManagementConfigServiceClass extends IntegrationService {
  /**
   * Create PM configuration
   */
  async createConfig(
    appId: string,
    userId: string,
    config: {
      integrationId: string;
      name: string;
      platformConfigurations: any[];
    }
  ): Promise<PMConfigResponse> {
    const endpoint = PROJECT_MANAGEMENT.config.create(appId);
    this.logRequest('POST', endpoint);
    
    try {
      const result = await this.post<{ success: boolean; data: PMConfig; error?: string }>(
        endpoint,
        {
          ...config,
          projectId: appId, // Backend expects projectId
          createdByAccountId: userId,
        },
        userId
      );

      this.logResponse('POST', endpoint, result.success);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create PM config'
      };
    }
  }

  /**
   * Get PM configuration by ID
   */
  async getConfig(
    appId: string,
    configId: string,
    userId: string
  ): Promise<PMConfigResponse> {
    const endpoint = PROJECT_MANAGEMENT.config.get(appId, configId);
    this.logRequest('GET', endpoint);
    
    try {
      const result = await this.get<{ success: boolean; data: PMConfig; error?: string }>(
        endpoint,
        userId
      );

      this.logResponse('GET', endpoint, result.success);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get PM config'
      };
    }
  }

  /**
   * Update PM configuration
   */
  async updateConfig(
    appId: string,
    configId: string,
    userId: string,
    updates: Partial<{
      name: string;
      platformConfigurations: any[];
    }>
  ): Promise<PMConfigResponse> {
    const endpoint = PROJECT_MANAGEMENT.config.update(appId, configId);
    this.logRequest('PUT', endpoint);
    
    try {
      const result = await this.put<{ success: boolean; data: PMConfig; error?: string }>(
        endpoint,
        updates,
        userId
      );

      this.logResponse('PUT', endpoint, result.success);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update PM config'
      };
    }
  }

  /**
   * Delete PM configuration
   */
  async deleteConfig(
    appId: string,
    configId: string,
    userId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const endpoint = PROJECT_MANAGEMENT.config.delete(appId, configId);
    this.logRequest('DELETE', endpoint);
    
    try {
      const result = await this.delete<{ success: boolean; message?: string; error?: string }>(
        endpoint,
        userId
      );

      this.logResponse('DELETE', endpoint, result.success);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete PM config'
      };
    }
  }
}

export const ProjectManagementConfigService = new ProjectManagementConfigServiceClass();

