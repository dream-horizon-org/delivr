import { QueryTypes, Sequelize, Op } from 'sequelize';
import type { CronJobModelType } from './cron-job.sequelize.model';
import { CronJob, CreateCronJobDto, UpdateCronJobDto, CronStatus, PauseType, StageStatus } from './release.interface';

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
    // Note: stage4Status and pauseType have defaults in model, no need to set here
    const cronJob = await this.model.create({
      id: data.id,
      releaseId: data.releaseId,
      stage1Status: data.stage1Status,
      stage2Status: data.stage2Status,
      stage3Status: data.stage3Status,
      stage4Status: data.stage4Status,
      cronStatus: data.cronStatus,
      pauseType: data.pauseType,
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
   * Find all active releases that should be processed by the global scheduler.
   * 
   * Returns cron jobs where:
   * - cronStatus = RUNNING (release is active)
   * - pauseType = NONE (not paused for any reason)
   * 
   * EXCEPTION: Also includes releases with:
   * - pauseType = AWAITING_STAGE_TRIGGER
   * - stage2Status = COMPLETED
   * 
   * This allows the scheduler to process releases with executable slots even when
   * pauseType = AWAITING_STAGE_TRIGGER. The scheduler will check slot times and
   * allow execution if slot time has passed (see global-scheduler.service.ts).
   * 
   * Used by the global scheduler to find releases to process on each tick.
   * 
   * @returns Array of CronJob records that should be processed
   */
  async findActiveReleases(): Promise<CronJob[]> {
    const cronJobs = await this.model.findAll({
      where: {
        cronStatus: CronStatus.RUNNING,
        [Op.or]: [
          // Standard case: Not paused
          { pauseType: PauseType.NONE },
          // Exception case: Paused but Stage 2 COMPLETED (may have executable slots)
          {
            pauseType: PauseType.AWAITING_STAGE_TRIGGER,
            stage2Status: StageStatus.COMPLETED
          }
        ]
      }
    });

    return cronJobs.map(cronJob => this.toPlainObject(cronJob));
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

