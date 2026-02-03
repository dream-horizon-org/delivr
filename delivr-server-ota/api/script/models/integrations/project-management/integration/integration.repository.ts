import type {
  CreateProjectManagementIntegrationDto,
  ProjectManagementIntegration,
  UpdateProjectManagementIntegrationDto
} from '~types/integrations/project-management';
import { VerificationStatus } from '~types/integrations/project-management';
import type { ProjectManagementIntegrationModelType } from './integration.sequelize.model';
import { encryptConfigFields, decryptConfigFields, decryptFields } from '~utils/encryption';

export type FindProjectManagementIntegrationsFilter = {
  appId: string;
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
   * Double-layer encryption: Decrypt frontend-encrypted values, then encrypt with backend storage key
   * @param verificationStatus - Optional verification status. If VALID, also sets lastVerifiedAt
   */
  create = async (
    data: CreateProjectManagementIntegrationDto,
    verificationStatus?: VerificationStatus
  ): Promise<ProjectManagementIntegration> => {
    // Step 1: Decrypt any frontend-encrypted values (using ENCRYPTION_KEY)
    const { decrypted: decryptedConfig } = decryptFields(data.config, ['apiToken']);
    
    // Step 2: Encrypt with backend storage encryption (using BACKEND_STORAGE_ENCRYPTION_KEY)
    const encryptedConfig = encryptConfigFields(decryptedConfig, ['apiToken']);
    
    const status = verificationStatus ?? VerificationStatus.NOT_VERIFIED;
    const verifiedAt = status === VerificationStatus.VALID ? new Date() : null;
    
    const integration = await this.model.create({
      id: this.generateId(),
      appId: data.appId,
      name: data.name,
      providerType: data.providerType,
      config: encryptedConfig,
      isEnabled: true,
      verificationStatus: status,
      lastVerifiedAt: verifiedAt,
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
      appId: filter.appId
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
      // Get raw encrypted config from database (before decryption)
      const rawConfig = integration.get('config') as Record<string, any> | undefined;
      
      // Check if apiToken is in the update
      const apiTokenInUpdate = data.config && 'apiToken' in data.config;
      
      // Start with existing encrypted config (preserves encrypted apiToken if not in update)
      const finalConfig = rawConfig ? { ...rawConfig } : {};
      
      // Merge non-sensitive fields from update
      Object.keys(data.config).forEach(key => {
        if (key !== 'apiToken') {
          finalConfig[key] = data.config[key];
        }
      });
      
      // For apiToken in the update: decrypt frontend-encrypted value, then encrypt with backend storage
      if (apiTokenInUpdate && data.config.apiToken) {
        // Step 1: Decrypt any frontend-encrypted value (using ENCRYPTION_KEY)
        const { decrypted: decryptedFields } = decryptFields({ apiToken: data.config.apiToken }, ['apiToken']);
        
        // Step 2: Encrypt with backend storage encryption (using BACKEND_STORAGE_ENCRYPTION_KEY)
        const encryptedFields = encryptConfigFields(decryptedFields, ['apiToken']);
        
        // Set encrypted apiToken in final config
        finalConfig.apiToken = encryptedFields.apiToken;
      }
      // If apiToken not in update: preserve original encrypted value from database
      // (already in finalConfig from rawConfig copy above)
      
      updateData.config = finalConfig as any; // Type assertion: config structure is valid, encrypted apiToken preserved
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

