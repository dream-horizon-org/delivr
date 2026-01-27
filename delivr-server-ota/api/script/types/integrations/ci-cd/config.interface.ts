import type { CreateWorkflowDto, AppCICDWorkflow } from '~types/integrations/ci-cd/workflow.interface';

export interface AppCICDConfig {
  id: string;
  appId: string;
  workflowIds: string[];
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AppCICDConfig with hydrated workflows array
 * Used when full workflow details are needed (e.g., for validation)
 */
export interface AppCICDConfigWithWorkflows extends AppCICDConfig {
  workflows: AppCICDWorkflow[];
}

/**
 * @deprecated Use AppCICDConfig instead
 * Kept for backward compatibility
 */
export type TenantCICDConfig = AppCICDConfig;

/**
 * @deprecated Use AppCICDConfigWithWorkflows instead
 * Kept for backward compatibility
 */
export type TenantCICDConfigWithWorkflows = AppCICDConfigWithWorkflows;

export interface CreateCICDConfigDto {
  appId: string;
  workflows: Array<CreateWorkflowDto>;
  createdByAccountId: string;
}

export interface CICDConfigFilters {
  appId?: string;
}

export type FieldError = { field: string; message: string };

export type UpdateCICDConfigDto = {
  appId: string;
  configId: string;
  createdByAccountId: string;
  workflows: Array<CreateWorkflowDto>;
};
