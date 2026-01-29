import type {
  JiraIntegrationConfig,
  JiraIssueResponse,
  JiraProjectResponse,
  JiraCreateIssueRequest
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
      const errorText = await response.text().catch(() => 'Unknown error');
      const status = response.status;

      // Throw error with detailed status information for caller to handle
      const error: any = new Error(`JIRA API Error: ${status} - ${errorText}`);
      error.status = status;
      error.responseText = errorText;
      throw error;
    }

    return (await response.json()) as T;
  }

  /**
   * Test connection
   * Returns detailed error information for different HTTP status codes
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      await this.makeRequest('/myself', { method: 'GET' });
      return {
        success: true,
        message: 'Successfully connected to Jira'
      };
    } catch (error: any) {
      const status = error.status;
      const errorText = error.responseText || error.message;

      // Handle specific HTTP status codes
      if (status === 401) {
        return {
          success: false,
          message: 'Invalid Jira credentials or wrong base URL. Please verify your email, API token, and base URL are correct.',
          details: {
            errorCode: 'invalid_credentials',
            message: 'Check: 1) Email matches your Jira account, 2) API token is valid (generate from Jira → Account Settings → Security → API Tokens), 3) Base URL matches your Jira instance'
          }
        };
      }

      if (status === 403) {
        return {
          success: false,
          message: 'Jira credentials are valid but lack required permissions.',
          details: {
            errorCode: 'insufficient_permissions',
            message: 'Ensure your Jira user has permission to access projects and create issues.'
          }
        };
      }

      if (status === 404) {
        return {
          success: false,
          message: 'Jira instance not found. Please verify the base URL is correct.',
          details: {
            errorCode: 'instance_not_found',
            message: 'For Cloud: https://yourcompany.atlassian.net, For Server: https://jira.yourcompany.com'
          }
        };
      }

      if (status >= 500 && status < 600) {
        return {
          success: false,
          message: `Jira service temporarily unavailable (${status}). Please try again later.`,
          details: {
            errorCode: 'service_unavailable',
            message: "Jira's servers are experiencing issues. This is not a credentials problem - retry in a few minutes."
          }
        };
      }

      // Network/timeout errors (no status code)
      if (!status) {
        return {
          success: false,
          message: 'Cannot connect to Jira. Please check the base URL and network connectivity.',
          details: {
            errorCode: 'network_error',
            message: 'Verify the base URL is correct and accessible from your network.'
          }
        };
      }

      // Other errors
      return {
        success: false,
        message: `Jira API error (${status}): ${errorText}`,
        details: {
          errorCode: 'api_error',
          message: errorText
        }
      };
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
}

