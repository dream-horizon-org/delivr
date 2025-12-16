export const SCM_ERROR_MESSAGES = {
  /** No active SCM integration for the provided tenantId */
  ACTIVE_INTEGRATION_NOT_FOUND: 'Active SCM integration not found for tenant',

  /** Missing owner/repo details to perform repository operations */
  MISSING_REPOSITORY_CONFIGURATION: 'SCM repository configuration missing (owner/repo)',

  /** Missing access token to authenticate with provider */
  MISSING_ACCESS_TOKEN: 'SCM access token is missing or invalid',

  /** Missing inputs to generate final tag name */
  MISSING_FINAL_TAG_INPUTS: 'targets and version are required to generate final tag name',

  /** Invalid branch or tag name according to Git naming rules */
  INVALID_BRANCH_TAG_NAME: 'Invalid branch or tag name'
} as const;
