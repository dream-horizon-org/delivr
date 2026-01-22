/**
 * Project Management Config Repository
 * Data access layer for project management configurations
 */

import type {
  CreateProjectManagementConfigDto,
  ProjectManagementConfig,
  UpdateProjectManagementConfigDto
} from '~types/integrations/project-management';
import type { ProjectManagementConfigModelType } from './configuration.sequelize.model';

export class ProjectManagementConfigRepository {
  constructor(private readonly model: ProjectManagementConfigModelType) {}

  private toPlainObject = (
    instance: InstanceType<ProjectManagementConfigModelType>
  ): ProjectManagementConfig => {
    const json = instance.toJSON();
    return json;
  };

  create = async (data: CreateProjectManagementConfigDto): Promise<ProjectManagementConfig> => {
    try {
      const config = await this.model.create({
        id: this.generateId(),
        tenantId: data.tenantId,
        integrationId: data.integrationId,
        name: data.name,
        description: data.description ?? null,
        platformConfigurations: data.platformConfigurations,
        isActive: true,
        createdByAccountId: data.createdByAccountId ?? 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return this.toPlainObject(config);
    } catch (error: any) {
      // Handle unique constraint violation from database
      if (error.name === 'SequelizeUniqueConstraintError' || error.original?.code === 'ER_DUP_ENTRY') {
        throw new Error(
          `A project management configuration with the name "${data.name}" already exists for this tenant. Please use a different name.`
        );
      }
      throw error;
    }
  };

  findById = async (id: string): Promise<ProjectManagementConfig | null> => {
    const config = await this.model.findByPk(id);

    if (!config) {
      return null;
    }

    return this.toPlainObject(config);
  };

  findByTenantId = async (tenantId: string): Promise<ProjectManagementConfig[]> => {
    const configs = await this.model.findAll({
      where: { tenantId, isActive: true },
      order: [['createdAt', 'DESC']]
    });

    return configs.map((config) => this.toPlainObject(config));
  };

  findByIntegrationId = async (integrationId: string): Promise<ProjectManagementConfig[]> => {
    const configs = await this.model.findAll({
      where: { integrationId, isActive: true },
      order: [['createdAt', 'DESC']]
    });

    return configs.map((config) => this.toPlainObject(config));
  };

  update = async (
    id: string,
    data: UpdateProjectManagementConfigDto
  ): Promise<ProjectManagementConfig | null> => {
    const config = await this.model.findByPk(id);

    if (!config) {
      return null;
    }

    const updateData: Partial<ProjectManagementConfig> = {
      updatedAt: new Date()
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.platformConfigurations !== undefined) {
      updateData.platformConfigurations = data.platformConfigurations;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    try {
      await config.update(updateData);
      return this.toPlainObject(config);
    } catch (error: any) {
      // Handle unique constraint violation from database
      if (error.name === 'SequelizeUniqueConstraintError' || error.original?.code === 'ER_DUP_ENTRY') {
        throw new Error(
          `A project management configuration with the name "${data.name}" already exists for this tenant. Please use a different name.`
        );
      }
      throw error;
    }
  };

  delete = async (id: string): Promise<boolean> => {
    const rowsDeleted = await this.model.destroy({
      where: { id }
    });

    return rowsDeleted > 0;
  };

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `pm_cfg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

