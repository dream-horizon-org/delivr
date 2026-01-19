import type { CreateWorkflowDto, TenantCICDWorkflow } from '~types/integrations/ci-cd/workflow.interface';

export interface TenantCICDConfig {
  id: string;
  tenantId: string;
  workflowIds: string[];
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TenantCICDConfig with hydrated workflows array
 * Used when full workflow details are needed (e.g., for validation)
 */
export interface TenantCICDConfigWithWorkflows extends TenantCICDConfig {
  workflows: TenantCICDWorkflow[];
}

export interface CreateCICDConfigDto {
  tenantId: string;
  workflows: Array<CreateWorkflowDto>;
  createdByAccountId: string;
}

export interface CICDConfigFilters {
  tenantId?: string;
}

export type FieldError = { field: string; message: string };

export type UpdateCICDConfigDto = {
  tenantId: string;
  configId: string;
  createdByAccountId: string;
  workflows: Array<CreateWorkflowDto>;
};
