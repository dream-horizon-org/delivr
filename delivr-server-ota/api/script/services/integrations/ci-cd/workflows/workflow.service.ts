import type { CICDIntegrationRepository, CICDWorkflowRepository } from '~models/integrations/ci-cd';
import { getStorage } from '../../../../storage/storage-instance';

export abstract class WorkflowService {
  private readonly integrationRepositoryInstance?: CICDIntegrationRepository;
  private readonly workflowRepositoryInstance?: CICDWorkflowRepository;

  constructor(
    integrationRepository?: CICDIntegrationRepository,
    workflowRepository?: CICDWorkflowRepository
  ) {
    this.integrationRepositoryInstance = integrationRepository;
    this.workflowRepositoryInstance = workflowRepository;
  }

  protected get integrationRepository(): CICDIntegrationRepository {
    if (this.integrationRepositoryInstance) {
      return this.integrationRepositoryInstance;
    }
    const storage = getStorage();
    return (storage as any).cicdIntegrationRepository as CICDIntegrationRepository;
  }

  protected get workflowRepository(): CICDWorkflowRepository {
    if (this.workflowRepositoryInstance) {
      return this.workflowRepositoryInstance;
    }
    const storage = getStorage();
    return (storage as any).cicdWorkflowRepository as CICDWorkflowRepository;
  }

  /**
   * Trigger a workflow.
   * Must be implemented by concrete workflow service classes.
   */
  abstract trigger(tenantId: string, input: {
    workflowId?: string;
    workflowType?: string;
    platform?: string;
    jobParameters?: Record<string, unknown>;
  }): Promise<{ queueLocation: string }>;
}


