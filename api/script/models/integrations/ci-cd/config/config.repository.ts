import type { TenantCICDConfig } from '~types/integrations/ci-cd/config.interface';
import type { CICDConfigModelType } from './config.sequelize.model';

export class CICDConfigRepository {
  private model: CICDConfigModelType;

  constructor(model: CICDConfigModelType) {
    this.model = model;
  }

  private toPlainObject = (
    instance: InstanceType<CICDConfigModelType>
  ): TenantCICDConfig => {
    return instance.toJSON() as TenantCICDConfig;
  };

  create = async (data: Omit<TenantCICDConfig, 'createdAt' | 'updatedAt'>): Promise<TenantCICDConfig> => {
    const record = await this.model.create({
      ...data
    });
    return this.toPlainObject(record);
  };

  findById = async (id: string): Promise<TenantCICDConfig | null> => {
    const record = await this.model.findByPk(id);
    return record ? this.toPlainObject(record) : null;
    };

  findByTenant = async (tenantId: string): Promise<TenantCICDConfig[]> => {
    const records = await this.model.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']]
    });
    return records.map(r => this.toPlainObject(r));
  };

  update = async (
    id: string,
    data: Partial<Pick<TenantCICDConfig, 'workflowIds'>>
  ): Promise<TenantCICDConfig | null> => {
    const record = await this.model.findByPk(id);
    if (!record) {
      return null;
    }
    if (data.workflowIds) {
      record.set('workflowIds', data.workflowIds);
    }
    await record.save();
    return this.toPlainObject(record);
  };

  delete = async (id: string): Promise<void> => {
    await this.model.destroy({ where: { id } });
  };
}


