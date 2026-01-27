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
  async getProjects(integrationId: string, appId?: string): Promise<JiraProject[]> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    // Validate tenant ownership if appId provided
    if (appId && integration.appId !== appId) {
      throw new Error(`Integration ${integrationId} does not belong to tenant ${appId}`);
    }

    this.validateJiraIntegration(integration.providerType, integrationId);

    const provider = new JiraProvider();
    const projects = await provider.getProjects(integration.config);
    
    return projects;
  }
}

