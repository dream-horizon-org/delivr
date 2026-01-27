import type {
  CreateAppTestManagementIntegrationDto,
  FindAppIntegrationsFilter,
  AppTestManagementIntegration,
  UpdateAppTestManagementIntegrationDto
} from '~types/integrations/test-management/tenant-integration';
import { decryptConfigFields, decryptFields, encryptConfigFields } from '~utils/encryption';
import type { TenantTestManagementIntegrationModelType } from './tenant-integration.sequelize.model';

export class TenantTestManagementIntegrationRepository {
  private model: TenantTestManagementIntegrationModelType;

  constructor(model: TenantTestManagementIntegrationModelType) {
    this.model = model;
  }

  /**
   * Convert Sequelize model instance to plain object
   * Automatically decrypts sensitive fields (authToken) from backend storage
   * Adds _encrypted flag to indicate sensitive fields are encrypted
   */
  private toPlainObject = (instance: InstanceType<TenantTestManagementIntegrationModelType>): AppTestManagementIntegration => {
    const json = instance.toJSON();
    
    // Decrypt sensitive fields before returning (from backend storage)
    if (json.config) {
      json.config = decryptConfigFields(json.config, ['authToken', 'apiToken']);
      
      // Add _encrypted flag to indicate that sensitive fields are encrypted
      // This matches the frontend expectation and indicates the config contains encrypted values
      json.config._encrypted = true;
    }
    
    return json;
  };

  /**
   * Create new integration
   * Double-layer encryption: Decrypt frontend-encrypted values, then encrypt with backend storage key
   */
  create = async (
    data: CreateAppTestManagementIntegrationDto
  ): Promise<AppTestManagementIntegration> => {
    const createdByAccountIdValue = data.createdByAccountId ?? null;
    
    // Step 1: Decrypt any frontend-encrypted values (using ENCRYPTION_KEY)
    const { decrypted: decryptedConfig } = decryptFields(data.config, ['authToken', 'apiToken']);
    
    // Step 2: Encrypt with backend storage encryption (using BACKEND_STORAGE_ENCRYPTION_KEY)
    const encryptedConfig = encryptConfigFields(decryptedConfig, ['authToken', 'apiToken']);
    
    const integration = await this.model.create({
      appId: data.appId,
      name: data.name,
      providerType: data.providerType,
      config: encryptedConfig,
      createdByAccountId: createdByAccountIdValue
    });

    return this.toPlainObject(integration);
  };

  // Find by ID
  findById = async (id: string): Promise<AppTestManagementIntegration | null> => {
    const integration = await this.model.findByPk(id);
    
    if (!integration) {
      return null;
    }
    
    return this.toPlainObject(integration);
  };

  // Find all by app
  findByApp = async (
    filter: FindAppIntegrationsFilter
  ): Promise<AppTestManagementIntegration[]> => {
    const where: Record<string, unknown> = {
      appId: filter.appId
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

  /**
   * @deprecated Use findByApp instead
   * Kept for backward compatibility
   */
  findByTenant = this.findByApp;

  // Alias for findByApp (used by service)
  findAll = async (
    filter: FindAppIntegrationsFilter
  ): Promise<AppTestManagementIntegration[]> => {
    return this.findByApp(filter);
  };

  // Update integration
  update = async (
    id: string,
    data: UpdateAppTestManagementIntegrationDto
  ): Promise<AppTestManagementIntegration | null> => {
    const integration = await this.model.findByPk(id);
    
    if (!integration) {
      return null;
    }

    const updateData: Partial<AppTestManagementIntegration> = {
      updatedAt: new Date()
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.config !== undefined) {
      // Get raw encrypted config from database (before decryption)
      const rawConfig = integration.get('config') as Record<string, any> | undefined;
      
      // Check which sensitive fields are in the update
      const sensitiveFields = ['authToken', 'apiToken'];
      const fieldsInUpdate = sensitiveFields.filter(field => data.config && field in data.config);
      
      // Start with existing encrypted config (preserves encrypted values for fields not in update)
      const finalConfig = rawConfig ? { ...rawConfig } : {};
      
      // Merge non-sensitive fields from update
      Object.keys(data.config).forEach(key => {
        if (!sensitiveFields.includes(key)) {
          finalConfig[key] = data.config[key];
        }
      });
      
      // For sensitive fields in the update: decrypt frontend-encrypted values, then encrypt with backend storage
      if (fieldsInUpdate.length > 0) {
        const updateSensitiveFields: Record<string, string> = {};
        fieldsInUpdate.forEach(field => {
          if (data.config && data.config[field]) {
            const fieldValue = data.config[field];
            if (typeof fieldValue === 'string') {
              updateSensitiveFields[field] = fieldValue;
            }
          }
        });
        
        // Step 1: Decrypt any frontend-encrypted values (using ENCRYPTION_KEY)
        const { decrypted: decryptedFields } = decryptFields(updateSensitiveFields, fieldsInUpdate);
        
        // Step 2: Encrypt with backend storage encryption (using BACKEND_STORAGE_ENCRYPTION_KEY)
        const encryptedFields = encryptConfigFields(decryptedFields, fieldsInUpdate);
        
        // Merge encrypted sensitive fields into final config
        fieldsInUpdate.forEach(field => {
          if (encryptedFields[field]) {
            finalConfig[field] = encryptedFields[field];
          }
        });
      }
      
      // Fields not in update: preserve original encrypted values from database
      // (already in finalConfig from rawConfig copy above)
      
      updateData.config = finalConfig as any; // Type assertion: config structure is valid, encrypted fields preserved
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

