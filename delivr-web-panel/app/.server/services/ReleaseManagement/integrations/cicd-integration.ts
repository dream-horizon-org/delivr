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
export type WorkflowType = 'PRE_REGRESSION' | 'REGRESSION' | 'TESTFLIGHT' | 'PRODUCTION' | 'AAB_BUILD';
export type PlatformType = 'ANDROID' | 'IOS' | 'WEB';

export interface WorkflowParameter {
  name: string;
  type: string;
  description?: string;
  defaultValue?: unknown;
  options?: string[];
  required?: boolean;
}

export interface CICDWorkflow {
  id: string;
  appId: string;
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
  parameters?: WorkflowParameter[];
  providerIdentifiers?: any;
}

export interface WorkflowListResponse {
  success: boolean;
  workflows?: CICDWorkflow[];
  error?: string;
}

export interface JobParametersResponse {
  success: boolean;
  parameters?: WorkflowParameter[];
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
    appId: string,
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

      const url = buildUrlWithQuery(CICD.listWorkflows(appId), {
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
    appId: string,
    userId: string,
    providerType: CICDProviderType,
    filters?: Omit<WorkflowFilters, 'providerType'>
  ): Promise<WorkflowListResponse> {
    return this.listAllWorkflows(appId, userId, { ...filters, providerType });
  }

  /**
   * List Jenkins workflows
   */
  async listJenkinsWorkflows(
    appId: string,
    userId: string,
    filters?: Omit<WorkflowFilters, 'providerType'>
  ): Promise<WorkflowListResponse> {
    return JenkinsIntegrationService.listWorkflows(appId, userId, filters);
  }

  /**
   * List GitHub Actions workflows
   */
  async listGitHubActionsWorkflows(
    appId: string,
    userId: string,
    filters?: Omit<WorkflowFilters, 'providerType'>
  ): Promise<WorkflowListResponse> {
    return GitHubActionsIntegrationService.listWorkflows(appId, userId, filters);
  }

  /**
   * Get specific workflow by ID
   */
  async getWorkflow(
    appId: string,
    workflowId: string,
    userId: string
  ): Promise<WorkflowResponse> {
    try {
      return await this.get<WorkflowResponse>(
        CICD.getWorkflow(appId, workflowId),
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
    appId: string,
    userId: string,
    data: CreateWorkflowRequest
  ): Promise<WorkflowResponse> {
    try {
      return await this.post<WorkflowResponse>(
        CICD.createWorkflow(appId),
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
    appId: string,
    workflowId: string,
    userId: string,
    data: Partial<CreateWorkflowRequest>
  ): Promise<WorkflowResponse> {
    try {
      return await this.patch<WorkflowResponse>(
        CICD.updateWorkflow(appId, workflowId),
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
    appId: string,
    workflowId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.delete(
        CICD.deleteWorkflow(appId, workflowId),
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
    appId: string,
    userId: string,
    providerType: CICDProviderType,
    integrationId: string,
    url: string
  ): Promise<JobParametersResponse> {
    if (providerType === 'JENKINS') {
      return JenkinsIntegrationService.fetchJobParameters(appId, userId, integrationId, url);
    } else if (providerType === 'GITHUB_ACTIONS') {
      return GitHubActionsIntegrationService.fetchWorkflowInputs(appId, userId, integrationId, url);
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
    appId: string,
    userId: string,
    integrationId: string,
    jobUrl: string
  ): Promise<JobParametersResponse> {
    return JenkinsIntegrationService.fetchJobParameters(appId, userId, integrationId, jobUrl);
  }

  /**
   * Fetch GitHub Actions workflow inputs
   */
  async fetchGitHubActionsInputs(
    appId: string,
    userId: string,
    integrationId: string,
    workflowUrl: string
  ): Promise<JobParametersResponse> {
    return GitHubActionsIntegrationService.fetchWorkflowInputs(appId, userId, integrationId, workflowUrl);
  }

  /**
   * Get workflows grouped by environment (platform + workflow type)
   * Useful for the build configuration step
   */
  async getWorkflowsByEnvironment(
    appId: string,
    userId: string
  ): Promise<{
    success: boolean;
    grouped?: Record<string, CICDWorkflow[]>;
    error?: string;
  }> {
    try {
      const result = await this.listAllWorkflows(appId, userId);
      
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

