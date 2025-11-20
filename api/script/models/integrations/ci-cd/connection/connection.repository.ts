import { CreateCICDIntegrationDto, CICDIntegrationFilters, TenantCICDIntegration, UpdateCICDIntegrationDto, VerificationStatus } from '~types/integrations/ci-cd/connection.interface';
import type { CICDIntegrationModelType } from './connection.sequelize.model';

export class CICDIntegrationRepository {
  private model: CICDIntegrationModelType;

  constructor(model: CICDIntegrationModelType) {
    this.model = model;
  }

  private toPlainObject = (
    instance: InstanceType<CICDIntegrationModelType>
  ): TenantCICDIntegration => {
    return instance.toJSON() as TenantCICDIntegration;
  };

  create = async (data: CreateCICDIntegrationDto): Promise<TenantCICDIntegration> => {
    const record = await this.model.create({
      tenantId: data.tenantId,
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
    if (filters.tenantId !== undefined) where.tenantId = filters.tenantId;
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
    await record.update({
      ...data,
      username: data.username ?? record.get('username'),
      apiToken: data.apiToken ?? record.get('apiToken'),
      headerName: data.headerName ?? record.get('headerName'),
      headerValue: data.headerValue ?? record.get('headerValue'),
      providerConfig: data.providerConfig ?? record.get('providerConfig'),
      updatedAt: new Date()
    });
    return this.toPlainObject(record);
  };

  delete = async (id: string): Promise<boolean> => {
    const deleted = await this.model.destroy({ where: { id } });
    return deleted > 0;
  };

  findByTenantAndProvider = async (
    tenantId: string,
    providerType: CreateCICDIntegrationDto['providerType']
  ): Promise<TenantCICDIntegration | null> => {
    const record = await this.model.findOne({
      where: { tenantId, providerType },
      order: [['createdAt', 'DESC']]
    });
    return record ? this.toPlainObject(record) : null;
  };
}


