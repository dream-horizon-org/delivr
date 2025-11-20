import type {
  CreateProjectTestManagementIntegrationDto,
  FindProjectIntegrationsFilter,
  ProjectTestManagementIntegration,
  UpdateProjectTestManagementIntegrationDto
} from '~types/integrations/test-management/project-integration';
import type { ProjectTestManagementIntegrationModelType } from './project-integration.sequelize.model';

export class ProjectTestManagementIntegrationRepository {
  private model: ProjectTestManagementIntegrationModelType;

  constructor(model: ProjectTestManagementIntegrationModelType) {
    this.model = model;
  }

  /**
   * Convert Sequelize model instance to plain object
   * Return type is declared, TypeScript trusts the signature
   */
  private toPlainObject = (instance: InstanceType<ProjectTestManagementIntegrationModelType>): ProjectTestManagementIntegration => {
    const json = instance.toJSON();
    return json;
  };

  // Create new integration
  create = async (
    data: CreateProjectTestManagementIntegrationDto
  ): Promise<ProjectTestManagementIntegration> => {
    const createdByAccountIdValue = data.createdByAccountId ?? null;
    
    const integration = await this.model.create({
      projectId: data.projectId,
      name: data.name,
      providerType: data.providerType,
      config: data.config,
      createdByAccountId: createdByAccountIdValue
    });

    return this.toPlainObject(integration);
  };

  // Find by ID
  findById = async (id: string): Promise<ProjectTestManagementIntegration | null> => {
    const integration = await this.model.findByPk(id);
    
    if (!integration) {
      return null;
    }
    
    return this.toPlainObject(integration);
  };

  // Find all by project
  findByProject = async (
    filter: FindProjectIntegrationsFilter
  ): Promise<ProjectTestManagementIntegration[]> => {
    const where: Record<string, unknown> = {
      projectId: filter.projectId
    };

    if (filter.providerType !== undefined) {
      where.providerType = filter.providerType;
    }

    const integrations = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return integrations.map((integration) => this.toPlainObject(integration));
  };

  // Alias for findByProject (used by service)
  findAll = async (
    filter: FindProjectIntegrationsFilter
  ): Promise<ProjectTestManagementIntegration[]> => {
    return this.findByProject(filter);
  };

  // Update integration
  update = async (
    id: string,
    data: UpdateProjectTestManagementIntegrationDto
  ): Promise<ProjectTestManagementIntegration | null> => {
    const integration = await this.model.findByPk(id);
    
    if (!integration) {
      return null;
    }

    const updateData: Partial<ProjectTestManagementIntegration> = {
      updatedAt: new Date()
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.config !== undefined) {
      // Merge config - start with existing config to ensure required fields
      updateData.config = {
        ...integration.config,
        ...data.config
      };
    }

    await integration.update(updateData);
    return this.toPlainObject(integration);
  };

  // Delete integration
  delete = async (id: string): Promise<boolean> => {
    const deleted = await this.model.destroy({
      where: { id }
    });
    return deleted > 0;
  };
}

