import type { CreateWorkflowDto, TenantCICDWorkflow, WorkflowFilters, UpdateWorkflowDto } from '~types/integrations/ci-cd/workflow.interface';
import type { CICDWorkflowModelType } from './workflow.sequelize.model';
import { normalizePlatform } from '../../../../services/integrations/ci-cd/utils/cicd.utils';

export class CICDWorkflowRepository {
  private model: CICDWorkflowModelType;

  constructor(model: CICDWorkflowModelType) {
    this.model = model;
  }

  private toPlainObject = (
    instance: InstanceType<CICDWorkflowModelType>
  ): TenantCICDWorkflow => {
    return instance.toJSON() as TenantCICDWorkflow;
  };

  create = async (data: CreateWorkflowDto): Promise<TenantCICDWorkflow> => {
    const platformValue = normalizePlatform(data.platform) || 'other';
    const record = await this.model.create({
      ...data,
      platform: platformValue
    });
    return this.toPlainObject(record);
  };

  findById = async (id: string): Promise<TenantCICDWorkflow | null> => {
    const record = await this.model.findByPk(id);
    return record ? this.toPlainObject(record) : null;
  };

  findByIds = async (ids: string[]): Promise<TenantCICDWorkflow[]> => {
    const hasNoIds = ids.length === 0;
    if (hasNoIds) {
      return [];
    }
    const { Op } = require('sequelize');
    const records = await this.model.findAll({
      where: { id: { [Op.in]: ids } }
    });
    return records.map(r => this.toPlainObject(r));
  };

  findAll = async (filters: WorkflowFilters = {}): Promise<TenantCICDWorkflow[]> => {
    const where: Record<string, unknown> = {};
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.providerType) where.providerType = filters.providerType;
    if (filters.integrationId) where.integrationId = filters.integrationId;
    if (filters.platform) where.platform = normalizePlatform(filters.platform);
    if (filters.workflowType) where.workflowType = filters.workflowType;

    const records = await this.model.findAll({ where, order: [['createdAt', 'DESC']] });
    return records.map(r => this.toPlainObject(r));
  };

  update = async (id: string, data: UpdateWorkflowDto): Promise<TenantCICDWorkflow | null> => {
    const record = await this.model.findByPk(id);
    if (!record) return null;
    const platformValue = data.platform ? normalizePlatform(data.platform) : undefined;
    await record.update({
      ...data,
      ...(platformValue ? { platform: platformValue } : {})
    });
    return this.toPlainObject(record);
  };

  delete = async (id: string): Promise<boolean> => {
    const deleted = await this.model.destroy({ where: { id } });
    return deleted > 0;
  };
}


