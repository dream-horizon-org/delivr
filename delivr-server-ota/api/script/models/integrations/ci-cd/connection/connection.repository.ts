import { CreateCICDIntegrationDto, CICDIntegrationFilters, TenantCICDIntegration, UpdateCICDIntegrationDto, VerificationStatus } from '~types/integrations/ci-cd/connection.interface';
import type { CICDIntegrationModelType } from './connection.sequelize.model';
import { decryptFromStorage } from '~utils/encryption';

export class CICDIntegrationRepository {
  private model: CICDIntegrationModelType;

  constructor(model: CICDIntegrationModelType) {
    this.model = model;
  }

  private toPlainObject = (
    instance: InstanceType<CICDIntegrationModelType>
  ): TenantCICDIntegration => {
    const json = instance.toJSON() as TenantCICDIntegration;
    
    // Decrypt tokens from backend storage (handles both backend and frontend formats)
    if (json.apiToken) {
      try {
        json.apiToken = decryptFromStorage(json.apiToken);
      } catch (error: any) {
        console.error('[CICD] Failed to decrypt apiToken, keeping encrypted value:', error.message);
        // Keep encrypted value - might be corrupted or in unexpected forma
      }
    }
    if (json.headerValue) {
      try {
        json.headerValue = decryptFromStorage(json.headerValue);
      } catch (error: any) {
        console.error('[CICD] Failed to decrypt headerValue, keeping encrypted value:', error.message);
        // Keep encrypted value - might be corrupted or in unexpected format
      }
    }
    
    return json;
  };

  create = async (data: CreateCICDIntegrationDto & { id: string }): Promise<TenantCICDIntegration> => {
    const record = await this.model.create({
      id: data.id,
      appId: data.appId,
      providerType: data.providerType,
      displayName: data.displayName,
      hostUrl: data.hostUrl,
      authType: data.authType,
      username: data.username ?? null,
      apiToken: data.apiToken ?? null,
      headerName: data.headerName ?? null,
      headerValue: data.headerValue ?? null,
      providerConfig: data.providerConfig ?? null,
      createdByAccountId: data.createdByAccountId,
      verificationStatus: data.verificationStatus ?? VerificationStatus.PENDING,
      lastVerifiedAt: data.lastVerifiedAt ?? null,
      verificationError: data.verificationError ?? null
    });
    return this.toPlainObject(record);
  };

  findById = async (id: string): Promise<TenantCICDIntegration | null> => {
    const record = await this.model.findByPk(id);
    return record ? this.toPlainObject(record) : null;
  };

  findAll = async (filters: CICDIntegrationFilters = {}): Promise<TenantCICDIntegration[]> => {
    const where: Record<string, unknown> = {};
    if (filters.appId !== undefined) where.appId = filters.appId;
    if (filters.providerType !== undefined) where.providerType = filters.providerType;
    if (filters.verificationStatus !== undefined) where.verificationStatus = filters.verificationStatus;
    if (filters.hostUrl !== undefined) where.hostUrl = filters.hostUrl;

    const records = await this.model.findAll({ where, order: [['createdAt', 'DESC']] });
    return records.map(r => this.toPlainObject(r));
  };

  update = async (
    id: string,
    data: UpdateCICDIntegrationDto
  ): Promise<TenantCICDIntegration | null> => {
    const record = await this.model.findByPk(id);
    if (!record) return null;
    // Sequelize handles updatedAt automatically when timestamps: true
    await record.update({
      ...data,
      displayName: data.displayName ?? record.get('displayName'),
      username: data.username ?? record.get('username'),
      apiToken: data.apiToken ?? record.get('apiToken'),
      headerName: data.headerName ?? record.get('headerName'),
      headerValue: data.headerValue ?? record.get('headerValue'),
      providerConfig: data.providerConfig ?? record.get('providerConfig')
    });
    return this.toPlainObject(record);
  };

  delete = async (id: string): Promise<boolean> => {
    const deleted = await this.model.destroy({ where: { id } });
    return deleted > 0;
  };

  findByAppAndProvider = async (
    appId: string,
    providerType: CreateCICDIntegrationDto['providerType']
  ): Promise<TenantCICDIntegration | null> => {
    const record = await this.model.findOne({
      where: { appId, providerType },
      order: [['createdAt', 'DESC']]
    });
    return record ? this.toPlainObject(record) : null;
  };
}


