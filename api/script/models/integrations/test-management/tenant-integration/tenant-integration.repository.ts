import type {
  CreateTenantTestManagementIntegrationDto,
  FindTenantIntegrationsFilter,
  TenantTestManagementIntegration,
  UpdateTenantTestManagementIntegrationDto
} from '~types/integrations/test-management/tenant-integration';
import type { TenantTestManagementIntegrationModelType } from './tenant-integration.sequelize.model';

export class TenantTestManagementIntegrationRepository {
  private model: TenantTestManagementIntegrationModelType;

  constructor(model: TenantTestManagementIntegrationModelType) {
    this.model = model;
  }

  /**
   * Convert Sequelize model instance to plain object
   * Return type is declared, TypeScript trusts the signature
   */
  private toPlainObject = (instance: InstanceType<TenantTestManagementIntegrationModelType>): TenantTestManagementIntegration => {
    const json = instance.toJSON();
    return json;
  };

  // Create new integration
  create = async (
    data: CreateTenantTestManagementIntegrationDto
  ): Promise<TenantTestManagementIntegration> => {
    const createdByAccountIdValue = data.createdByAccountId ?? null;
    
    const integration = await this.model.create({
      tenantId: data.tenantId,
      name: data.name,
      providerType: data.providerType,
      config: data.config,
      createdByAccountId: createdByAccountIdValue
    });

    return this.toPlainObject(integration);
  };

  // Find by ID
  findById = async (id: string): Promise<TenantTestManagementIntegration | null> => {
    const integration = await this.model.findByPk(id);
    
    if (!integration) {
      return null;
    }
    
    return this.toPlainObject(integration);
  };

  // Find all by tenant
  findByTenant = async (
    filter: FindTenantIntegrationsFilter
  ): Promise<TenantTestManagementIntegration[]> => {
    const where: Record<string, unknown> = {
      tenantId: filter.tenantId
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

  // Alias for findByTenant (used by service)
  findAll = async (
    filter: FindTenantIntegrationsFilter
  ): Promise<TenantTestManagementIntegration[]> => {
    return this.findByTenant(filter);
  };

  // Update integration
  update = async (
    id: string,
    data: UpdateTenantTestManagementIntegrationDto
  ): Promise<TenantTestManagementIntegration | null> => {
    const integration = await this.model.findByPk(id);
    
    if (!integration) {
      return null;
    }

    const updateData: Partial<TenantTestManagementIntegration> = {
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

