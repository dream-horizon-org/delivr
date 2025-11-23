/**
 * ReleaseToPlatforms Repository
 * Data access layer for releaseToPlatforms junction table
 * Handles the many-to-many relationship between releases and platforms with per-platform versioning
 */

import { Model } from 'sequelize';
import { ReleaseToPlatform, CreateReleaseToPlatformDto } from './release.interface';
import { PlatformName } from '../../storage/release/release-models';

export type ReleaseToPlatformsModelType = typeof Model & {
  new (): Model<ReleaseToPlatform>;
};

export class ReleaseToPlatformsRepository {
  constructor(private readonly model: ReleaseToPlatformsModelType) {}

  private toPlainObject(instance: any): ReleaseToPlatform {
    return instance.toJSON() as ReleaseToPlatform;
  }

  /**
   * Create a release-to-platform link with version
   */
  create = async (data: CreateReleaseToPlatformDto): Promise<ReleaseToPlatform> => {
    const record = await this.model.create({
      id: data.id,
      releaseId: data.releaseId,
      platform: data.platform,
      version: data.version,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return this.toPlainObject(record);
  };

  /**
   * Get all platforms for a release
   */
  getByReleaseId = async (releaseId: string): Promise<ReleaseToPlatform[]> => {
    const records = await this.model.findAll({ where: { releaseId } });
    return records.map(this.toPlainObject.bind(this));
  };

  /**
   * Get a specific platform for a release
   */
  getByReleaseAndPlatform = async (
    releaseId: string,
    platform: PlatformName
  ): Promise<ReleaseToPlatform | null> => {
    const record = await this.model.findOne({ where: { releaseId, platform } });
    return record ? this.toPlainObject(record) : null;
  };

  /**
   * Update version for a specific platform
   */
  updateVersion = async (
    releaseId: string,
    platform: PlatformName,
    version: string
  ): Promise<ReleaseToPlatform | null> => {
    const record = await this.model.findOne({ where: { releaseId, platform } });
    if (!record) {
      return null;
    }
    await record.update({ version, updatedAt: new Date() });
    return this.toPlainObject(record);
  };

  /**
   * Delete a release-to-platform link
   */
  delete = async (releaseId: string, platform: PlatformName): Promise<boolean> => {
    const deleted = await this.model.destroy({ where: { releaseId, platform } });
    return deleted > 0;
  };

  /**
   * Delete all platforms for a release
   */
  deleteByReleaseId = async (releaseId: string): Promise<number> => {
    return await this.model.destroy({ where: { releaseId } });
  };
}

