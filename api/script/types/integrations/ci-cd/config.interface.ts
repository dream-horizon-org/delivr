import type { CreateWorkflowDto } from '~types/integrations/ci-cd/workflow.interface';

export interface TenantCICDConfig {
  id: string;
  tenantId: string;
  workflowIds: string[];
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
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
