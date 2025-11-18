import type {
  FindReleaseConfigTestManagementFilter,
  ReleaseConfigTestManagement,
  SetReleaseConfigTestManagementDto,
  UpdateReleaseConfigTestManagementDto
} from '~types/integrations/test-management/release-config/release-config.interface';
import type { ReleaseConfigTestManagementModelType } from './release-config.sequelize.model';

export class ReleaseConfigTestManagementRepository {
  constructor(
    private readonly model: ReleaseConfigTestManagementModelType
  ) {}

  /**
   * Convert Sequelize model instance to plain object
   * Return type is declared, TypeScript trusts the signature
   */
  private toPlainObject = (instance: InstanceType<ReleaseConfigTestManagementModelType>): ReleaseConfigTestManagement => {
    const json = instance.toJSON();
    return json;
  };

  /**
   * Upsert configuration - Create if doesn't exist, Update if exists
   * Uses releaseConfigId as the unique key
   */
  async upsert(data: SetReleaseConfigTestManagementDto): Promise<ReleaseConfigTestManagement> {
    const existing = await this.findByReleaseConfigId(data.releaseConfigId);

    if (existing) {
      // Update existing
      const updated = await this.update(existing.id, {
        integrationId: data.integrationId,
        passThresholdPercent: data.passThresholdPercent,
        platformConfigurations: data.platformConfigurations
      });
      
      if (updated) {
        return updated;
      }
      
      throw new Error('Failed to update existing configuration');
    }

    // Create new
    const config = await this.model.create({
      releaseConfigId: data.releaseConfigId,
      integrationId: data.integrationId,
      passThresholdPercent: data.passThresholdPercent,
      platformConfigurations: data.platformConfigurations,
      createdByAccountId: data.createdByAccountId ?? null
    });

    return this.toPlainObject(config);
  }

  /**
   * Find configuration by ID
   */
  async findById(id: string): Promise<ReleaseConfigTestManagement | null> {
    const config = await this.model.findByPk(id);
    
    if (!config) {
      return null;
    }
    
    return this.toPlainObject(config);
  }

  /**
   * Find configuration by release config ID
   */
  async findByReleaseConfigId(releaseConfigId: string): Promise<ReleaseConfigTestManagement | null> {
    const config = await this.model.findOne({
      where: {
        releaseConfigId: releaseConfigId
      }
    });
    
    if (!config) {
      return null;
    }
    
    return this.toPlainObject(config);
  }

  /**
   * Find single configuration by filter
   */
  async findOne(filter: FindReleaseConfigTestManagementFilter): Promise<ReleaseConfigTestManagement | null> {
    const where: Partial<ReleaseConfigTestManagement> = {};
    
    if (filter.releaseConfigId !== undefined) {
      where.releaseConfigId = filter.releaseConfigId;
    }
    
    if (filter.integrationId !== undefined) {
      where.integrationId = filter.integrationId;
    }

    const config = await this.model.findOne({ where });
    
    if (!config) {
      return null;
    }
    
    return this.toPlainObject(config);
  }

  /**
   * Find all configurations by filter
   */
  async findAll(filter: FindReleaseConfigTestManagementFilter): Promise<ReleaseConfigTestManagement[]> {
    const where: Partial<ReleaseConfigTestManagement> = {};
    
    if (filter.releaseConfigId !== undefined) {
      where.releaseConfigId = filter.releaseConfigId;
    }
    
    if (filter.integrationId !== undefined) {
      where.integrationId = filter.integrationId;
    }

    const configs = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return configs.map(config => this.toPlainObject(config));
  }

  /**
   * Update configuration
   */
  async update(id: string, data: UpdateReleaseConfigTestManagementDto): Promise<ReleaseConfigTestManagement | null> {
    const updateData: Partial<ReleaseConfigTestManagement> = {};
    
    if (data.integrationId !== undefined) {
      updateData.integrationId = data.integrationId;
    }
    
    if (data.passThresholdPercent !== undefined) {
      updateData.passThresholdPercent = data.passThresholdPercent;
    }
    
    if (data.platformConfigurations !== undefined) {
      updateData.platformConfigurations = data.platformConfigurations;
    }
    
    updateData.updatedAt = new Date();

    const [affectedCount] = await this.model.update(updateData, {
      where: { id }
    });

    if (affectedCount === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Delete configuration by release config ID
   */
  async deleteByReleaseConfigId(releaseConfigId: string): Promise<boolean> {
    const affectedCount = await this.model.destroy({
      where: {
        releaseConfigId: releaseConfigId
      }
    });

    return affectedCount > 0;
  }

  /**
   * Delete configuration by ID
   */
  async delete(id: string): Promise<boolean> {
    const affectedCount = await this.model.destroy({
      where: { id }
    });

    return affectedCount > 0;
  }

  /**
   * Check if a release config has a configuration
   */
  async hasConfig(releaseConfigId: string): Promise<boolean> {
    const config = await this.findByReleaseConfigId(releaseConfigId);
    return config !== null;
  }

  /**
   * Get all release configs using a specific integration
   */
  async findReleaseConfigsByIntegrationId(integrationId: string): Promise<string[]> {
    const configs = await this.findAll({
      integrationId
    });

    return configs.map(config => config.releaseConfigId);
  }
}

