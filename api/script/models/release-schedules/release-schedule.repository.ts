/**
 * Release Schedule Repository
 * Data access layer for release schedules
 */

import type {
  ReleaseScheduleRecord,
  CreateReleaseScheduleDto,
  UpdateReleaseScheduleDto
} from '~types/release-schedules/release-schedule.interface';
import type { ReleaseScheduleModelType } from './release-schedule.sequelize.model';

export class ReleaseScheduleRepository {
  constructor(
    private readonly model: ReleaseScheduleModelType
  ) {}

  private toPlainObject = (instance: InstanceType<ReleaseScheduleModelType>): ReleaseScheduleRecord => {
    const json = instance.toJSON();
    return json as ReleaseScheduleRecord;
  };

  create = async (
    data: CreateReleaseScheduleDto & { id: string }
  ): Promise<ReleaseScheduleRecord> => {
    const schedule = await this.model.create({
      id: data.id,
      releaseConfigId: data.releaseConfigId, // FK to release_configurations
      tenantId: data.tenantId,
      releaseFrequency: data.releaseFrequency,
      firstReleaseKickoffDate: data.firstReleaseKickoffDate,
      initialVersions: data.initialVersions,
      kickoffReminderTime: data.kickoffReminderTime,
      kickoffTime: data.kickoffTime,
      targetReleaseTime: data.targetReleaseTime,
      targetReleaseDateOffsetFromKickoff: data.targetReleaseDateOffsetFromKickoff,
      kickoffReminderEnabled: data.kickoffReminderEnabled,
      timezone: data.timezone,
      regressionSlots: data.regressionSlots ?? null,
      workingDays: data.workingDays,
      nextReleaseKickoffDate: data.nextReleaseKickoffDate,
      isEnabled: true,
      lastCreatedReleaseId: null,
      cronicleJobId: null,
      createdByAccountId: data.createdByAccountId
    });

    return this.toPlainObject(schedule);
  };

  findById = async (id: string): Promise<ReleaseScheduleRecord | null> => {
    const schedule = await this.model.findByPk(id);

    if (!schedule) {
      return null;
    }

    return this.toPlainObject(schedule);
  };

  findByTenantId = async (tenantId: string): Promise<ReleaseScheduleRecord[]> => {
    const schedules = await this.model.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']]
    });

    return schedules.map((schedule) => this.toPlainObject(schedule));
  };

  /**
   * Find schedule by release config ID
   * Since there's a unique constraint, only one schedule per config
   */
  findByReleaseConfigId = async (releaseConfigId: string): Promise<ReleaseScheduleRecord | null> => {
    const schedule = await this.model.findOne({
      where: { releaseConfigId }
    });

    if (!schedule) {
      return null;
    }

    return this.toPlainObject(schedule);
  };

  /**
   * Find all enabled schedules with nextReleaseKickoffDate <= given date
   * Used by cron job to find schedules ready for release creation
   */
  findSchedulesDueForRelease = async (date: string): Promise<ReleaseScheduleRecord[]> => {
    const schedules = await this.model.findAll({
      where: {
        isEnabled: true,
        nextReleaseKickoffDate: date
      },
      order: [['nextReleaseKickoffDate', 'ASC']]
    });

    return schedules.map((schedule) => this.toPlainObject(schedule));
  };

  update = async (
    id: string,
    data: UpdateReleaseScheduleDto
  ): Promise<ReleaseScheduleRecord | null> => {
    const schedule = await this.model.findByPk(id);

    if (!schedule) {
      return null;
    }

    await schedule.update(data);

    return this.toPlainObject(schedule);
  };

  /**
   * Update the next kickoff date and last created release ID
   * Called after a release is created from this schedule
   */
  updateAfterReleaseCreation = async (
    id: string,
    nextReleaseKickoffDate: string,
    lastCreatedReleaseId: string
  ): Promise<ReleaseScheduleRecord | null> => {
    return this.update(id, {
      nextReleaseKickoffDate,
      lastCreatedReleaseId
    });
  };

  /**
   * Enable or disable a schedule
   */
  setEnabled = async (id: string, isEnabled: boolean): Promise<ReleaseScheduleRecord | null> => {
    return this.update(id, { isEnabled });
  };

  delete = async (id: string): Promise<boolean> => {
    const rowsDeleted = await this.model.destroy({
      where: { id }
    });

    return rowsDeleted > 0;
  };

  /**
   * Delete schedule by release config ID
   * Useful for cascade delete when config is deleted
   */
  deleteByReleaseConfigId = async (releaseConfigId: string): Promise<boolean> => {
    const rowsDeleted = await this.model.destroy({
      where: { releaseConfigId }
    });

    return rowsDeleted > 0;
  };
}

