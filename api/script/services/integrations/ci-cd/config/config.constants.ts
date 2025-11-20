export const CICD_CONFIG_ERROR_MESSAGES = {
  TENANT_MISMATCH: 'All workflows must have the same tenantId as the config',
  WORKFLOWS_REQUIRED: 'At least one workflow is required to create CI/CD config',
  WORKFLOW_FIELDS_REQUIRED: 'Each workflow must include providerType, integrationId, displayName, workflowUrl, platform, workflowType',
  WORKFLOW_PROVIDER_OR_TYPE_INVALID: 'Invalid providerType or workflowType in workflow'
} as const;



