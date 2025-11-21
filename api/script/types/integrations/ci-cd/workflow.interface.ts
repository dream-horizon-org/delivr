import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';

export type Platform = string; // platform-agnostic

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
  providerIdentifiers?: Record<string, unknown> | null;
  platform: Platform;
  workflowType: WorkflowType;
  parameters?: Record<string, unknown> | null;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowDto {
  id: string;
  tenantId: string;
  providerType: CICDProviderType;
  integrationId: string;
  displayName: string;
  workflowUrl: string;
  providerIdentifiers?: Record<string, unknown> | null;
  platform: Platform;
  workflowType: WorkflowType;
  parameters?: Record<string, unknown> | null;
  createdByAccountId: string;
}

export interface UpdateWorkflowDto {
  displayName?: string;
  workflowUrl?: string;
  providerIdentifiers?: Record<string, unknown> | null;
  platform?: Platform;
  workflowType?: WorkflowType;
  parameters?: Record<string, unknown> | null;
}

export interface WorkflowFilters {
  tenantId?: string;
  providerType?: CICDProviderType;
  integrationId?: string;
  platform?: Platform;
  workflowType?: WorkflowType;
}


