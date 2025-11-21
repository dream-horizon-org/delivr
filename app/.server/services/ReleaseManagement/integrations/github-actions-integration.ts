/**
 * BFF Service: GitHub Actions Integration
 * Handles GitHub Actions CI/CD integration operations
 */

import { IntegrationService } from './base-integration';
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
        `/tenants/${tenantId}/integrations/ci-cd/github-actions/verify`,
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
        `/tenants/${tenantId}/integrations/ci-cd/github-actions`,
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
        `/tenants/${tenantId}/integrations/ci-cd/github-actions`,
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
    userId: string,
    data: UpdateGitHubActionsRequest
  ): Promise<GitHubActionsIntegrationResponse> {
    try {
      return await this.patch<GitHubActionsIntegrationResponse>(
        `/tenants/${tenantId}/integrations/ci-cd/github-actions`,
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
    userId: string
  ): Promise<GitHubActionsIntegrationResponse> {
    try {
      return await this.delete<GitHubActionsIntegrationResponse>(
        `/tenants/${tenantId}/integrations/ci-cd/github-actions`,
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
        `/tenants/${tenantId}/integrations/ci-cd/github-actions/job-parameters`,
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
      const queryParams = new URLSearchParams();
      queryParams.append('providerType', 'GITHUB_ACTIONS');
      if (filters?.platform) queryParams.append('platform', filters.platform);
      if (filters?.workflowType) queryParams.append('workflowType', filters.workflowType);

      return await this.get(
        `/tenants/${tenantId}/integrations/ci-cd/workflows?${queryParams.toString()}`,
        userId
      );
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
        `/tenants/${tenantId}/integrations/ci-cd/workflows`,
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
        `/tenants/${tenantId}/integrations/ci-cd/workflows/${workflowId}`,
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
        `/tenants/${tenantId}/integrations/ci-cd/workflows/${workflowId}`,
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
