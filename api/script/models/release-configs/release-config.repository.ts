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
      tenantId: data.tenantId,
      name: data.name,
      description: data.description ?? null,
      releaseType: data.releaseType,
      platformTargets: data.platformTargets,
      baseBranch: data.baseBranch ?? null,
      ciConfigId: data.ciConfigId ?? null,
      testManagementConfigId: data.testManagementConfigId ?? null,
      projectManagementConfigId: data.projectManagementConfigId ?? null,
      commsConfigId: data.commsConfigId ?? null,
      scheduling: data.scheduling ?? null,
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

  findByTenantId = async (tenantId: string): Promise<ReleaseConfiguration[]> => {
    const configs = await this.model.findAll({
      where: { tenantId, isActive: true },
      order: [['createdAt', 'DESC']]
    });

    return configs.map((config) => this.toPlainObject(config));
  };

  findByTenantIdAndName = async (
    tenantId: string,
    name: string
  ): Promise<ReleaseConfiguration | null> => {
    const config = await this.model.findOne({
      where: { tenantId, name, isActive: true }
    });

    if (!config) {
      return null;
    }

    return this.toPlainObject(config);
  };

  findDefaultByTenantId = async (
    tenantId: string
  ): Promise<ReleaseConfiguration | null> => {
    const config = await this.model.findOne({
      where: { tenantId, isDefault: true, isActive: true }
    });

    if (!config) {
      return null;
    }

    return this.toPlainObject(config);
  };

  update = async (
    id: string,
    data: UpdateReleaseConfigDto
  ): Promise<ReleaseConfiguration | null> => {
    const config = await this.model.findByPk(id);

    if (!config) {
      return null;
    }

    await config.update(data);

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

  unsetDefaultForTenant = async (tenantId: string, excludeId?: string): Promise<void> => {
    const where: any = {
      tenantId,
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
}

