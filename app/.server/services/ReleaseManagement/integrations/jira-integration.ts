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

export class JiraIntegrationService extends IntegrationService {
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
   * Create Jira integration for a project
   */
  async createIntegration(
    projectId: string,
    userId: string,
    data: CreateJiraIntegrationRequest
  ): Promise<JiraIntegrationResponse> {
    try {
      return await this.post<JiraIntegrationResponse>(
        `/projects/${projectId}/integrations/project-management`,
        data,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create Jira integration',
      };
    }
  }

  /**
   * List Jira integrations for a project
   */
  async listIntegrations(
    projectId: string,
    userId: string
  ): Promise<JiraListResponse> {
    try {
      return await this.get<JiraListResponse>(
        `/projects/${projectId}/integrations/project-management`,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to list Jira integrations',
      };
    }
  }

  /**
   * Get specific Jira integration
   */
  async getIntegration(
    projectId: string,
    integrationId: string,
    userId: string
  ): Promise<JiraIntegrationResponse> {
    try {
      return await this.get<JiraIntegrationResponse>(
        `/projects/${projectId}/integrations/project-management/${integrationId}`,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get Jira integration',
      };
    }
  }

  /**
   * Update Jira integration
   */
  async updateIntegration(
    projectId: string,
    integrationId: string,
    userId: string,
    data: UpdateJiraIntegrationRequest
  ): Promise<JiraIntegrationResponse> {
    try {
      return await this.put<JiraIntegrationResponse>(
        `/projects/${projectId}/integrations/project-management/${integrationId}`,
        data,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update Jira integration',
      };
    }
  }

  /**
   * Delete Jira integration
   */
  async deleteIntegration(
    projectId: string,
    integrationId: string,
    userId: string
  ): Promise<JiraIntegrationResponse> {
    try {
      return await this.delete<JiraIntegrationResponse>(
        `/projects/${projectId}/integrations/project-management/${integrationId}`,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete Jira integration',
      };
    }
  }

  /**
   * Verify existing Jira integration
   */
  async verifyIntegration(
    projectId: string,
    integrationId: string,
    userId: string
  ): Promise<JiraVerifyResponse> {
    try {
      return await this.post<JiraVerifyResponse>(
        `/projects/${projectId}/integrations/project-management/${integrationId}/verify`,
        {},
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        verified: false,
        error: error.message || 'Failed to verify Jira integration',
      };
    }
  }
}

export const jiraIntegrationService = new JiraIntegrationService();
