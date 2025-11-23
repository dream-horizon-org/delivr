import { Model } from 'sequelize';
import { Release, CreateReleaseDto } from './release.interface';

/**
 * Release Repository
 * Data access layer for releases table
 * 
 * Note: Models are defined in storage/release/release-models.ts
 * This repository receives the model instance from Sequelize
 */
export class ReleaseRepository {
  constructor(private readonly model: any) {}

  private toPlainObject(instance: any): Release {
    return instance.toJSON() as Release;
  }

  async create(data: CreateReleaseDto): Promise<Release> {
    const release = await this.model.create({
      id: data.id,
      tenantId: data.tenantId,
      type: data.type,
      status: data.status || 'PENDING',
      targetReleaseDate: data.targetReleaseDate,
      plannedDate: data.plannedDate,
      baseBranch: data.baseBranch || null,
      baseVersion: data.baseVersion || null,
      parentId: data.parentId || null,
      releasePilotAccountId: data.releasePilotAccountId,
      createdByAccountId: data.accountId,
      lastUpdateByAccountId: data.accountId,
      kickOffReminderDate: data.kickOffReminderDate || null,
      customIntegrationConfigs: data.customIntegrationConfigs || null,
      regressionBuildSlots: data.regressionBuildSlots || null,
      preCreatedBuilds: data.preCreatedBuilds || null,
      releaseKey: data.releaseKey
    });

    return this.toPlainObject(release);
  }

  async findById(id: string): Promise<Release | null> {
    const release = await this.model.findByPk(id);
    if (!release) return null;
    return this.toPlainObject(release);
  }

  async findByReleaseKey(releaseKey: string, tenantId: string): Promise<Release | null> {
    const release = await this.model.findOne({
      where: { releaseKey, tenantId }
    });
    if (!release) return null;
    return this.toPlainObject(release);
  }

  async findByBaseVersion(baseVersion: string, tenantId: string): Promise<Release | null> {
    const release = await this.model.findOne({
      where: { baseVersion, tenantId }
    });
    if (!release) return null;
    return this.toPlainObject(release);
  }

  // TODO: Add update, delete, etc. as needed
}

