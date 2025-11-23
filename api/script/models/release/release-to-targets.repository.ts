/**
 * ReleaseToTargets Repository
 * Data access layer for releaseToTargets junction table
 * Handles the many-to-many relationship between releases and targets
 */

import { Model } from 'sequelize';
import { ReleaseToTarget, CreateReleaseToTargetDto } from './release.interface';
import { TargetName } from '../../storage/release/release-models';

export type ReleaseToTargetsModelType = typeof Model & {
  new (): Model<ReleaseToTarget>;
};

export class ReleaseToTargetsRepository {
  constructor(private readonly model: ReleaseToTargetsModelType) {}

  private toPlainObject(instance: any): ReleaseToTarget {
    return instance.toJSON() as ReleaseToTarget;
  }

  /**
   * Create a release-to-target link
   */
  create = async (data: CreateReleaseToTargetDto): Promise<ReleaseToTarget> => {
    const record = await this.model.create({
      id: data.id,
      releaseId: data.releaseId,
      target: data.target,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return this.toPlainObject(record);
  };

  /**
   * Get all targets for a release
   */
  getByReleaseId = async (releaseId: string): Promise<ReleaseToTarget[]> => {
    const records = await this.model.findAll({ where: { releaseId } });
    return records.map(this.toPlainObject.bind(this));
  };

  /**
   * Get a specific target for a release
   */
  getByReleaseAndTarget = async (
    releaseId: string,
    target: TargetName
  ): Promise<ReleaseToTarget | null> => {
    const record = await this.model.findOne({ where: { releaseId, target } });
    return record ? this.toPlainObject(record) : null;
  };

  /**
   * Delete a release-to-target link
   */
  delete = async (releaseId: string, target: TargetName): Promise<boolean> => {
    const deleted = await this.model.destroy({ where: { releaseId, target } });
    return deleted > 0;
  };

  /**
   * Delete all targets for a release
   */
  deleteByReleaseId = async (releaseId: string): Promise<number> => {
    return await this.model.destroy({ where: { releaseId } });
  };
}

