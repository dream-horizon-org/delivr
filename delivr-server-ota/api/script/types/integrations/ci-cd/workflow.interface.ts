import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';

export type Platform = string; // platform-agnostic

export enum WorkflowType {
  PRE_REGRESSION_BUILD = 'PRE_REGRESSION_BUILD',
  REGRESSION_BUILD = 'REGRESSION_BUILD',
  TEST_FLIGHT_BUILD = 'TEST_FLIGHT_BUILD',
  AAB_BUILD = 'AAB_BUILD',
  AUTOMATION_BUILD = 'AUTOMATION_BUILD',
  CUSTOM = 'CUSTOM',
}

/**
 * Workflow parameter definition from CI/CD provider.
 * Stored as JSON array in database after fetching from provider's workflow file.
 *
 * Provider-specific field mappings:
 * - GitHub Actions: uses `options` for choice type
 * - Jenkins: uses `choices` for choice type (mapped to `options` for consistency)
 * - CircleCI: uses `enum` for choice type (will be mapped to `options`)
 * - GitLab: uses `options` for choice type
 *
 * Trigger format differences:
 * - GitHub Actions: JSON body { inputs: Record<string, unknown> } - values preserve types
 * - Jenkins: Form URL encoded - all values converted to strings
 * - CircleCI: JSON body { parameters: Record<string, unknown> } - values preserve types
 * - GitLab: JSON body { variables: Array<{key, value}> } - values as strings
 */
export type WorkflowParameter = {
  name: string;
  type: string;
  description?: string;
  defaultValue?: unknown;
  options?: string[];   // GitHub Actions, GitLab, CircleCI (normalized)
  choices?: string[];   // Jenkins (legacy support, prefer `options`)
  required?: boolean;
};

export type WorkflowParameters = WorkflowParameter[] | null;

export interface AppCICDWorkflow {
  id: string;
  appId: string;
  providerType: CICDProviderType;
  integrationId: string;
  displayName: string;
  workflowUrl: string;
  providerIdentifiers?: Record<string, unknown> | null;
  platform: Platform;
  workflowType: WorkflowType;
  parameters?: WorkflowParameters;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @deprecated Use AppCICDWorkflow instead
 * Kept for backward compatibility
 */
export type TenantCICDWorkflow = AppCICDWorkflow;

export interface CreateWorkflowDto {
  id?: string;
  appId: string;
  providerType: CICDProviderType;
  integrationId: string;
  displayName: string;
  workflowUrl: string;
  providerIdentifiers?: Record<string, unknown> | null;
  platform: Platform;
  workflowType: WorkflowType;
  parameters?: WorkflowParameters;
  createdByAccountId: string;
}

export interface UpdateWorkflowDto {
  displayName?: string;
  workflowUrl?: string;
  providerIdentifiers?: Record<string, unknown> | null;
  platform?: Platform;
  workflowType?: WorkflowType;
  parameters?: WorkflowParameters;
}

export interface WorkflowFilters {
  appId?: string;
  providerType?: CICDProviderType;
  integrationId?: string;
  platform?: Platform;
  workflowType?: WorkflowType;
}


