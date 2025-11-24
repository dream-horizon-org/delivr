import { Model } from 'sequelize';
import { ReleasePlatformTargetMapping, CreateReleasePlatformTargetMappingDto } from './release.interface';
import { PlatformName, TargetName } from '../../storage/release/release-models';

/**
 * Release Platform Target Mapping Repository
 * Data access layer for release_platforms_targets_mapping table
 * 
 * This consolidated table replaces the old releaseToPlatforms and releaseToTargets
 * junction tables, combining platform, target, version, and integration run IDs.
 */
export type ReleasePlatformTargetMappingModelType = typeof Model & {
  new(values?: object, options?: object): Model;
  findAll: any;
  findOne: any;
  create: any;
};

export class ReleasePlatformTargetMappingRepository {
  constructor(private readonly model: ReleasePlatformTargetMappingModelType) {}

  private toPlainObject(instance: any): ReleasePlatformTargetMapping {
    return instance.toJSON() as ReleasePlatformTargetMapping;
  }

  /**
   * Create a new platform-target mapping for a release
   */
  async create(dto: CreateReleasePlatformTargetMappingDto): Promise<ReleasePlatformTargetMapping> {
    const instance = await this.model.create({
      id: dto.id,
      releaseId: dto.releaseId,
      platform: dto.platform,
      target: dto.target,
      version: dto.version,
      projectManagementRunId: dto.projectManagementRunId ?? null,
      testManagementRunId: dto.testManagementRunId ?? null
    });
    return this.toPlainObject(instance);
  }

  /**
   * Get all platform-target mappings for a release
   */
  async getByReleaseId(releaseId: string): Promise<ReleasePlatformTargetMapping[]> {
    const instances = await this.model.findAll({
      where: { releaseId }
    });
    return instances.map((instance: any) => this.toPlainObject(instance));
  }

  /**
   * Get a specific platform-target mapping
   */
  async getByReleasePlatformTarget(
    releaseId: string,
    platform: PlatformName,
    target: TargetName
  ): Promise<ReleasePlatformTargetMapping | null> {
    const instance = await this.model.findOne({
      where: { releaseId, platform, target }
    });
    return instance ? this.toPlainObject(instance) : null;
  }

  /**
   * Update integration run IDs for a platform-target mapping
   */
  async updateIntegrationRunIds(
    releaseId: string,
    platform: PlatformName,
    target: TargetName,
    updates: {
      projectManagementRunId?: string | null;
      testManagementRunId?: string | null;
    }
  ): Promise<ReleasePlatformTargetMapping | null> {
    const [affectedCount] = await this.model.update(updates, {
      where: { releaseId, platform, target }
    });

    if (affectedCount === 0) {
      return null;
    }

    return this.getByReleasePlatformTarget(releaseId, platform, target);
  }

  /**
   * Get all mappings with a specific project management run ID
   */
  async getByProjectManagementRunId(projectManagementRunId: string): Promise<ReleasePlatformTargetMapping[]> {
    const instances = await this.model.findAll({
      where: { projectManagementRunId }
    });
    return instances.map((instance: any) => this.toPlainObject(instance));
  }

  /**
   * Get all mappings with a specific test management run ID
   */
  async getByTestManagementRunId(testManagementRunId: string): Promise<ReleasePlatformTargetMapping[]> {
    const instances = await this.model.findAll({
      where: { testManagementRunId }
    });
    return instances.map((instance: any) => this.toPlainObject(instance));
  }

  /**
   * Delete all mappings for a release
   */
  async deleteByReleaseId(releaseId: string): Promise<number> {
    return await this.model.destroy({
      where: { releaseId }
    });
  }
}

