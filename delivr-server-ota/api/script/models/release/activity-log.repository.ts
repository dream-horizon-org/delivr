import type { ActivityLogModelType } from './activity-log.sequelize.model';
import { ActivityLog, CreateActivityLogDto } from './release.interface';

export class ActivityLogRepository {
  constructor(private readonly model: ActivityLogModelType) {}

  private toPlainObject(instance: any): ActivityLog {
    return instance.toJSON() as ActivityLog;
  }

  async create(data: CreateActivityLogDto): Promise<ActivityLog> {
    const activityLog = await this.model.create({
      id: data.id,
      releaseId: data.releaseId,
      type: data.type,
      previousValue: data.previousValue ?? null,
      newValue: data.newValue ?? null,
      updatedBy: data.updatedBy,
      updatedAt: new Date()
    });

    return this.toPlainObject(activityLog);
  }

  async findByReleaseId(releaseId: string): Promise<ActivityLog[]> {
    const activityLogs = await this.model.findAll({
      where: { releaseId },
      order: [['updatedAt', 'DESC']]
    });
    return activityLogs.map((log) => this.toPlainObject(log));
  }

  async deleteByReleaseId(releaseId: string): Promise<void> {
    await this.model.destroy({
      where: { releaseId }
    });
  }
}

