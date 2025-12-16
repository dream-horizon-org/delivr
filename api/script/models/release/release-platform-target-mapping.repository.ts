import type { PlatformTargetMappingModelType } from './platform-target-mapping.sequelize.model';
import { ReleasePlatformTargetMapping, CreateReleasePlatformTargetMappingDto } from './release.interface';
import { QueryTypes } from 'sequelize';

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
   * Update a platform-target mapping by ID
   */
  async update(
    id: string,
    updates: {
      platform?: ReleasePlatformTargetMapping['platform'];
      target?: ReleasePlatformTargetMapping['target'];
      version?: string;
      projectManagementRunId?: string;
      testManagementRunId?: string;
    }
  ): Promise<void> {
    await this.model.update(updates, {
      where: { id }
    });
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

  /**
   * Get the latest version for a tenant + platform + target combination
   * Since versions are mandated to be incremental, the latest is simply the most recent.
   * Excludes ARCHIVED releases to ensure version progression is accurate.
   * 
   * @param tenantId - Tenant ID to filter releases
   * @param platform - Platform (ANDROID, IOS, WEB)
   * @param target - Target (WEB, PLAY_STORE, APP_STORE)
   * @returns Latest version string, or null if no releases exist
   */
  async getLatestVersionForTenant(
    tenantId: string,
    platform: ReleasePlatformTargetMapping['platform'],
    target: ReleasePlatformTargetMapping['target']
  ): Promise<string | null> {
    // Access sequelize instance from the model
    const sequelize = (this.model as any).sequelize;
    const sequelizeNotAvailable = !sequelize;
    
    if (sequelizeNotAvailable) {
      console.error('[getLatestVersionForTenant] Sequelize instance not available from model');
      return null;
    }

    // Since versions are incremental, latest = most recently created
    const query = `
      SELECT ptm.version
      FROM release_platforms_targets_mapping ptm
      INNER JOIN releases r ON ptm.releaseId = r.id
      WHERE r.tenantId = :tenantId
        AND r.status != 'ARCHIVED'
        AND ptm.platform = :platform
        AND ptm.target = :target
      ORDER BY ptm.createdAt DESC
      LIMIT 1
    `;

    type VersionRow = { version: string };

    const results: VersionRow[] = await sequelize.query(query, {
      replacements: { tenantId, platform, target },
      type: QueryTypes.SELECT
    });

    const noVersionFound = results.length === 0;
    if (noVersionFound) {
      return null;
    }

    return results[0].version;
  }
}
