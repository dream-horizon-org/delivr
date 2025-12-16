export const CICD_CONFIG_ERROR_MESSAGES = {
  TENANT_MISMATCH: 'All workflows must have the same tenantId as the config',
  WORKFLOWS_REQUIRED: 'At least one workflow is required to create CI/CD config',
  WORKFLOW_FIELDS_REQUIRED: 'Each workflow must include providerType, integrationId, displayName, workflowUrl, platform, workflowType',
  WORKFLOW_PROVIDER_OR_TYPE_INVALID: 'Invalid providerType or workflowType in workflow',
  INVALID_PLATFORM: 'Invalid platform value. Must be one of: ANDROID, IOS',
  WORKFLOW_DISPATCH_REQUIRED: 'Workflow must define workflow_dispatch to be triggerable',
  CONFIG_NOT_FOUND: 'CI/CD config not found',
  NO_MATCHING_WORKFLOW: 'No matching workflow found in CI/CD config for the specified platform and workflow type',
  MULTIPLE_WORKFLOWS_FOUND: 'Multiple workflows found for the specified platform and workflow type; cannot determine which to trigger',
  INTEGRATION_NOT_FOUND: 'CI/CD integration not found for the workflow',
  TRIGGER_NOT_SUPPORTED: 'Trigger operation not supported for this CI/CD provider'
} as const;

export const CICD_CONFIG_ALLOWED_PLATFORMS = ['ANDROID', 'IOS'] as const;



