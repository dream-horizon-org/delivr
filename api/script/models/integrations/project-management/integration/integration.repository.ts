import type {
  CreateProjectManagementIntegrationDto,
  ProjectManagementIntegration,
  UpdateProjectManagementIntegrationDto
} from '~types/integrations/project-management';
import { VerificationStatus } from '~types/integrations/project-management';
import type { ProjectManagementIntegrationModelType } from './integration.sequelize.model';
import { encryptConfigFields, decryptConfigFields } from '~utils/encryption';

export type FindProjectManagementIntegrationsFilter = {
  tenantId: string;
  providerType?: string;
  isEnabled?: boolean;
};

export class ProjectManagementIntegrationRepository {
  private model: ProjectManagementIntegrationModelType;

  constructor(model: ProjectManagementIntegrationModelType) {
    this.model = model;
  }

  /**
   * Convert Sequelize model instance to plain object
   * Automatically decrypts sensitive fields (apiToken)
   */
  private toPlainObject = (
    instance: InstanceType<ProjectManagementIntegrationModelType>
  ): ProjectManagementIntegration => {
    const json = instance.toJSON();
    
    // Decrypt sensitive fields before returning
    if (json.config) {
      json.config = decryptConfigFields(json.config, ['apiToken']);
    }
    
    return json;
  };

  /**
   * Create new integration
   * Automatically encrypts sensitive fields (apiToken) before storing
   */
  create = async (
    data: CreateProjectManagementIntegrationDto
  ): Promise<ProjectManagementIntegration> => {
    // Encrypt sensitive fields before storing
    const encryptedConfig = encryptConfigFields(data.config, ['apiToken']);
    
    const integration = await this.model.create({
      id: this.generateId(),
      tenantId: data.tenantId,
      name: data.name,
      providerType: data.providerType,
      config: encryptedConfig,
      isEnabled: true,
      verificationStatus: VerificationStatus.NOT_VERIFIED,
      lastVerifiedAt: null,
      createdByAccountId: data.createdByAccountId ?? 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return this.toPlainObject(integration);
  };

  /**
   * Find by ID
   */
  findById = async (id: string): Promise<ProjectManagementIntegration | null> => {
    const integration = await this.model.findByPk(id);

    if (!integration) {
      return null;
    }

    return this.toPlainObject(integration);
  };

  /**
   * Find all by filters
   */
  findAll = async (
    filter: FindProjectManagementIntegrationsFilter
  ): Promise<ProjectManagementIntegration[]> => {
    const where: Record<string, unknown> = {
      tenantId: filter.tenantId
    };

    if (filter.providerType !== undefined) {
      where.providerType = filter.providerType;
    }

    if (filter.isEnabled !== undefined) {
      where.isEnabled = filter.isEnabled;
    }

    const integrations = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return integrations.map((integration) => this.toPlainObject(integration));
  };

  /**
   * Update integration
   * Automatically encrypts sensitive fields (apiToken) before storing
   */
  update = async (
    id: string,
    data: UpdateProjectManagementIntegrationDto
  ): Promise<ProjectManagementIntegration | null> => {
    const integration = await this.model.findByPk(id);

    if (!integration) {
      return null;
    }

    const updateData: Partial<ProjectManagementIntegration> = {
      updatedAt: new Date()
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.config !== undefined) {
      // Merge configs (existing + updates)
      const mergedConfig = {
        ...integration.config,
        ...data.config
      };
      
      // Encrypt sensitive fields before storing
      updateData.config = encryptConfigFields(mergedConfig, ['apiToken']);
    }

    if (data.isEnabled !== undefined) {
      updateData.isEnabled = data.isEnabled;
    }

    await integration.update(updateData);
    return this.toPlainObject(integration);
  };

  /**
   * Update verification status
   */
  updateVerificationStatus = async (
    id: string,
    status: VerificationStatus
  ): Promise<ProjectManagementIntegration | null> => {
    const integration = await this.model.findByPk(id);

    if (!integration) {
      return null;
    }

    await integration.update({
      verificationStatus: status,
      lastVerifiedAt: new Date(),
      updatedAt: new Date()
    });

    return this.toPlainObject(integration);
  };

  /**
   * Delete integration
   */
  delete = async (id: string): Promise<boolean> => {
    const deleted = await this.model.destroy({
      where: { id }
    });
    return deleted > 0;
  };

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `pm_int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

