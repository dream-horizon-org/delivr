/**
 * Scheduler Factory
 * 
 * Single file for creating scheduler dependencies and service.
 * Consolidates all dependency injection logic.
 * 
 * Usage:
 * - createGlobalSchedulerService(storage) - Create service instance
 * - initializeScheduler(storage) - Start scheduler on app startup
 * - shutdownScheduler() - Stop scheduler on app shutdown
 */

import { CronJobStateMachine } from './cron-job-state-machine';
import { GlobalSchedulerService, getSchedulerType } from './global-scheduler.service';
import { CronJobRepository } from '~models/release/cron-job.repository';
import { ReleaseRepository } from '~models/release/release.repository';
import { ReleaseTaskRepository } from '~models/release/release-task.repository';
import { RegressionCycleRepository } from '~models/release/regression-cycle.repository';
import { ReleasePlatformTargetMappingRepository } from '~models/release/release-platform-target-mapping.repository';
import { ReleaseUploadsRepository } from '~models/release/release-uploads.repository';
import { createCronJobModel } from '~models/release/cron-job.sequelize.model';
import { createReleaseModel } from '~models/release/release.sequelize.model';
import { createReleaseTaskModel } from '~models/release/release-task.sequelize.model';
import { createRegressionCycleModel } from '~models/release/regression-cycle.sequelize.model';
import { createPlatformTargetMappingModel } from '~models/release/platform-target-mapping.sequelize.model';
import { createReleaseUploadModel } from '~models/release/release-uploads.sequelize.model';
import { getTaskExecutor } from '~services/release/task-executor/task-executor-factory';
import { hasSequelize } from '~types/release/api-types';
import type { Storage } from '~storage/storage';
import type { CronJob } from '~models/release/release.interface';
import type { StateMachineFactory } from './global-scheduler.service';
import type { Sequelize } from 'sequelize';
import type { CronicleService } from '~services/cronicle';

// ============================================================================
// CRONICLE JOB CONSTANTS (local to this feature)
// ============================================================================

const RELEASE_ORCHESTRATION_JOB = {
  TITLE: 'Release Orchestration - 60s Tick',
  CATEGORY: 'Release Orchestration',
  NOTES: 'Processes all active releases every 60 seconds',
  WEBHOOK_PATH: '/internal/cron/releases'
} as const;

// ============================================================================
// CRONICLE REGISTRATION TYPES
// ============================================================================

export type RegisterCronicleResult = {
  success: boolean;
  created?: boolean;
  alreadyExists?: boolean;
  jobId?: string;
  error?: string;
};

// ============================================================================
// MODULE STATE
// ============================================================================

/** Cached service instance (for shutdown) */
let cachedService: GlobalSchedulerService | null = null;

// ============================================================================
// SERVICE FACTORY
// ============================================================================

/**
 * Create GlobalSchedulerService
 * 
 * @param storage - Storage instance
 * @returns Service or null if storage doesn't have Sequelize
 */
export function createGlobalSchedulerService(storage: Storage): GlobalSchedulerService | null {
  if (!hasSequelize(storage)) {
    console.warn('[SchedulerFactory] Storage does not have Sequelize, service not created');
    return null;
  }

  const sequelize = storage.sequelize;
  const { cronJobRepo, stateMachineFactory } = createSchedulerDependencies(sequelize, storage);
  
  return new GlobalSchedulerService(cronJobRepo, stateMachineFactory);
}

// ============================================================================
// INITIALIZATION (for server.ts)
// ============================================================================

/**
 * Initialize scheduler on app startup
 * 
 * In 'setinterval' mode: Starts the scheduler
 * In 'cronicle' mode: Registers the Cronicle job (webhook handles actual processing)
 * 
 * @param storage - Storage instance
 * @returns true if scheduler started/registered, false otherwise
 */
export async function initializeScheduler(storage: Storage): Promise<boolean> {
  const schedulerType = getSchedulerType();
  console.log(`[SchedulerFactory] Scheduler type: ${schedulerType}`);

  if (schedulerType === 'cronicle') {
    console.log('[SchedulerFactory] Cronicle mode - registering job and webhook ready at POST /internal/cron/releases');
    
    // Register the Cronicle job (safe to call multiple times - idempotent)
    const cronicleService = (storage as any).cronicleService as CronicleService | null | undefined;
    const result = await registerCronicleReleaseTick(cronicleService);
    
    if (result.success) {
      const action = result.created ? 'created' : 'already exists';
      console.log(`[SchedulerFactory] Cronicle job ${action}: ${result.jobId}`);
    } else {
      console.warn(`[SchedulerFactory] Could not register Cronicle job: ${result.error}`);
    }
    
    return result.success;
  }

  // Create and cache service for setinterval mode
  cachedService = createGlobalSchedulerService(storage);
  
  if (!cachedService) {
    console.warn('[SchedulerFactory] Could not create service, scheduler not started');
    return false;
  }

  // Start the scheduler
  const started = cachedService.start();
  
  if (started) {
    console.log('[SchedulerFactory] Scheduler started (setinterval mode)');
  } else {
    console.log('[SchedulerFactory] Scheduler already running or failed to start');
  }

  return started;
}

