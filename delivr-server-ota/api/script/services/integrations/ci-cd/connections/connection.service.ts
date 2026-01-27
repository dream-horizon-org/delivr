import type { CICDIntegrationRepository } from '~models/integrations/ci-cd';
import { getStorage } from '../../../../storage/storage-instance';
import type { SafeCICDIntegration, UpdateCICDIntegrationDto, AppCICDIntegration } from '~types/integrations/ci-cd/connection.interface';

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

  protected toSafe = (integration: AppCICDIntegration): SafeCICDIntegration => {
    const { apiToken, headerValue, ...rest } = integration;
    return { ...rest };
  };

  abstract create(appId: string, accountId: string, input: TCreateInput): Promise<SafeCICDIntegration>;
  abstract get(appId: string): Promise<SafeCICDIntegration | null>;
  abstract update(appId: string, updateData: UpdateCICDIntegrationDto): Promise<SafeCICDIntegration>;
  abstract delete(appId: string): Promise<void>;
  abstract verifyConnection(params: unknown): Promise<{ isValid: boolean; message: string }>;
}


