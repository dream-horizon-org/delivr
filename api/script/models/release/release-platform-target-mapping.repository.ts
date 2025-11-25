import type { PlatformTargetMappingModelType } from './platform-target-mapping.sequelize.model';
import { ReleasePlatformTargetMapping, CreateReleasePlatformTargetMappingDto } from './release.interface';

/**
 * Release Platform Target Mapping Repository
 * Data access layer for release_platforms_targets_mapping table
 */
export class ReleasePlatformTargetMappingRepository {
  constructor(private readonly model: PlatformTargetMappingModelType) {}

  private toPlainObject(instance: any): ReleasePlatformTargetMapping {
    return instance.toJSON() as ReleasePlatformTargetMapping;
  }

  /**
   * Create a new platform-target mapping
   */
  async create(dto: CreateReleasePlatformTargetMappingDto): Promise<ReleasePlatformTargetMapping> {
    const mapping = await this.model.create({
      id: dto.id,
      releaseId: dto.releaseId,
      platform: dto.platform,
      target: dto.target,
      version: dto.version,
      projectManagementRunId: dto.projectManagementRunId || null,
      testManagementRunId: dto.testManagementRunId || null
    });

    return this.toPlainObject(mapping);
  }

  /**
   * Get all platform-target mappings for a release
   */
  async getByReleaseId(releaseId: string): Promise<ReleasePlatformTargetMapping[]> {
    const mappings = await this.model.findAll({
      where: { releaseId }
    });
    return mappings.map((m: any) => this.toPlainObject(m));
  }

  /**
   * Get a specific platform-target mapping
   */
  async getByReleasePlatformTarget(
    releaseId: string,
    platform: ReleasePlatformTargetMapping['platform'],
    target: ReleasePlatformTargetMapping['target']
  ): Promise<ReleasePlatformTargetMapping | null> {
    const mapping = await this.model.findOne({
      where: { releaseId, platform, target }
    });
    if (!mapping) return null;
    return this.toPlainObject(mapping);
  }

  /**
   * Update integration run IDs for a specific mapping
   */
  async updateIntegrationRunIds(
    releaseId: string,
    platform: ReleasePlatformTargetMapping['platform'],
    target: ReleasePlatformTargetMapping['target'],
    updates: {
      projectManagementRunId?: string;
      testManagementRunId?: string;
    }
  ): Promise<void> {
    await this.model.update(updates, {
      where: { releaseId, platform, target }
    });
  }

  /**
   * Find mapping by project management run ID
   */
  async getByProjectManagementRunId(projectManagementRunId: string): Promise<ReleasePlatformTargetMapping | null> {
    const mapping = await this.model.findOne({
      where: { projectManagementRunId }
    });
    if (!mapping) return null;
    return this.toPlainObject(mapping);
  }

  /**
   * Find mapping by test management run ID
   */
  async getByTestManagementRunId(testManagementRunId: string): Promise<ReleasePlatformTargetMapping | null> {
    const mapping = await this.model.findOne({
      where: { testManagementRunId }
    });
    if (!mapping) return null;
    return this.toPlainObject(mapping);
  }

  /**
   * Delete a specific mapping
   */
  async delete(id: string): Promise<void> {
    await this.model.destroy({
      where: { id }
    });
  }

  /**
   * Delete all mappings for a release
   */
  async deleteByReleaseId(releaseId: string): Promise<void> {
    await this.model.destroy({
      where: { releaseId }
    });
  }
}
