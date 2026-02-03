/**
 * Jira Metadata Service
 * 
 * Service for fetching Jira-specific metadata (projects) through project management integrations
 */

import type { ProjectManagementIntegrationRepository } from '~models/integrations/project-management/integration';
import { ProjectManagementProviderType } from '~types/integrations/project-management';
import { JiraProvider } from '../../providers/jira/jira.provider';
import type { JiraMetadataResult } from '../../providers/jira/jira.interface';

export type JiraProject = {
  key: string;
  name: string;
};

export class JiraMetadataService {
  constructor(
    private readonly integrationRepo: ProjectManagementIntegrationRepository
  ) {}

  /**
   * Get all projects from Jira
   * Returns result object instead of throwing exceptions
   */
  async getProjects(integrationId: string, tenantId?: string): Promise<JiraMetadataResult<JiraProject[]>> {
    const integration = await this.integrationRepo.findById(integrationId);
    
    if (!integration) {
      return {
        success: false,
        message: 'Integration not found',
        statusCode: 404
      };
    }

    // Validate tenant ownership if tenantId provided
    if (tenantId && integration.tenantId !== tenantId) {
      return {
        success: false,
        message: 'Access denied. Integration does not belong to this tenant.',
        statusCode: 403
      };
    }

    // Validate integration is Jira
    const isJira = integration.providerType === ProjectManagementProviderType.JIRA;
    if (!isJira) {
      return {
        success: false,
        message: `Jira metadata APIs are only supported for Jira integrations. Integration ${integrationId} is ${integration.providerType}`,
        statusCode: 400
      };
    }

    const provider = new JiraProvider();
    const result = await provider.getProjectsWithResult(integration.config);
    
    return result;
  }
}

