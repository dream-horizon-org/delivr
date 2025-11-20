import { getStorage } from '../../../../storage/storage-instance';
import type { CICDIntegrationController } from '../../../../storage/integrations/ci-cd/ci-cd-controller';
import type { SafeCICDIntegration, UpdateCICDIntegrationDto } from '../../../../storage/integrations/ci-cd/ci-cd-types';

export abstract class ConnectionService<TCreateInput> {
  protected get cicd(): CICDIntegrationController {
    const storage = getStorage();
    return (storage as any).cicdController;
  }

  abstract create(tenantId: string, accountId: string, input: TCreateInput): Promise<SafeCICDIntegration>;
  abstract get(tenantId: string): Promise<SafeCICDIntegration | null>;
  abstract update(tenantId: string, updateData: UpdateCICDIntegrationDto): Promise<SafeCICDIntegration>;
  abstract delete(tenantId: string): Promise<void>;
  abstract verifyConnection(params: unknown): Promise<{ isValid: boolean; message: string }>;
}


