/**
 * Combined CI/CD Integration Service
 * Provides unified interface for both Jenkins and GitHub Actions workflows
 */

import { IntegrationService } from './base-integration';
import { CICD, buildUrlWithQuery } from './api-routes';
import { JenkinsIntegrationService } from './jenkins-integration';
import { githubActionsIntegrationService as GitHubActionsIntegrationService } from './github-actions-integration';

// ============================================================================
// Types
// ============================================================================

export type CICDProviderType = 'JENKINS' | 'GITHUB_ACTIONS';
export type WorkflowType = 'PRE_REGRESSION' | 'REGRESSION' | 'TESTFLIGHT' | 'PRODUCTION';
export type PlatformType = 'ANDROID' | 'IOS' | 'WEB';

export interface JobParameter {
  name: string;
  type: string;
  description?: string;
  defaultValue?: any;
  default?: any;
  required?: boolean;
  choices?: string[];
}

export interface CICDWorkflow {
  id: string;
  tenantId: string;
  providerType: CICDProviderType;
  integrationId: string;
  displayName: string;
  workflowUrl: string;
  platform: PlatformType;
  workflowType: WorkflowType;
  parameters?: Record<string, any>;
  providerIdentifiers?: any;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowFilters {
  providerType?: CICDProviderType;
  platform?: PlatformType;
  workflowType?: WorkflowType;
  integrationId?: string;
}

export interface CreateWorkflowRequest {
  providerType: CICDProviderType;
  integrationId: string;
  displayName: string;
  workflowUrl: string;
  platform: PlatformType;
  workflowType: WorkflowType;
  parameters?: Record<string, any>;
  providerIdentifiers?: any;
}

export interface WorkflowListResponse {
  success: boolean;
  workflows?: CICDWorkflow[];
  error?: string;
}

export interface JobParametersResponse {
  success: boolean;
  parameters?: JobParameter[];
  error?: string;
}

export interface WorkflowResponse {
  success: boolean;
  workflow?: CICDWorkflow;
  error?: string;
}

// ============================================================================
// Combined Service Class
// ============================================================================

export class CICDIntegrationServiceClass extends IntegrationService {
  /**
   * List ALL workflows for a tenant (both Jenkins and GitHub Actions)
   * This is the main method to use when you want to show all available workflows
   */
  async listAllWorkflows(
    tenantId: string,
    userId: string,
    filters?: WorkflowFilters
  ): Promise<WorkflowListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      // If provider is specified, only fetch from that provider
      if (filters?.providerType) {
        queryParams.append('providerType', filters.providerType);
      }
      if (filters?.platform) {
        queryParams.append('platform', filters.platform);
      }
      if (filters?.workflowType) {
        queryParams.append('workflowType', filters.workflowType);
      }
      if (filters?.integrationId) {
        queryParams.append('integrationId', filters.integrationId);
      }

      const url = buildUrlWithQuery(CICD.listWorkflows(tenantId), {
        providerType: filters?.providerType,
        platform: filters?.platform,
        workflowType: filters?.workflowType,
        integrationId: filters?.integrationId
      });

