import type { CronJobModelType } from './cron-job.sequelize.model';
import { CronJob, CreateCronJobDto, UpdateCronJobDto } from './release.interface';

export class CronJobRepository {
  constructor(private readonly model: CronJobModelType) {}

  private toPlainObject(instance: any): CronJob {
    return instance.toJSON() as CronJob;
  }

  async create(data: CreateCronJobDto): Promise<CronJob> {
    const cronJob = await this.model.create({
      id: data.id,
      releaseId: data.releaseId,
      stage1Status: data.stage1Status,
      stage2Status: data.stage2Status,
      stage3Status: data.stage3Status,
      cronStatus: data.cronStatus,
      cronCreatedByAccountId: data.cronCreatedByAccountId,
      cronConfig: data.cronConfig,
      regressionTimings: data.regressionTimings || '09:00,17:00',
      upcomingRegressions: data.upcomingRegressions || null,
      regressionTimestamp: data.regressionTimestamp || null,
      autoTransitionToStage3: data.autoTransitionToStage3 || false,
      cronCreatedAt: new Date()
    });

    return this.toPlainObject(cronJob);
  }

  async findByReleaseId(releaseId: string): Promise<CronJob | null> {
    const cronJob = await this.model.findOne({
      where: { releaseId }
    });
    if (!cronJob) return null;
    return this.toPlainObject(cronJob);
  }

  async findById(id: string): Promise<CronJob | null> {
    const cronJob = await this.model.findByPk(id);
    if (!cronJob) return null;
    return this.toPlainObject(cronJob);
  }

  async update(id: string, updates: UpdateCronJobDto): Promise<void> {
    await this.model.update(updates, {
      where: { id }
    });
  }

  async delete(id: string): Promise<void> {
    await this.model.destroy({
      where: { id }
    });
  }
}

