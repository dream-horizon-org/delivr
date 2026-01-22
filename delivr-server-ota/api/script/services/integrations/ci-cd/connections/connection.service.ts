import type { CICDIntegrationRepository } from '~models/integrations/ci-cd';
import { getStorage } from '../../../../storage/storage-instance';
import type { SafeCICDIntegration, UpdateCICDIntegrationDto, TenantCICDIntegration } from '~types/integrations/ci-cd/connection.interface';

export abstract class ConnectionService<TCreateInput> {
  private readonly repositoryInstance?: CICDIntegrationRepository;

  constructor(repository?: CICDIntegrationRepository) {
    this.repositoryInstance = repository;
  }

  protected get repository(): CICDIntegrationRepository {
    if (this.repositoryInstance) {
      return this.repositoryInstance;
    }
    const storage = getStorage();
    return (storage as any).cicdIntegrationRepository as CICDIntegrationRepository;
  }

  protected toSafe = (integration: TenantCICDIntegration): SafeCICDIntegration => {
    const { apiToken, headerValue, ...rest } = integration;
    return { ...rest };
  };

  abstract create(tenantId: string, accountId: string, input: TCreateInput): Promise<SafeCICDIntegration>;
  abstract get(tenantId: string): Promise<SafeCICDIntegration | null>;
  abstract update(tenantId: string, updateData: UpdateCICDIntegrationDto): Promise<SafeCICDIntegration>;
  abstract delete(tenantId: string): Promise<void>;
  abstract verifyConnection(params: unknown): Promise<{ isValid: boolean; message: string }>;
}


