import type { ReleaseModelType } from './release.sequelize.model';
import { Release, CreateReleaseDto, UpdateReleaseDto } from './release.interface';

/**
 * Release Repository
 * Data access layer for releases table
 */
export class ReleaseRepository {
  constructor(private readonly model: ReleaseModelType) {}

  private toPlainObject(instance: any): Release {
    return instance.toJSON() as Release;
  }

  async create(data: CreateReleaseDto): Promise<Release> {
    const release = await this.model.create({
      id: data.id,
      releaseId: data.releaseId,
      releaseConfigId: data.releaseConfigId || null,
      tenantId: data.tenantId,
      type: data.type,
      status: data.status,
      branch: data.branch || null,
      baseBranch: data.baseBranch || null,
      baseReleaseId: data.baseReleaseId || null,
      releaseTag: data.releaseTag || null,
      kickOffReminderDate: data.kickOffReminderDate || null,
      kickOffDate: data.kickOffDate || null,
      targetReleaseDate: data.targetReleaseDate || null,
      releaseDate: data.releaseDate || null,
      hasManualBuildUpload: data.hasManualBuildUpload,
      createdByAccountId: data.createdByAccountId,
      releasePilotAccountId: data.releasePilotAccountId,
      lastUpdatedByAccountId: data.lastUpdatedByAccountId
    });

    return this.toPlainObject(release);
  }

  async findById(id: string): Promise<Release | null> {
    const release = await this.model.findByPk(id);
    if (!release) return null;
    return this.toPlainObject(release);
  }

  async findByBaseReleaseId(baseReleaseId: string, tenantId: string): Promise<Release | null> {
    const release = await this.model.findOne({
      where: { baseReleaseId, tenantId }
    });
    if (!release) return null;
    return this.toPlainObject(release);
  }

  async findAllByTenantId(tenantId: string): Promise<Release[]> {
    const releases = await this.model.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']]
    });
    return releases.map(this.toPlainObject.bind(this));
  }

  /**
   * Find the latest release for a release config
   * Used for scheduled release version bumping
   */
  async findLatestByReleaseConfigId(releaseConfigId: string): Promise<Release | null> {
    const release = await this.model.findOne({
      where: { releaseConfigId },
      order: [['createdAt', 'DESC']]
    });
    if (!release) return null;
    return this.toPlainObject(release);
  }

  /**
   * Check if any releases exist for a release config
   * Used to prevent deletion of configs that have releases
   */
  async existsByReleaseConfigId(releaseConfigId: string): Promise<boolean> {
    const count = await this.model.count({
      where: { releaseConfigId }
    });
    return count > 0;
  }

  async update(id: string, data: UpdateReleaseDto): Promise<Release | null> {
    await this.model.update(data, {
      where: { id }
    });
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.model.destroy({
      where: { id }
    });
  }
}

