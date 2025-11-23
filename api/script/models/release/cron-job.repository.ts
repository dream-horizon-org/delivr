import { CronJob, CreateCronJobDto } from './release.interface';
import { StageStatus, CronStatus } from '../../storage/release/release-models';

export class CronJobRepository {
  constructor(private readonly model: any) {}

  private toPlainObject(instance: any): CronJob {
    return instance.toJSON() as CronJob;
  }

  async create(data: CreateCronJobDto): Promise<CronJob> {
    const cronJob = await this.model.create({
      id: data.id,
      releaseId: data.releaseId,
      stage1Status: StageStatus.PENDING,
      stage2Status: StageStatus.PENDING,
      stage3Status: StageStatus.PENDING,
      cronStatus: CronStatus.PENDING,
      cronCreatedByAccountId: data.accountId,
      cronConfig: data.cronConfig,
      upcomingRegressions: data.upcomingRegressions || null,
      regressionTimings: data.regressionTimings || '09:00,17:00',
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

  async update(id: string, updates: Partial<CronJob>): Promise<void> {
    await this.model.update(updates, {
      where: { id }
    });
  }
}

