import type {
  JiraIntegrationConfig,
  JiraIssueResponse,
  JiraProjectResponse,
  JiraCreateIssueRequest,
  JiraStatusResponse,
  JiraCreateMetaResponse
} from './jira.interface';
import { JIRA_API_VERSION, JIRA_ERROR_MESSAGES } from './jira.constants';

/**
 * JIRA API Client
 * Handles all direct communication with JIRA REST API
 */
export class JiraClient {
  constructor(private readonly config: JiraIntegrationConfig) {}

  /**
   * Make authenticated request to JIRA API
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}/rest/api/${JIRA_API_VERSION}${endpoint}`;
    const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`JIRA API Error: ${response.status} - ${errorText}`);
    }

    return (await response.json()) as T;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<void> {
    try {
      await this.makeRequest('/myself', { method: 'GET' });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JIRA_ERROR_MESSAGES.CONNECTION_FAILED;
      throw new Error(errorMessage);
    }
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<JiraProjectResponse[]> {
    try {
      return await this.makeRequest<JiraProjectResponse[]>('/project', { method: 'GET' });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JIRA_ERROR_MESSAGES.GET_PROJECTS_FAILED;
      throw new Error(errorMessage);
    }
  }

  /**
   * Create an issue
   */
  async createIssue(params: JiraCreateIssueRequest): Promise<JiraIssueResponse> {
    try {
      const fields: Record<string, any> = {
        project: { key: params.projectKey },
        summary: params.summary,
        issuetype: { name: params.issueType },
        labels: params.labels ?? []
      };

      // Add description if provided
      if (params.description) {
        fields.description = {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: params.description }]
            }
          ]
        };
      }

      // Add priority if provided
      if (params.priority) {
        fields.priority = { name: params.priority };
      }

      const body = { fields };

      return await this.makeRequest<JiraIssueResponse>('/issue', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JIRA_ERROR_MESSAGES.CREATE_ISSUE_FAILED;
      throw new Error(errorMessage);
    }
  }

  /**
   * Get issue details
   */
  async getIssue(issueKey: string): Promise<JiraIssueResponse> {
    try {
      return await this.makeRequest<JiraIssueResponse>(`/issue/${issueKey}`, { method: 'GET' });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JIRA_ERROR_MESSAGES.GET_ISSUE_FAILED;
      throw new Error(errorMessage);
    }
  }

  /**
   * Get all statuses for a project
   * Returns all issue types and their available statuses in the project's workflow
   */
  async getProjectStatuses(projectKey: string): Promise<JiraStatusResponse[]> {
    try {
      return await this.makeRequest<JiraStatusResponse[]>(`/project/${projectKey}/statuses`, { 
        method: 'GET' 
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JIRA_ERROR_MESSAGES.GET_STATUSES_FAILED;
      throw new Error(errorMessage);
    }
  }

  /**
   * Get all issue types for a project
   * Uses the create meta endpoint which returns issue types available for creation
   */
  async getProjectIssueTypes(projectKey: string): Promise<JiraCreateMetaResponse> {
    try {
      return await this.makeRequest<JiraCreateMetaResponse>(
        `/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`, 
        { method: 'GET' }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JIRA_ERROR_MESSAGES.GET_ISSUE_TYPES_FAILED;
      throw new Error(errorMessage);
    }
  }
}

