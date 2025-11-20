/**
 * Jira Integration Types
 * Aligned with backend API structure at /projects/:projectId/integrations/project-management
 */

export type JiraType = 'CLOUD' | 'SERVER' | 'DATA_CENTER';

export interface JiraIntegrationConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  jiraType: JiraType;
}

export interface JiraIntegration {
  id: string;
  projectId: string;
  name: string;
  providerType: 'jira';
  config: JiraIntegrationConfig;
  createdByAccountId: string;
  createdAt: string;
  updatedAt: string;
}

// API Request Types
export interface CreateJiraIntegrationRequest {
  name: string;
  providerType: 'jira';
  config: JiraIntegrationConfig;
}

export interface UpdateJiraIntegrationRequest {
  name?: string;
  config?: Partial<JiraIntegrationConfig>;
}

export interface VerifyJiraRequest {
  config: JiraIntegrationConfig;
}

// API Response Types
export interface JiraIntegrationResponse {
  success: boolean;
  data?: JiraIntegration;
  error?: string;
  message?: string;
}

export interface JiraVerifyResponse {
  success: boolean;
  verified?: boolean;
  message?: string;
  details?: any;
  error?: string;
}

export interface JiraListResponse {
  success: boolean;
  data?: JiraIntegration[];
  error?: string;
}

// Helper constants
export const JIRA_TYPES: Array<{ value: JiraType; label: string; description: string }> = [
  {
    value: 'CLOUD',
    label: 'Jira Cloud',
    description: 'Atlassian Cloud (*.atlassian.net)',
  },
  {
    value: 'SERVER',
    label: 'Jira Server',
    description: 'Self-hosted Jira Server',
  },
  {
    value: 'DATA_CENTER',
    label: 'Jira Data Center',
    description: 'Enterprise Jira Data Center',
  },
];

