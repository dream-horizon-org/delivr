import type { ReleaseConfigActivityLogModelType } from './release-config-activity-log.sequelize.model';
import { ReleaseConfigActivityLog, CreateReleaseConfigActivityLogDto } from '~types/release-configs/release-config.interface';

export class ReleaseConfigActivityLogRepository {
  constructor(private readonly model: ReleaseConfigActivityLogModelType) {}

  private toPlainObject(instance: any): ReleaseConfigActivityLog {
    return instance.toJSON() as ReleaseConfigActivityLog;
  }

  async create(data: CreateReleaseConfigActivityLogDto): Promise<ReleaseConfigActivityLog> {
    const activityLog = await this.model.create({
      id: data.id,
      releaseConfigId: data.releaseConfigId,
      type: data.type,
      previousValue: data.previousValue ?? null,
      newValue: data.newValue ?? null,
      updatedBy: data.updatedBy,
      updatedAt: new Date()
    });

    return this.toPlainObject(activityLog);
  }

  async findByReleaseConfigId(releaseConfigId: string): Promise<ReleaseConfigActivityLog[]> {
    const activityLogs = await this.model.findAll({
      where: { releaseConfigId },
      order: [['updatedAt', 'DESC']]
    });
    return activityLogs.map((log) => this.toPlainObject(log));
  }

  async deleteByReleaseConfigId(releaseConfigId: string): Promise<void> {
    await this.model.destroy({
      where: { releaseConfigId }
    });
  }
}

