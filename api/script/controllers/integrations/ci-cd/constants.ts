export const ERROR_MESSAGES = {
  MISSING_TOKEN_AND_SCM: 'Missing apiToken and no GitHub SCM integration found',
  INVALID_GITHUB_TOKEN: 'Invalid GitHub token',
  FAILED_VERIFY_GHA: 'Failed to verify GitHub Actions connection',
  FAILED_SAVE_GHA: 'Failed to save GitHub Actions connection',
  FAILED_FETCH_GHA: 'Failed to fetch GitHub Actions connection',
  FAILED_UPDATE_GHA: 'Failed to update GitHub Actions connection',
  FAILED_DELETE_GHA: 'Failed to delete GitHub Actions connection',
  GHA_NOT_FOUND: 'No GitHub Actions connection found',
  GHA_ALREADY_EXISTS: 'GitHub Actions connection already exists',
  GHA_CREATE_REQUIRED: 'apiToken is required',

  // CI/CD Config errors
  CONFIG_CREATE_FAILED: 'Failed to create CI/CD config',
  CONFIG_LIST_FAILED: 'Failed to list CI/CD configs',
  CONFIG_FETCH_FAILED: 'Failed to fetch CI/CD config',
  CONFIG_NOT_FOUND: 'CI/CD config not found',
  CONFIG_UPDATE_FAILED: 'Failed to update CI/CD config',
  CONFIG_DELETE_FAILED: 'Failed to delete CI/CD config',

  JENKINS_WORKFLOW_URL_REQUIRED: 'workflowUrl is required',
  JENKINS_INVALID_WORKFLOW_URL: 'Invalid workflowUrl',
  JENKINS_CONNECTION_NOT_FOUND: 'No Jenkins connection found for this tenant',
  JENKINS_BASIC_REQUIRED: 'Jenkins connection is not configured for BASIC auth with credentials',
  JENKINS_HOST_MISMATCH: 'Provided URL host does not match configured Jenkins host',
  JENKINS_FETCH_PARAMS_FAILED: 'Failed to fetch job parameters',
  JENKINS_VERIFY_REQUIRED: 'hostUrl, username and apiToken are required',
  JENKINS_VERIFY_FAILED: 'Failed to verify Jenkins connection',
  JENKINS_CREATE_REQUIRED: 'hostUrl, username and apiToken are required',
  JENKINS_SAVE_FAILED: 'Failed to save Jenkins connection',
  JENKINS_NOT_FOUND: 'No Jenkins connection found',
  JENKINS_ALREADY_EXISTS: 'Jenkins connection already exists',
  JENKINS_UPDATE_FAILED: 'Failed to update Jenkins connection',
  JENKINS_DELETE_FAILED: 'Failed to delete Jenkins connection',
  JENKINS_NO_QUEUE_URL: 'queueUrl is required',
  JENKINS_INVALID_QUEUE_URL: 'Invalid queueUrl',
  JENKINS_QUEUE_TIMEOUT: 'Queue status timeout, please check your Jenkins credentials and try again',
  JENKINS_QUEUE_FAILED: 'Failed to fetch queue status',
  JENKINS_TRIGGER_NO_LOCATION: 'Jenkins did not return a queue location for the triggered build',
  JENKINS_TRIGGER_FAILED: 'Failed to trigger workflow',

  WORKFLOW_CREATE_REQUIRED: 'providerType, integrationId, displayName, platform, workflowType, workflowUrl are required',
  WORKFLOW_INTEGRATION_INVALID: 'Invalid integrationId for tenant/provider',
  WORKFLOW_CREATE_FAILED: 'Failed to create workflow',
  WORKFLOW_LIST_FAILED: 'Failed to list workflows',
  WORKFLOW_FETCH_FAILED: 'Failed to fetch workflow',
  WORKFLOW_NOT_FOUND: 'Workflow not found',
  WORKFLOW_MULTIPLE_FOUND: 'Multiple workflows found; provide workflowId',
  WORKFLOW_SELECTION_REQUIRED: 'Provide workflowId or both workflowType and platform',
  WORKFLOW_UPDATE_FAILED: 'Failed to update workflow',
  WORKFLOW_DELETE_FAILED: 'Failed to delete workflow',
  WORKFLOW_MIN_PARAMS_REQUIRED: 'workflowUrl is required',

  GHA_NO_TOKEN_AVAILABLE: 'No GitHub token available',
  GHA_INVALID_RUN_URL: 'Invalid runUrl',
  GHA_RUN_IDENTIFIERS_REQUIRED: 'Provide runUrl or owner/repo/runId',
  GHA_FETCH_RUN_FAILED: 'Failed to fetch run',
  GHA_FETCH_INPUTS_FAILED: 'Failed to fetch workflow inputs',
  GHA_INVALID_WORKFLOW_URL: 'Invalid workflowUrl',
  GHA_REPOSITORY_URL_REQUIRED: 'repositoryUrl is required',
  GHA_INVALID_REPOSITORY_URL: 'Invalid repositoryUrl',
  GHA_REPO_ACCESS_FAILED: 'Failed to access repository with provided token',
  GHA_ACTIONS_ACCESS_FAILED: 'Failed to access GitHub Actions for repository',

  INTEGRATION_NOT_FOUND: 'CI/CD integration not found',
  OPERATION_NOT_SUPPORTED: 'Operation not supported for this CI/CD provider'
} as const;

export const SUCCESS_MESSAGES = {
  VERIFIED: 'Connection verified successfully',
  JENKINS_CREATED: 'Jenkins connection created',
  JENKINS_UPDATED: 'Jenkins connection updated',
  JENKINS_DELETED: 'Jenkins connection deleted',
  WORKFLOW_DELETED: 'Workflow deleted'
} as const;

export const PROVIDER_DEFAULTS = {
  GITHUB_API: 'https://api.github.com',
  JENKINS_CRUMB_PATH: '/crumbIssuer/api/json'
} as const;

export const PLATFORM = {
  OTHER: 'other'
} as const;

export const HEADERS = {
  ACCEPT_JSON: 'application/json',
  ACCEPT_GITHUB_JSON: 'application/vnd.github+json',
  USER_AGENT: 'Delivr-App',
  JENKINS_CRUMB_HEADER_FALLBACK: 'Jenkins-Crumb'
} as const;


