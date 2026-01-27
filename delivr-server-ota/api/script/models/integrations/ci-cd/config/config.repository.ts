import type { AppCICDConfig, TenantCICDConfig } from '~types/integrations/ci-cd/config.interface';
import type { CICDConfigModelType } from './config.sequelize.model';

export class CICDConfigRepository {
  private model: CICDConfigModelType;

  constructor(model: CICDConfigModelType) {
    this.model = model;
  }

  private toPlainObject = (
    instance: InstanceType<CICDConfigModelType>
  ): AppCICDConfig => {
    return instance.toJSON() as AppCICDConfig;
  };

  create = async (data: Omit<AppCICDConfig, 'createdAt' | 'updatedAt'>): Promise<AppCICDConfig> => {
    const record = await this.model.create({
      ...data
    });
    return this.toPlainObject(record);
  };

  findById = async (id: string): Promise<AppCICDConfig | null> => {
    const record = await this.model.findByPk(id);
    return record ? this.toPlainObject(record) : null;
    };

  findByApp = async (appId: string): Promise<AppCICDConfig[]> => {
    const records = await this.model.findAll({
      where: { appId },
      order: [['createdAt', 'DESC']]
    });
    return records.map(r => this.toPlainObject(r));
  };

  /**
   * @deprecated Use findByApp instead
   * Kept for backward compatibility
   */
  findByTenant = this.findByApp;

  update = async (
    id: string,
    data: Partial<Pick<AppCICDConfig, 'workflowIds'>>
  ): Promise<AppCICDConfig | null> => {
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