/**
 * Shutdown scheduler (for graceful shutdown)
 */
export function shutdownScheduler(): boolean {
  console.log('[SchedulerFactory] Stopping scheduler...');
  
  if (!cachedService) {
    console.log('[SchedulerFactory] No scheduler to stop');
    return false;
  }

  const stopped = cachedService.stop();
  cachedService = null;

  if (stopped) {
    console.log('[SchedulerFactory] Scheduler stopped');
  }

  return stopped;
}

// ============================================================================
// CRONICLE JOB REGISTRATION
// ============================================================================

/**
 * Register the release orchestration tick job with Cronicle
 * 
 * This creates a Cronicle job that calls the webhook endpoint every minute
 * to process all active releases.
 * 
 * Implementation:
 * - Does NOT provide job ID (let Cronicle auto-generate)
 * - Checks if category already exists (single job per category)
 * - If category exists, assumes job exists → skips creation
 * - Uses buildDirectUrl for webhook URL
 * 
 * @param cronicleService - CronicleService instance (or null if not configured)
 * @returns Result with success status and job info
 */
export async function registerCronicleReleaseTick(
  cronicleService: CronicleService | null | undefined
): Promise<RegisterCronicleResult> {
  // Check if CronicleService is available
  const serviceNotConfigured = cronicleService === null || cronicleService === undefined;
  if (serviceNotConfigured) {
    console.warn('[SchedulerFactory] Cronicle service not configured, cannot register release tick job');
    return {
      success: false,
      error: 'Cronicle service not configured'
    };
  }

  const categoryTitle = RELEASE_ORCHESTRATION_JOB.CATEGORY;

  try {
    // Check if category already exists (we have single job per category)
    const existingCategoryId = await cronicleService.findCategoryByTitle(categoryTitle);
    
    if (existingCategoryId !== null) {
      console.log(`[SchedulerFactory] Category '${categoryTitle}' already exists, job assumed to exist - skipping creation`);
      return {
        success: true,
        created: false,
        alreadyExists: true
      };
    }

    // Build webhook URL using buildDirectUrl (route is at /internal/cron/releases)
    const webhookUrl = cronicleService.buildDirectUrl(RELEASE_ORCHESTRATION_JOB.WEBHOOK_PATH);

    // Create the job (Cronicle auto-generates ID)
    // CronicleService handles category creation if it doesn't exist
    const jobId = await cronicleService.createJob({
      // No ID provided - let Cronicle auto-generate
      title: RELEASE_ORCHESTRATION_JOB.TITLE,
      category: categoryTitle,  // CronicleService handles ID resolution/creation
      enabled: true,
      timing: {
        type: 'cron',
        value: '* * * * *'  // Every minute
      },
      params: {
        method: 'POST',
        url: webhookUrl
      },
      retries: 0,      // No retries - next tick will handle it
      catchUp: false,  // Don't catch up missed runs
      notes: RELEASE_ORCHESTRATION_JOB.NOTES
    });

    console.log(`[SchedulerFactory] Created Cronicle job (id: ${jobId}) → ${webhookUrl}`);

    return {
      success: true,
      created: true,
      jobId
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[SchedulerFactory] Failed to register Cronicle job for category '${categoryTitle}':`, errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

// ============================================================================
// INTERNAL: Dependency Creation
// ============================================================================

/**
 * Create all dependencies needed for the scheduler
 * 
 * @internal Used by createGlobalSchedulerService
 */
export function createSchedulerDependencies(
  sequelize: Sequelize,
  storage: Storage
): { cronJobRepo: CronJobRepository; stateMachineFactory: StateMachineFactory } {
  // Create models
  const CronJobModel = createCronJobModel(sequelize);
  const ReleaseModel = createReleaseModel(sequelize);
  const ReleaseTaskModel = createReleaseTaskModel(sequelize);
  const RegressionCycleModel = createRegressionCycleModel(sequelize);
  const PlatformMappingModel = createPlatformTargetMappingModel(sequelize);
  const ReleaseUploadModel = createReleaseUploadModel(sequelize);

  // Create repositories
  const cronJobRepo = new CronJobRepository(CronJobModel);
  const releaseRepo = new ReleaseRepository(ReleaseModel);
  const releaseTaskRepo = new ReleaseTaskRepository(ReleaseTaskModel);
  const regressionCycleRepo = new RegressionCycleRepository(RegressionCycleModel);
  const platformMappingRepo = new ReleasePlatformTargetMappingRepository(PlatformMappingModel);
  const releaseUploadsRepo = new ReleaseUploadsRepository(sequelize, ReleaseUploadModel);

  // Create state machine factory
  const stateMachineFactory: StateMachineFactory = async (
    cronJob: CronJob
  ): Promise<CronJobStateMachine> => {
    const taskExecutor = getTaskExecutor();

    const stateMachine = new CronJobStateMachine(
      cronJob.releaseId,
      cronJobRepo,
      releaseRepo,
      releaseTaskRepo,
      regressionCycleRepo,
      taskExecutor,
      storage,
      platformMappingRepo,
      releaseUploadsRepo
    );

    await stateMachine.initialize();
    return stateMachine;
  };

  return { cronJobRepo, stateMachineFactory };
}
