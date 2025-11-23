/**
 * Cron Lock Service
 * 
 * Provides distributed locking for cron job execution across multiple instances.
 * Uses database-based optimistic locking with try-lock pattern.
 * 
 * Follows cursorrules: No 'any' types - use explicit types
 */

import { CronJobDTO } from '../storage/release/cron-job-dto';

/**
 * Lock acquisition result
 */
export interface LockResult {
  acquired: boolean;
  reason?: string;
}

/**
 * Cron Lock Service
 * 
 * Handles distributed locking for cron jobs to prevent concurrent execution
 * across multiple service instances.
 */
export class CronLockService {
  private cronJobDTO: CronJobDTO;

  constructor(cronJobDTO: CronJobDTO) {
    this.cronJobDTO = cronJobDTO;
  }

  /**
   * Acquire lock for a cron job
   * 
   * Uses optimistic locking with try-lock pattern:
   * - Attempts to acquire lock atomically via SQL UPDATE
   * - Only succeeds if lock is not held or has expired
   * - Lock timeout: 5 minutes (300 seconds)
   * 
   * @param cronJobId - The cron job ID
   * @param instanceId - Unique identifier for this service instance
   * @param timeoutSeconds - Lock timeout in seconds (default: 300 = 5 minutes)
   * @returns LockResult indicating if lock was acquired
   */
  async acquireLock(
    cronJobId: string,
    instanceId: string,
    timeoutSeconds: number = 300
  ): Promise<LockResult> {
    try {
      const acquired = await this.cronJobDTO.acquireLock(
        cronJobId,
        instanceId,
        timeoutSeconds
      );

      if (acquired) {
        return {
          acquired: true
        };
      }

      // Check if lock is held by another instance
      const cronJob = await this.cronJobDTO.get(cronJobId);
      if (cronJob && cronJob.lockedBy && cronJob.lockedBy !== instanceId) {
        return {
          acquired: false,
          reason: `Lock held by instance: ${cronJob.lockedBy}`
        };
      }

      return {
        acquired: false,
        reason: 'Lock acquisition failed (unknown reason)'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        acquired: false,
        reason: `Error acquiring lock: ${errorMessage}`
      };
    }
  }

  /**
   * Release lock for a cron job
   * 
   * Only releases if the current instance holds the lock.
   * 
   * @param cronJobId - The cron job ID
   * @param instanceId - Unique identifier for this service instance
   */
  async releaseLock(cronJobId: string, instanceId: string): Promise<void> {
    try {
      await this.cronJobDTO.releaseLock(cronJobId, instanceId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error releasing lock: ${errorMessage}`);
    }
  }

  /**
   * Check if cron job is currently locked
   * 
   * @param cronJobId - The cron job ID
   * @returns true if locked (and lock hasn't expired)
   */
  async isLocked(cronJobId: string): Promise<boolean> {
    try {
      return await this.cronJobDTO.isLocked(cronJobId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error checking lock status: ${errorMessage}`);
    }
  }

  /**
   * Get lock holder information
   * 
   * @param cronJobId - The cron job ID
   * @returns Lock information or null if not locked
   */
  async getLockInfo(cronJobId: string): Promise<{
    lockedBy: string | null;
    lockedAt: Date | null;
    lockTimeout: number | null;
    isExpired: boolean;
  } | null> {
    try {
      const cronJob = await this.cronJobDTO.get(cronJobId);
      if (!cronJob) {
        return null;
      }

      if (!cronJob.lockedBy || !cronJob.lockedAt) {
        return {
          lockedBy: null,
          lockedAt: null,
          lockTimeout: cronJob.lockTimeout || null,
          isExpired: false
        };
      }

      // Check if lock has expired
      const now = new Date();
      const lockedAt = new Date(cronJob.lockedAt);
      const timeoutMs = (cronJob.lockTimeout || 300) * 1000;
      const elapsed = now.getTime() - lockedAt.getTime();
      const isExpired = elapsed >= timeoutMs;

      return {
        lockedBy: cronJob.lockedBy,
        lockedAt: lockedAt,
        lockTimeout: cronJob.lockTimeout || null,
        isExpired
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error getting lock info: ${errorMessage}`);
    }
  }
}

