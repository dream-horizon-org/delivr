/**
 * JIRA API Constants
 */

export const JIRA_API_VERSION = '3' as const;

export const JIRA_DEFAULT_ISSUE_TYPE = 'Task' as const;

export const JIRA_TIMEOUTS = {
  VALIDATION: 10000,
  DEFAULT: 30000,
  LONG_RUNNING: 60000
} as const;

export const JIRA_ERROR_MESSAGES = {
  INVALID_CONFIG: 'Invalid JIRA configuration',
  AUTHENTICATION_FAILED: 'JIRA authentication failed',
  CONNECTION_FAILED: 'Failed to connect to JIRA',
  CREATE_ISSUE_FAILED: 'Failed to create JIRA issue',
  GET_ISSUE_FAILED: 'Failed to get JIRA issue',
  GET_PROJECTS_FAILED: 'Failed to get JIRA projects',
  GET_STATUSES_FAILED: 'Failed to get JIRA project statuses',
  GET_ISSUE_TYPES_FAILED: 'Failed to get JIRA project issue types',
  INVALID_PROJECT_KEY: 'Invalid JIRA project key',
  INVALID_ISSUE_KEY: 'Invalid JIRA issue key'
} as const;

