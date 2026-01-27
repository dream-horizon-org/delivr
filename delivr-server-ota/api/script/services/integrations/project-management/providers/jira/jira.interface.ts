import type { ProjectManagementIntegrationConfig } from '~types/integrations/project-management';

/**
 * JIRA-specific configuration
 */
export type JiraIntegrationConfig = ProjectManagementIntegrationConfig & {
  apiToken: string;
  email: string;
  jiraType: 'CLOUD' | 'SERVER' | 'DATA_CENTER';
};

/**
 * JIRA API response types
 */
export type JiraIssueResponse = {
  id: string;
  key: string;
  self: string;
  fields?: {
    status?: {
      name: string;
    };
    summary?: string;
  };
};

export type JiraProjectResponse = {
  id: string;
  key: string;
  name: string;
  self: string;
};

export type JiraCreateIssueRequest = {
  projectKey: string;
  summary: string;
  description?: string;
  issueType: string;
  priority?: string;
  labels?: string[];
  assignee?: string;
};

export type JiraStatus = {
  id: string;
  name: string;
  statusCategory: {
    id: number;
    key: string;
    name: string;
  };
};

export type JiraStatusResponse = {
  id: string;
  name: string;
  statuses: JiraStatus[];
};
