/**
 * Release Config Repository
 * Data access layer for release configurations
 */

import { Op } from 'sequelize';
import type {
  CreateReleaseConfigDto,
  ReleaseConfiguration,
  UpdateReleaseConfigDto
} from '~types/release-configs/release-config.interface';
import type { ReleaseConfigModelType } from '.';

export class ReleaseConfigRepository {
  constructor(
    private readonly model: ReleaseConfigModelType
  ) {}

  private toPlainObject = (instance: InstanceType<ReleaseConfigModelType>): ReleaseConfiguration => {
    const json = instance.toJSON();
    return json;
  };

  create = async (
    data: CreateReleaseConfigDto & { id: string }
  ): Promise<ReleaseConfiguration> => {
    const config = await this.model.create({
      id: data.id,
      appId: data.appId,
      name: data.name,
      description: data.description ?? null,
      releaseType: data.releaseType,
      platformTargets: data.platformTargets,
      baseBranch: data.baseBranch ?? null,
      ciConfigId: data.ciConfigId ?? null,
      testManagementConfigId: data.testManagementConfigId ?? null,
      projectManagementConfigId: data.projectManagementConfigId ?? null,
      commsConfigId: data.commsConfigId ?? null,
      // NOTE: releaseScheduleId removed - schedule references config via release_schedules.releaseConfigId
      hasManualBuildUpload: data.hasManualBuildUpload ?? false,
      isActive: data.isActive ?? true,
      isDefault: data.isDefault ?? false,
      createdByAccountId: data.createdByAccountId
    });

    return this.toPlainObject(config);
  };

  findById = async (id: string): Promise<ReleaseConfiguration | null> => {
    const config = await this.model.findByPk(id);

    if (!config) {
      return null;
    }

    return this.toPlainObject(config);
  };

  findByAppId = async (appId: string, includeArchived = false): Promise<ReleaseConfiguration[]> => {
    const where: any = { appId };
    
    // Only filter by isActive if not including archived
    if (!includeArchived) {
      where.isActive = true;
    }
    
    const configs = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return configs.map((config) => this.toPlainObject(config));
  };

  /**
   * @deprecated Use findByAppId instead
   * Kept for backward compatibility
   */
  findByTenantId = this.findByAppId;

  findByAppIdAndName = async (
    appId: string,
    name: string
  ): Promise<ReleaseConfiguration | null> => {
    const config = await this.model.findOne({
      where: { appId, name, isActive: true }
    });

    if (!config) {
      return null;
    }

    return this.toPlainObject(config);
  };

  /**
   * @deprecated Use findByAppIdAndName instead
   * Kept for backward compatibility
   */
  findByTenantIdAndName = this.findByAppIdAndName;

  findDefaultByAppId = async (
    appId: string
  ): Promise<ReleaseConfiguration | null> => {
    const config = await this.model.findOne({
      where: { appId, isDefault: true, isActive: true }
    });

    if (!config) {
      return null;
    }

    return this.toPlainObject(config);
  };

  /**
   * @deprecated Use findDefaultByAppId instead
   * Kept for backward compatibility
   */
  findDefaultByTenantId = this.findDefaultByAppId;

  update = async (
    id: string,
    data: UpdateReleaseConfigDto
  ): Promise<ReleaseConfiguration | null> => {
    const config = await this.model.findByPk(id);

    if (!config) {
      return null;
    }

    console.log('[ReleaseConfigRepository.update] Updating config with data:', JSON.stringify(data, null, 2));
    console.log('[ReleaseConfigRepository.update] Before update:', {
      testManagementConfigId: config.getDataValue('testManagementConfigId')
    });

    await config.update(data);

    console.log('[ReleaseConfigRepository.update] After update:', {
      testManagementConfigId: config.getDataValue('testManagementConfigId')
    });

    return this.toPlainObject(config);
  };

  delete = async (id: string): Promise<boolean> => {
    const rowsDeleted = await this.model.destroy({
      where: { id }
    });

    return rowsDeleted > 0;
  };

  softDelete = async (id: string): Promise<boolean> => {
    const rowsUpdated = await this.model.update(
      { isActive: false },
      { where: { id } }
    );

    return rowsUpdated[0] > 0;
  };

  unsetDefaultForApp = async (appId: string, excludeId?: string): Promise<void> => {
    const where: any = {
      appId,
      isDefault: true
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    await this.model.update(
      { isDefault: false },
      { where }
    );
  };

  /**
   * @deprecated Use unsetDefaultForApp instead
   * Kept for backward compatibility
   */
  unsetDefaultForTenant = this.unsetDefaultForApp;
}

