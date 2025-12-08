import { QueryTypes, Sequelize } from 'sequelize';
import type { CronJobModelType } from './cron-job.sequelize.model';
import { CronJob, CreateCronJobDto, UpdateCronJobDto } from './release.interface';

export class CronJobRepository {
  private sequelize: Sequelize;

  constructor(private readonly model: CronJobModelType) {
    // Get sequelize instance from model
    this.sequelize = (model as any).sequelize;
  }

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
      upcomingRegressions: data.upcomingRegressions || null,
      autoTransitionToStage3: data.autoTransitionToStage3 || false,
      autoTransitionToStage2: data.autoTransitionToStage2 || false,
      stageData: data.stageData || null,
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

  /**
   * Acquire lock for distributed cron job execution
   * Uses atomic SQL UPDATE to prevent race conditions
   * 
   * @param cronJobId - The cron job ID
   * @param instanceId - Unique identifier for this service instance
   * @param timeoutSeconds - Lock timeout in seconds (default: 300 = 5 minutes)
   * @returns true if lock was acquired
   */
  async acquireLock(cronJobId: string, instanceId: string, timeoutSeconds: number = 300): Promise<boolean> {
    const now = new Date();

    // Try to acquire lock using atomic update
    // Only succeeds if lock is not held or has expired
    const [_result, affectedRows] = await this.sequelize.query(
      `UPDATE cron_jobs 
       SET lockedBy = :instanceId, lockedAt = :now, lockTimeout = :timeout
       WHERE id = :cronJobId 
       AND (lockedBy IS NULL 
            OR lockedAt IS NULL 
            OR TIMESTAMPDIFF(SECOND, lockedAt, NOW()) > lockTimeout)`,
      {
        replacements: {
          instanceId,
          now,
          timeout: timeoutSeconds,
          cronJobId
        },
        type: QueryTypes.UPDATE
      }
    );

    return (affectedRows as number) > 0;
  }

  /**
   * Release lock for a cron job
   * Only releases if the current instance holds the lock
   * 
   * @param cronJobId - The cron job ID
   * @param instanceId - Unique identifier for this service instance
   */
  async releaseLock(cronJobId: string, instanceId: string): Promise<void> {
    await this.sequelize.query(
      `UPDATE cron_jobs 
       SET lockedBy = NULL, lockedAt = NULL
       WHERE id = :cronJobId AND lockedBy = :instanceId`,
      {
        replacements: {
          cronJobId,
          instanceId
        },
        type: QueryTypes.UPDATE
      }
    );
  }

  /**
   * Check if cron job is currently locked (and lock hasn't expired)
   * 
   * @param cronJobId - The cron job ID
   * @returns true if locked and not expired
   */
  async isLocked(cronJobId: string): Promise<boolean> {
    const cronJob = await this.findById(cronJobId);
    if (!cronJob || !cronJob.lockedBy || !cronJob.lockedAt) {
      return false;
    }

    // Check if lock has expired
    const now = new Date();
    const lockedAt = new Date(cronJob.lockedAt);
    const timeoutMs = (cronJob.lockTimeout || 300) * 1000;
    const elapsed = now.getTime() - lockedAt.getTime();

    return elapsed < timeoutMs;
  }
}

