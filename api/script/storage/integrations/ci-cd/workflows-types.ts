import { CICDProviderType } from './ci-cd-types';
export { CICDProviderType };

// Platform must be a generic string (platform-agnostic), never an enum
export type Platform = string;

export enum WorkflowType {
  PRE_REGRESSION_BUILD = 'PRE_REGRESSION_BUILD',
  REGRESSION_BUILD = 'REGRESSION_BUILD',
  TEST_FLIGHT_BUILD = 'TEST_FLIGHT_BUILD',
  AUTOMATION_BUILD = 'AUTOMATION_BUILD',
  CUSTOM = 'CUSTOM',
}

export interface TenantCICDWorkflow {
  id: string;
  tenantId: string;
  providerType: CICDProviderType;
  integrationId: string;

  displayName: string;
  workflowUrl: string;
  providerIdentifiers?: any | null;

  platform: Platform;
  workflowType: WorkflowType;

  parameters?: any | null; // array of parameter definitions

  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowDto {
  tenantId: string;
  providerType: CICDProviderType;
  integrationId: string;
  displayName: string;
  workflowUrl: string;
  providerIdentifiers?: any | null;
  platform: Platform;
  workflowType: WorkflowType;
  parameters?: any | null;
  createdByAccountId: string;
}

export interface UpdateWorkflowDto {
  displayName?: string;
  workflowUrl?: string;
  providerIdentifiers?: any | null;
  platform?: Platform;
  workflowType?: WorkflowType;
  parameters?: any | null;
}

export interface WorkflowFilters {
  tenantId?: string;
  providerType?: CICDProviderType;
  integrationId?: string;
  platform?: Platform;
  workflowType?: WorkflowType;
}

