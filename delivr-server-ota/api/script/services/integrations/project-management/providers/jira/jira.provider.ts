import {
  ProjectManagementProviderType,
  type ProjectManagementIntegrationConfig
} from '~types/integrations/project-management';
import type {
  CreateTicketParams,
  IProjectManagementProvider,
  TicketResult,
  TicketStatusResult
} from '../provider.interface';
import { JiraClient } from './jira.client';
import type { JiraIntegrationConfig, JiraMetadataResult } from './jira.interface';
import { JIRA_DEFAULT_ISSUE_TYPE, JIRA_ERROR_MESSAGES } from './jira.constants';
import { decryptConfigFields } from '~utils/encryption';

/**
 * JIRA Provider Implementation
 */
export class JiraProvider implements IProjectManagementProvider {
  readonly providerType = ProjectManagementProviderType.JIRA;

  /**
   * Type guard for JIRA config
   */
  private isJiraConfig(config: ProjectManagementIntegrationConfig): config is JiraIntegrationConfig {
    const hasApiToken = 'apiToken' in config && typeof config.apiToken === 'string';
    const hasEmail = 'email' in config && typeof config.email === 'string';
    const hasJiraType = 'jiraType' in config && typeof config.jiraType === 'string';
    return hasApiToken && hasEmail && hasJiraType;
  }

  /**
   * Get validated JIRA config with decrypted apiToken
   * The apiToken is stored encrypted in the database (frontend or backend format)
   */
  private getJiraConfig(config: ProjectManagementIntegrationConfig): JiraIntegrationConfig {
    if (!this.isJiraConfig(config)) {
      throw new Error(JIRA_ERROR_MESSAGES.INVALID_CONFIG);
    }
    
    // Decrypt the apiToken before using for API calls
    // Uses decryptConfigFields which handles both frontend and backend encryption formats
    const decryptedConfig = decryptConfigFields(config, ['apiToken']);
    
    return decryptedConfig as JiraIntegrationConfig;
  }

  /**
   * Validate JIRA configuration
   * Returns detailed verification result with error information
   */
  async validateConfig(
    config: ProjectManagementIntegrationConfig
  ): Promise<{ isValid: boolean; message: string; details?: any }> {
    try {
      if (!this.isJiraConfig(config)) {
        return {
          isValid: false,
          message: 'Invalid Jira configuration structure'
        };
      }

      // Decrypt apiToken before validation (may be encrypted from frontend)
      const decryptedConfig = this.getJiraConfig(config);
      const client = new JiraClient(decryptedConfig);
      const result = await client.testConnection();
      
      return {
        isValid: result.success,
        message: result.message,
        details: result.details
      };
    } catch (error) {
      console.error('JIRA config validation failed:', error);
      return {
        isValid: false,
        message: error instanceof Error ? error.message : 'Failed to validate Jira configuration'
      };
    }
  }

  /**
   * Create a JIRA ticket (epic/story/task)
   */
  async createTicket(
    config: ProjectManagementIntegrationConfig,
    params: CreateTicketParams
  ): Promise<TicketResult> {
    const jiraConfig = this.getJiraConfig(config);
    const client = new JiraClient(jiraConfig);

    const issue = await client.createIssue({
      projectKey: params.projectKey,
      summary: params.title,
      description: params.description,
      issueType: params.issueType ?? JIRA_DEFAULT_ISSUE_TYPE,
      priority: params.priority,
      labels: params.labels
    });

    return {
      ticketKey: issue.key,
      ticketId: issue.id,
      ticketUrl: `${jiraConfig.baseUrl}/browse/${issue.key}`
    };
  }

  /**
   * Get JIRA ticket status
   */
  async getTicketStatus(
    config: ProjectManagementIntegrationConfig,
    ticketKey: string
  ): Promise<TicketStatusResult> {
    const jiraConfig = this.getJiraConfig(config);
    const client = new JiraClient(jiraConfig);

    const issue = await client.getIssue(ticketKey);

    const statusName = issue.fields?.status?.name ?? 'Unknown';

    return {
      ticketKey: issue.key,
      status: statusName,
      url: `${jiraConfig.baseUrl}/browse/${issue.key}`
    };
  }

  /**
   * Check if ticket is completed
   */
  async isTicketCompleted(
    config: ProjectManagementIntegrationConfig,
    ticketKey: string,
    completedStatus: string
  ): Promise<boolean> {
    const statusResult = await this.getTicketStatus(config, ticketKey);
    return statusResult.status.toLowerCase() === completedStatus.toLowerCase();
  }

   /**
   * Get the URL for a JIRA ticket
   */
  async getTicketUrl(
    config: ProjectManagementIntegrationConfig,
    ticketKey: string
  ): Promise<string> {
    const jiraConfig = this.getJiraConfig(config);
    return `${jiraConfig.baseUrl}/browse/${ticketKey}`;
  }

  /**
   * Get available JIRA projects
   */
  async getProjects(
    config: ProjectManagementIntegrationConfig
  ): Promise<Array<{ key: string; name: string }>> {
    const jiraConfig = this.getJiraConfig(config);
    const client = new JiraClient(jiraConfig);

    const projects = await client.getProjects();
    return projects.map((p) => ({ key: p.key, name: p.name }));
  }

  // ============================================================================
  // METADATA API METHODS WITH RESULT OBJECT PATTERN
  // ============================================================================

  /**
   * Get error message based on HTTP status code
   * Centralized error messages for consistent user feedback
   */
  private getMetadataErrorMessage(status: number, operation: string): string {
    const messages: Record<number, string> = {
      401: 'Invalid Jira credentials. Please check your API token and base URL.',
      403: 'Insufficient Jira permissions. Ensure your user has the required access.',
      404: 'Jira resource not found',
      408: 'Request to Jira API timed out. Please try again.',
      429: 'Jira API rate limit exceeded. Please wait and try again.',
      500: 'Jira server error. Please try again later.',
      503: 'Jira service is temporarily unavailable. Please try again later.'
    };
    
    return messages[status] || `Failed to ${operation}`;
  }

  /**
   * Get projects with result object pattern
   * Returns success/failure without throwing exceptions
   */
  async getProjectsWithResult(
    config: ProjectManagementIntegrationConfig
  ): Promise<JiraMetadataResult<Array<{ key: string; name: string }>>> {
    try {
      const data = await this.getProjects(config);
      return {
        success: true,
        data
      };
    } catch (error: any) {
      const status = error.status || 500;
      return {
        success: false,
        message: this.getMetadataErrorMessage(status, 'fetch projects'),
        statusCode: status
      };
    }
  }
}

