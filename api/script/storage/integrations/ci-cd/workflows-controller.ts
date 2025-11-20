import { customAlphabet } from 'nanoid';
import { Model, ModelStatic } from 'sequelize';
import {
  TenantCICDWorkflow,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowFilters,
} from './workflows-types';
import { normalizePlatform } from '../../../utils/cicd';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-', 21);

export class CICDWorkflowController {
  private model: ModelStatic<Model<any, any>>;

  constructor(model: ModelStatic<Model<any, any>>) {
    this.model = model;
  }

  async create(data: CreateWorkflowDto): Promise<TenantCICDWorkflow> {
    const normalizedPlatform = normalizePlatform((data as any).platform);
    const workflow = await this.model.create({
      id: nanoid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
      platform: normalizedPlatform || 'other',
    });
    return workflow.toJSON() as TenantCICDWorkflow;
  }

  async findById(id: string): Promise<TenantCICDWorkflow | null> {
    const wf = await this.model.findByPk(id);
    return wf ? (wf.toJSON() as TenantCICDWorkflow) : null;
    }

  async findAll(filters: WorkflowFilters = {}): Promise<TenantCICDWorkflow[]> {
    const where: any = {};
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.providerType) where.providerType = filters.providerType;
    if (filters.integrationId) where.integrationId = filters.integrationId;
    if (filters.platform) where.platform = normalizePlatform(filters.platform);
    if (filters.workflowType) where.workflowType = filters.workflowType;

    const results = await this.model.findAll({ where, order: [['createdAt', 'DESC']] });
    return results.map(r => r.toJSON() as TenantCICDWorkflow);
  }

  async update(id: string, data: UpdateWorkflowDto): Promise<TenantCICDWorkflow | null> {
    const wf = await this.model.findByPk(id);
    if (!wf) return null;
    const normalizedPlatform = normalizePlatform((data as any).platform);
    await wf.update({
      ...data,
      ...(normalizedPlatform ? { platform: normalizedPlatform } : {}),
    });
    return wf.toJSON() as TenantCICDWorkflow;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.destroy({ where: { id } });
    return result > 0;
  }
}


