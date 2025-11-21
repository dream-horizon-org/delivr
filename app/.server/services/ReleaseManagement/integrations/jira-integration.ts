/**
 * BFF Service: Jira Integration
 * Handles Jira project management integration operations
 */

import { IntegrationService } from './base-integration';
import { PROJECT_MANAGEMENT } from './api-routes';
import type {
  CreateJiraIntegrationRequest,
  UpdateJiraIntegrationRequest,
  VerifyJiraRequest,
  JiraIntegrationResponse,
  JiraVerifyResponse,
  JiraListResponse,
} from '~/types/jira-integration';

class JiraIntegrationServiceClass extends IntegrationService {
  constructor() {
    super();
  }

  /**
   * Verify Jira credentials without saving
   */
  async verifyCredentials(
    data: VerifyJiraRequest,
    userId: string
  ): Promise<JiraVerifyResponse> {
    try {
      // Use projectId from data or default
      const projectId = data.projectId || 'default-project';
      
      return await this.post<JiraVerifyResponse>(
        PROJECT_MANAGEMENT.verify(projectId),
        {
          providerType: 'JIRA',
          config: data.config,
        },
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        verified: false,
        error: error.message || 'Failed to verify Jira credentials',
      };
    }
  }

  /**
   * List all integrations and filter for JIRA
   */
  async listIntegrations(
    projectId: string,
    userId: string
  ): Promise<JiraListResponse> {
    try {
      const response = await this.get<{ success: boolean; data: any[] }>(
        PROJECT_MANAGEMENT.list(projectId),
        userId
      );
      
      // Filter for JIRA integrations only
      const jiraIntegrations = response.data?.filter(
        (integration) => integration.providerType === 'JIRA'
      ) || [];
      
      return {
        success: response.success,
        data: jiraIntegrations,
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        error: error.message || 'Failed to list Jira integrations'
      };
    }
  }

  /**
   * Get Jira integration for tenant/project (tenant = project in our system)
   */
  async getIntegration(tenantId: string, userId: string): Promise<JiraIntegrationResponse> {
    try {
      const list = await this.listIntegrations(tenantId, userId);
      
      if (!list.success || !list.data || list.data.length === 0) {
        return {
          success: false,
          error: 'No Jira integration found'
        };
      }
      
      // Return the first JIRA integration
      return {
        success: true,
        data: list.data[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get Jira integration'
      };
    }
  }

  /**
   * Create Jira integration for tenant/project
   */
  async createIntegration(
    projectId: string,
    userId: string,
    data: {
      name: string;
      providerType: 'jira';
      config: {
        baseUrl: string;
        email: string;
        apiToken: string;
        jiraType: 'CLOUD' | 'SERVER' | 'DATA_CENTER';
      };
    }
  ): Promise<JiraIntegrationResponse> {
    try {
      return await this.post<JiraIntegrationResponse>(
        PROJECT_MANAGEMENT.create(projectId),
        {
          name: data.name,
          providerType: 'JIRA',
          config: data.config,
        },
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create Jira integration'
      };
    }
  }

  /**
   * Update Jira integration for tenant/project
   */
  async updateIntegration(
    projectId: string,
    integrationId: string,
    userId: string,
    data: {
      name?: string;
      config?: Partial<{
        baseUrl: string;
        email: string;
        apiToken: string;
        jiraType: 'CLOUD' | 'SERVER' | 'DATA_CENTER';
      }>;
    }
  ): Promise<JiraIntegrationResponse> {
    try {
      return await this.put<JiraIntegrationResponse>(
        PROJECT_MANAGEMENT.update(projectId, integrationId),
        data,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update Jira integration'
      };
    }
  }

  /**
   * Delete Jira integration for tenant/project
   */
  async deleteIntegration(
    projectId: string,
    integrationId: string,
    userId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await this.delete<{ success: boolean; message?: string }>(
        PROJECT_MANAGEMENT.delete(projectId, integrationId),
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

export const JiraIntegrationService = new JiraIntegrationServiceClass();
