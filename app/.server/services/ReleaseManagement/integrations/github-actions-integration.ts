/**
 * BFF Service: GitHub Actions Integration
 * Handles GitHub Actions CI/CD integration operations
 */

import { IntegrationService } from './base-integration';
import { CICD, buildUrlWithQuery } from './api-routes';
import type {
  CreateGitHubActionsRequest,
  UpdateGitHubActionsRequest,
  VerifyGitHubActionsRequest,
  GitHubActionsIntegrationResponse,
  GitHubActionsVerifyResponse,
} from '~/types/github-actions-integration';

export class GitHubActionsIntegrationService extends IntegrationService {
  constructor() {
    super();
  }

  /**
   * Verify GitHub Actions token/credentials
   */
  async verifyConnection(
    tenantId: string,
    userId: string,
    data?: VerifyGitHubActionsRequest
  ): Promise<GitHubActionsVerifyResponse> {
    try {
      return await this.post<GitHubActionsVerifyResponse>(
        CICD.verifyConnection(tenantId, 'GITHUB_ACTIONS'),
        data || {},
        userId
      );
    } catch (error: any) {
      return {
        verified: false,
        message: error.message || 'Failed to verify GitHub Actions credentials',
      };
    }
  }

  /**
   * Create GitHub Actions integration
   */
  async createIntegration(
    tenantId: string,
    userId: string,
    data: CreateGitHubActionsRequest
  ): Promise<GitHubActionsIntegrationResponse> {
    try {
      return await this.post<GitHubActionsIntegrationResponse>(
        CICD.createConnection(tenantId, 'GITHUB_ACTIONS'),
        data,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create GitHub Actions integration',
      };
    }
  }

  /**
   * Get GitHub Actions integration
   */
  async getIntegration(
    tenantId: string,
    userId: string
  ): Promise<GitHubActionsIntegrationResponse> {
    try {
      return await this.get<GitHubActionsIntegrationResponse>(
        CICD.getProvider(tenantId, 'github-actions'),
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get GitHub Actions integration',
      };
    }
  }

  /**
   * Update GitHub Actions integration
   */
  async updateIntegration(
    tenantId: string,
    integrationId: string,
    userId: string,
    data: UpdateGitHubActionsRequest
  ): Promise<GitHubActionsIntegrationResponse> {
    try {
      return await this.patch<GitHubActionsIntegrationResponse>(
        CICD.updateConnection(tenantId, integrationId),
        data,
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update GitHub Actions integration',
      };
    }
  }

  /**
   * Delete GitHub Actions integration
   */
  async deleteIntegration(
    tenantId: string,
    integrationId: string,
    userId: string
  ): Promise<GitHubActionsIntegrationResponse> {
    try {
      return await this.delete<GitHubActionsIntegrationResponse>(
        CICD.deleteConnection(tenantId, integrationId),
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete GitHub Actions integration',
      };
    }
  }

  // ============================================================================
  // Workflow Management
  // ============================================================================

  /**
   * Fetch GitHub Actions workflow inputs (job parameters)
   */
  async fetchWorkflowInputs(tenantId: string, userId: string, workflowUrl: string): Promise<any> {
    try {
      return await this.post(
        CICD.jobParameters(tenantId, 'github-actions'),
        { workflowUrl },
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        parameters: [],
        error: error.message || 'Failed to fetch workflow inputs'
      };
    }
  }

  /**
   * List GitHub Actions workflows for tenant
   */
  async listWorkflows(tenantId: string, userId: string, filters?: any): Promise<any> {
    try {
      const url = buildUrlWithQuery(CICD.listWorkflows(tenantId), {
        providerType: 'GITHUB_ACTIONS',
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
   * Create GitHub Actions workflow configuration
   */
  async createWorkflow(tenantId: string, userId: string, data: any): Promise<any> {
    try {
      return await this.post(
        CICD.createWorkflow(tenantId),
        { ...data, providerType: 'GITHUB_ACTIONS' },
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
   * Update GitHub Actions workflow configuration
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
   * Delete GitHub Actions workflow configuration
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

export const githubActionsIntegrationService = new GitHubActionsIntegrationService();
