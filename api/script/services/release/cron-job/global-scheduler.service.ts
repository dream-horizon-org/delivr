/**
 * Global Scheduler Service
 * 
 * Single service that handles BOTH:
 * - setInterval mode (local testing) - start/stop scheduler
 * - Cronicle webhook (production) - process releases on demand
 * 
 * Architecture:
 * - ONE global service instance
 * - ONE setInterval (when started)
 * - Processes ALL active releases each tick
 */

import { CronStatus, PauseType } from '~models/release/release.interface';
import type { CronJobRepository } from '~models/release/cron-job.repository';
import type { CronJobStateMachine } from './cron-job-state-machine';
import type { CronJob } from '~models/release/release.interface';
import { createScopedLogger } from '~utils/logger.utils';

const log = createScopedLogger('GlobalSchedulerService');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default scheduler interval in milliseconds (60 seconds) */
const DEFAULT_INTERVAL_MS = 60000;

/** Minimum allowed interval (10 seconds for safety) */
const MIN_INTERVAL_MS = 10000;

// ============================================================================
// TYPES
// ============================================================================

/** Scheduler type - setinterval for local, cronicle for production */
export type SchedulerType = 'setinterval' | 'cronicle';

/** Factory function to create a state machine for a release */
export type StateMachineFactory = (cronJob: CronJob) => Promise<CronJobStateMachine>;

/** Result of processing all active releases */
export type ProcessAllReleasesResult = {
  success: boolean;
  processedCount: number;
  errors: string[];
  durationMs: number;
};

// ============================================================================
// CONFIG HELPERS
// ============================================================================

/**
 * Get scheduler type from environment variable
 * 
 * Default: 'cronicle' (production-ready)
 * Set SCHEDULER_TYPE=setinterval for local testing
 */
export function getSchedulerType(): SchedulerType {
  const envValue = process.env.SCHEDULER_TYPE?.toLowerCase();
  return envValue === 'setinterval' ? 'setinterval' : 'cronicle';
}

/**
 * Get scheduler interval from environment variable
 */
export function getSchedulerIntervalMs(): number {
  const envValue = process.env.SCHEDULER_INTERVAL_MS;
  
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed >= MIN_INTERVAL_MS) {
      return parsed;
    }
    log.warn(`Invalid SCHEDULER_INTERVAL_MS: ${envValue}. Using default ${DEFAULT_INTERVAL_MS}ms`);
  }
  
  return DEFAULT_INTERVAL_MS;
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Global Scheduler Service
 * 
 * Handles release processing for both local testing (setInterval) and production (Cronicle).
 */
export class GlobalSchedulerService {
  private intervalHandle: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly cronJobRepo: CronJobRepository,
    private readonly stateMachineFactory: StateMachineFactory
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Scheduler Control (for setInterval mode)
  // ─────────────────────────────────────────────────────────────

  /**
   * Start the scheduler (setInterval mode)
   * 
   * @returns true if started, false if already running
   */
  start(): boolean {
    if (this.intervalHandle) {
      log.warn('Scheduler already running');
      return false;
    }

    const intervalMs = getSchedulerIntervalMs();
    log.info(`Starting scheduler (interval: ${intervalMs}ms)...`);

    this.intervalHandle = setInterval(async () => {
      await this.processAllActiveReleases();
    }, intervalMs);

    log.info('Scheduler started');
    return true;
  }

  /**
   * Stop the scheduler
   * 
   * @returns true if stopped, false if wasn't running
   */
  stop(): boolean {
    if (!this.intervalHandle) {
      log.info('Scheduler not running');
      return false;
    }

    clearInterval(this.intervalHandle);
    this.intervalHandle = null;
    this.isProcessing = false;

    log.info('Scheduler stopped');
    return true;
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.intervalHandle !== null;
  }

  // ─────────────────────────────────────────────────────────────
  // Core Processing (used by both modes)
  // ─────────────────────────────────────────────────────────────

  /**
   * Process all active releases
   * 
   * This is the main business logic - called by:
   * - setInterval tick (local testing)
   * - Cronicle webhook (production)
   */
  async processAllActiveReleases(): Promise<ProcessAllReleasesResult> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      log.warn('Already processing. Skipping this tick.');
      return {
        success: true,
        processedCount: 0,
        errors: ['Skipped: already processing'],
        durationMs: 0
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let processedCount = 0;

    try {
      log.info('Starting release tick processing...');

      // Query for active releases
      const activeReleases = await this.cronJobRepo.findActiveReleases();
      log.info(`Found ${activeReleases.length} active release(s) to process`);

      // Process each release
      for (const cronJob of activeReleases) {
        // Double-check: only process if cronStatus=RUNNING and pauseType=NONE
        const isRunning = cronJob.cronStatus === CronStatus.RUNNING;
        const notPaused = cronJob.pauseType === PauseType.NONE;
        const shouldProcess = isRunning && notPaused;

        if (!shouldProcess) {
          log.info(
            `Release ${cronJob.releaseId} skipped (status=${cronJob.cronStatus}, pauseType=${cronJob.pauseType})`
          );
          continue;
        }

        try {
          log.info(`Processing release ${cronJob.releaseId}...`);

          // Create state machine and execute
          const stateMachine = await this.stateMachineFactory(cronJob);
          await stateMachine.execute();

          processedCount++;
          log.info(`Release ${cronJob.releaseId} processed successfully`);
        } catch (releaseError) {
          // Capture error but continue with other releases
          const errorMessage =
            releaseError instanceof Error ? releaseError.message : 'Unknown error';
          errors.push(`Release ${cronJob.releaseId}: ${errorMessage}`);
          log.error(`Failed to process release ${cronJob.releaseId}:`, releaseError);
        }
      }

      const durationMs = Date.now() - startTime;
      log.info(`Release tick completed: ${processedCount} processed, ${errors.length} errors, ${durationMs}ms`);

      return { success: true, processedCount, errors, durationMs };

    } catch (error) {
      // Catastrophic error (e.g., DB connection failed)
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Release tick failed:', error);

      return { success: false, processedCount, errors: [errorMessage], durationMs };

    } finally {
      this.isProcessing = false;
    }
  }
}
