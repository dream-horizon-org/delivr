import { getStorage } from '../../../../storage/storage-instance';
import type { CICDIntegrationController } from '../../../../storage/integrations/ci-cd/ci-cd-controller';
import type { CICDWorkflowController } from '../../../../storage/integrations/ci-cd/workflows-controller';

export abstract class WorkflowService {
  protected get cicd(): CICDIntegrationController {
    const storage = getStorage();
    return (storage as any).cicdController;
  }

  protected get workflows(): CICDWorkflowController {
    const storage = getStorage();
    return (storage as any).cicdWorkflowController;
  }
}


