/**
 * Jira Metadata Service
 * 
 * Service for fetching Jira-specific metadata (projects) through project management integrations
 */

import type { ProjectManagementIntegrationRepository } from '~models/integrations/project-management/integration';
import { ProjectManagementProviderType } from '~types/integrations/project-management';
import { JiraProvider } from '../../providers/jira/jira.provider';

export type JiraProject = {
  key: string;
  name: string;
};

export type JiraProjectStatus = {
  id: string;
  name: string;
  category: string;
};

export type JiraProjectIssueType = {
  id: string;
  name: string;
  subtask: boolean;
  description?: string;
};

export class JiraMetadataService {
  constructor(
    private readonly integrationRepo: ProjectManagementIntegrationRepository
  ) {}

  /**
   * Validate that integration is Jira
   * Metadata APIs are Jira-specific
   */
  private validateJiraIntegration(providerType: string, integrationId: string): void {
    const isJira = providerType === ProjectManagementProviderType.JIRA;
    
    if (!isJira) {
      throw new Error(
        `Jira metadata APIs are only supported for Jira integrations. Integration ${integrationId} is ${providerType}`
      );
    }
  }

  /**
   * Get all projects from Jira
   */
  async getProjects(integrationId: string, tenantId?: string): Promise<JiraProject[]> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    // Validate tenant ownership if tenantId provided
    if (tenantId && integration.tenantId !== tenantId) {
      throw new Error(`Integration ${integrationId} does not belong to tenant ${tenantId}`);
    }

    this.validateJiraIntegration(integration.providerType, integrationId);

    const provider = new JiraProvider();
    const projects = await provider.getProjects(integration.config);
    
    return projects;
  }

  /**
   * Get all statuses for a Jira project
   */
  async getProjectStatuses(
    integrationId: string, 
    projectKey: string,
    tenantId?: string
  ): Promise<JiraProjectStatus[]> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    // Validate tenant ownership if tenantId provided
    if (tenantId && integration.tenantId !== tenantId) {
      throw new Error(`Integration ${integrationId} does not belong to tenant ${tenantId}`);
    }

    this.validateJiraIntegration(integration.providerType, integrationId);

    const provider = new JiraProvider();
    const statuses = await provider.getProjectStatuses(integration.config, projectKey);
    
    return statuses;
  }

  /**
   * Get all issue types for a Jira project
   */
  async getProjectIssueTypes(
    integrationId: string,
    projectKey: string,
    tenantId?: string
  ): Promise<JiraProjectIssueType[]> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    // Validate tenant ownership if tenantId provided
    if (tenantId && integration.tenantId !== tenantId) {
      throw new Error(`Integration ${integrationId} does not belong to tenant ${tenantId}`);
    }

    this.validateJiraIntegration(integration.providerType, integrationId);

    const provider = new JiraProvider();
    const issueTypes = await provider.getProjectIssueTypes(integration.config, projectKey);
    
    return issueTypes;
  }
}