      return await this.get<WorkflowListResponse>(url, userId);
    } catch (error: any) {
      return {
        success: false,
        workflows: [],
        error: error.message || 'Failed to list workflows'
      };
    }
  }

  /**
   * List workflows by provider type
   */
  async listWorkflowsByProvider(
    tenantId: string,
    userId: string,
    providerType: CICDProviderType,
    filters?: Omit<WorkflowFilters, 'providerType'>
  ): Promise<WorkflowListResponse> {
    return this.listAllWorkflows(tenantId, userId, { ...filters, providerType });
  }

  /**
   * List Jenkins workflows
   */
  async listJenkinsWorkflows(
    tenantId: string,
    userId: string,
    filters?: Omit<WorkflowFilters, 'providerType'>
  ): Promise<WorkflowListResponse> {
    return JenkinsIntegrationService.listWorkflows(tenantId, userId, filters);
  }

  /**
   * List GitHub Actions workflows
   */
  async listGitHubActionsWorkflows(
    tenantId: string,
    userId: string,
    filters?: Omit<WorkflowFilters, 'providerType'>
  ): Promise<WorkflowListResponse> {
    return GitHubActionsIntegrationService.listWorkflows(tenantId, userId, filters);
  }

  /**
   * Get specific workflow by ID
   */
  async getWorkflow(
    tenantId: string,
    workflowId: string,
    userId: string
  ): Promise<WorkflowResponse> {
    try {
      return await this.get<WorkflowResponse>(
        CICD.getWorkflow(tenantId, workflowId),
        userId
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get workflow'
      };
    }
  }

  /**
   * Create new workflow configuration
   */
  async createWorkflow(
    tenantId: string,
    userId: string,
    data: CreateWorkflowRequest
  ): Promise<WorkflowResponse> {
    try {
      return await this.post<WorkflowResponse>(
        CICD.createWorkflow(tenantId),
        data,
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
   * Update workflow configuration
   */
  async updateWorkflow(
    tenantId: string,
    workflowId: string,
    userId: string,
    data: Partial<CreateWorkflowRequest>
  ): Promise<WorkflowResponse> {
    try {
      return await this.patch<WorkflowResponse>(
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
   * Delete workflow configuration
   */
  async deleteWorkflow(
    tenantId: string,
    workflowId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
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

  /**
   * Fetch job parameters (provider-agnostic wrapper)
   * Delegates to the appropriate provider service
   */
  async fetchJobParameters(
    tenantId: string,
    userId: string,
    providerType: CICDProviderType,
    integrationId: string,
    url: string
  ): Promise<JobParametersResponse> {
    if (providerType === 'JENKINS') {
      return JenkinsIntegrationService.fetchJobParameters(tenantId, userId, integrationId, url);
    } else if (providerType === 'GITHUB_ACTIONS') {
      return GitHubActionsIntegrationService.fetchWorkflowInputs(tenantId, userId, integrationId, url);
    }

    return {
      success: false,
      parameters: [],
      error: 'Unsupported provider type'
    };
  }

  /**
   * Fetch Jenkins job parameters
   */
  async fetchJenkinsJobParameters(
    tenantId: string,
    userId: string,
    integrationId: string,
    jobUrl: string
  ): Promise<JobParametersResponse> {
    return JenkinsIntegrationService.fetchJobParameters(tenantId, userId, integrationId, jobUrl);
  }

  /**
   * Fetch GitHub Actions workflow inputs
   */
  async fetchGitHubActionsInputs(
    tenantId: string,
    userId: string,
    integrationId: string,
    workflowUrl: string
  ): Promise<JobParametersResponse> {
    return GitHubActionsIntegrationService.fetchWorkflowInputs(tenantId, userId, integrationId, workflowUrl);
  }

  /**
   * Get workflows grouped by environment (platform + workflow type)
   * Useful for the build configuration step
   */
  async getWorkflowsByEnvironment(
    tenantId: string,
    userId: string
  ): Promise<{
    success: boolean;
    grouped?: Record<string, CICDWorkflow[]>;
    error?: string;
  }> {
    try {
      const result = await this.listAllWorkflows(tenantId, userId);
      
      if (!result.success || !result.workflows) {
        return { success: false, error: result.error };
      }

      // Group workflows by platform-workflowType key (e.g., "ANDROID-REGRESSION")
      const grouped: Record<string, CICDWorkflow[]> = {};
      
      for (const workflow of result.workflows) {
        const key = `${workflow.platform}-${workflow.workflowType}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(workflow);
      }

      return { success: true, grouped };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to group workflows'
      };
    }
  }
}

// Export singleton instance
export const CICDIntegrationService = new CICDIntegrationServiceClass();

