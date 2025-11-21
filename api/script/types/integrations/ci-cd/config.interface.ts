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
  workflows: Array<Record<string, any>>; // use CreateWorkflowDto at call site
  createdByAccountId: string;
}

export interface CICDConfigFilters {
  tenantId?: string;
}


