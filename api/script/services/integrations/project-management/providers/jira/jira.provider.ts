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
import type { JiraIntegrationConfig } from './jira.interface';
import { JIRA_DEFAULT_ISSUE_TYPE, JIRA_ERROR_MESSAGES } from './jira.constants';

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
   * Get validated JIRA config
   */
  private getJiraConfig(config: ProjectManagementIntegrationConfig): JiraIntegrationConfig {
    if (!this.isJiraConfig(config)) {
      throw new Error(JIRA_ERROR_MESSAGES.INVALID_CONFIG);
    }
    return config;
  }

  /**
   * Validate JIRA configuration
   */
  async validateConfig(config: ProjectManagementIntegrationConfig): Promise<boolean> {
    try {
      if (!this.isJiraConfig(config)) {
        return false;
      }

      const client = new JiraClient(config);
      await client.testConnection();
      return true;
    } catch (error) {
      console.error('JIRA config validation failed:', error);
      return false;
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
}

