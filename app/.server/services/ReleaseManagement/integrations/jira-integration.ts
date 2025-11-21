/**
 * BFF Service: Jira Integration
 * Handles Jira project management integration operations
 */

import { IntegrationService } from './base-integration';
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
      return await this.post<JiraVerifyResponse>(
        `/integrations/project-management/verify`,
        {
          providerType: 'jira',
          ...data,
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
   * Get Jira integration for tenant/project (tenant = project in our system)
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
   * Create Jira integration for tenant/project
   */
  async createIntegration(data: any): Promise<JiraIntegrationResponse> {
    try {
      return await this.post<JiraIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/project-management/jira`,
        data,
        data.userId
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
  async updateIntegration(data: any): Promise<JiraIntegrationResponse> {
    try {
      return await this.patch<JiraIntegrationResponse>(
        `/tenants/${data.tenantId}/integrations/project-management/jira`,
        data,
        data.userId
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

export const JiraIntegrationService = new JiraIntegrationServiceClass();
