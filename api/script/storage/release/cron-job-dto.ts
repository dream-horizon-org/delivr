/**
 * CronJobDTO - Data Access Layer for Cron Jobs
 * 
 * Adapted from Delivr's CronJob.dto.ts for Sequelize ORM
 * 
 * Key Changes:
 * - Uses Sequelize (not Prisma)
 * - Uses accounts table (not User)
 * - Uses accountId (not userId)
 * - Added locking methods (acquireLock, releaseLock)
 */

import { v4 as uuidv4 } from 'uuid';
import { getStorage } from '../storage-instance';
import { CronStatus, StageStatus } from './release-models';

export interface CreateCronJobData {
  releaseId: string;
  accountId: string; // Creator account ID
  cronConfig: any;
  upcomingRegressions?: Array<{ date: Date; config: any }>;
  autoTransitionToStage3?: boolean; // NEW: For manual Stage 3 trigger (Chunk 12.5)
}

export interface UpdateCronJobData {
  stage1Status?: StageStatus;
  stage2Status?: StageStatus;
  stage3Status?: StageStatus;
  cronStatus?: CronStatus;
  upcomingRegressions?: Array<{ date: Date; config: any }>;
  cronConfig?: any;
  cronStoppedAt?: Date;
  lockedBy?: string | null;
  lockedAt?: Date | null;
  lockTimeout?: number;
  autoTransitionToStage3?: boolean;
}

export class CronJobDTO {
  private get sequelize() {
    const storage = getStorage();
    return (storage as any).sequelize;
  }

  private get CronJobModel() {
    return this.sequelize.models.cronJob;
  }

  /**
   * Create a new cron job
   */
  async create(data: CreateCronJobData): Promise<any> {
    const cronJobId = uuidv4();

    const cronJobData = {
      id: cronJobId,
      releaseId: data.releaseId,
      cronCreatedByAccountId: data.accountId,
      cronStatus: CronStatus.PENDING,
      stage1Status: StageStatus.PENDING,
      stage2Status: StageStatus.PENDING,
      stage3Status: StageStatus.PENDING,
      autoTransitionToStage3: data.autoTransitionToStage3 !== undefined ? data.autoTransitionToStage3 : false, // NEW: Default to false (Chunk 12.5)
      cronConfig: typeof data.cronConfig === 'string' ? data.cronConfig : JSON.stringify(data.cronConfig),
      upcomingRegressions: data.upcomingRegressions ? JSON.stringify(data.upcomingRegressions) : null,
      lockTimeout: 300 // Default 5 minutes
    };

    const cronJob = await this.CronJobModel.create(cronJobData);
    return this.parseCronJob(cronJob.toJSON());
  }

  /**
   * Get cron job by release ID
   */
  async getByReleaseId(releaseId: string): Promise<any> {
    const cronJob = await this.CronJobModel.findOne({
      where: { releaseId }
    });

    if (!cronJob) {
      return null;
    }

    return this.parseCronJob(cronJob.toJSON());
  }

  /**
   * Get cron job by ID
   */
  async get(cronJobId: string): Promise<any> {
    const cronJob = await this.CronJobModel.findByPk(cronJobId);

    if (!cronJob) {
      return null;
    }

    return this.parseCronJob(cronJob.toJSON());
  }

  /**
   * Update cron job
   */
  async update(cronJobId: string, data: UpdateCronJobData): Promise<any> {
    const updateData: any = { ...data };

    // Stringify JSON fields if provided
    if (data.upcomingRegressions !== undefined) {
      updateData.upcomingRegressions = typeof data.upcomingRegressions === 'string'
        ? data.upcomingRegressions
        : JSON.stringify(data.upcomingRegressions);
    }
    if (data.cronConfig !== undefined) {
      updateData.cronConfig = typeof data.cronConfig === 'string'
        ? data.cronConfig
        : JSON.stringify(data.cronConfig);
    }

    await this.CronJobModel.update(updateData, {
      where: { id: cronJobId }
    });

    return this.get(cronJobId);
  }

  /**
   * Get all running cron jobs
   */
  async getRunningCronJobs(): Promise<any[]> {
    const cronJobs = await this.CronJobModel.findAll({
      where: {
        cronStatus: CronStatus.RUNNING
      }
    });

    return cronJobs.map(cj => this.parseCronJob(cj.toJSON()));
  }

  /**
   * Acquire lock for cron job (optimistic locking with try-lock pattern)
   * Returns true if lock acquired, false if already locked
   */
  async acquireLock(cronJobId: string, instanceId: string, timeoutSeconds: number = 300): Promise<boolean> {
    const now = new Date();
    const timeoutMs = timeoutSeconds * 1000;

    // Try to acquire lock using atomic update
    const [affectedRows] = await this.sequelize.query(
      `UPDATE cron_jobs 
       SET locked_by = :instanceId, locked_at = :now, lock_timeout = :timeout
       WHERE id = :cronJobId 
       AND (locked_by IS NULL 
            OR locked_at IS NULL 
            OR TIMESTAMPDIFF(SECOND, locked_at, NOW()) > lock_timeout)`,
      {
        replacements: {
          instanceId,
          now,
          timeout: timeoutSeconds,
          cronJobId
        },
        type: this.sequelize.QueryTypes.UPDATE
      }
    );

    // Check if lock was acquired (affectedRows > 0 means we got the lock)
    return affectedRows > 0;
  }

  /**
   * Release lock for cron job
   */
  async releaseLock(cronJobId: string, instanceId: string): Promise<void> {
    // Only release if we hold the lock
    // Note: Using raw SQL to ensure we use the correct DB column name
    await this.sequelize.query(
      `UPDATE cron_jobs 
       SET locked_by = NULL, locked_at = NULL
       WHERE id = :cronJobId AND locked_by = :instanceId`,
      {
        replacements: {
          cronJobId,
          instanceId
        },
        type: this.sequelize.QueryTypes.UPDATE
      }
    );
  }

  /**
   * Check if cron job is locked
   */
  async isLocked(cronJobId: string): Promise<boolean> {
    const cronJob = await this.get(cronJobId);
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

  /**
   * Update upcoming regressions (single source of truth for regression slots)
   * Used by Update Release API to edit regression build slots
   */
  async updateUpcomingRegressions(cronJobId: string, upcomingRegressions: Array<{ date: Date; config: any }>): Promise<any> {
    const updateData = {
      upcomingRegressions: typeof upcomingRegressions === 'string'
        ? upcomingRegressions
        : JSON.stringify(upcomingRegressions)
    };

    await this.CronJobModel.update(updateData, {
      where: { id: cronJobId }
    });

    return this.get(cronJobId);
  }


  /**
   * Parse cron job JSON fields
   */
  private parseCronJob(cronJob: any): any {
    if (cronJob.upcomingRegressions && typeof cronJob.upcomingRegressions === 'string') {
      cronJob.upcomingRegressions = JSON.parse(cronJob.upcomingRegressions);
    }
    if (cronJob.cronConfig && typeof cronJob.cronConfig === 'string') {
      cronJob.cronConfig = JSON.parse(cronJob.cronConfig);
    }
    return cronJob;
  }
}

