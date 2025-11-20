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
}

export const githubActionsIntegrationService = new GitHubActionsIntegrationService();
