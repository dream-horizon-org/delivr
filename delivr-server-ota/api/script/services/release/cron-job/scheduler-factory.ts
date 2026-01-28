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
// Note: Repositories are now accessed from storage instance (migrated from factory)
// Note: TaskExecutor is now accessed from storage instance (migrated from factory)
import type { Storage } from '~storage/storage';
import type { CronJob } from '~models/release/release.interface';
import { 
  hasTaskExecutor, 
  hasGlobalSchedulerService, 
  hasReleaseCreationService,
  type StorageWithReleaseServices 
} from '~types/release/storage-with-services.interface';
import type { StateMachineFactory } from './global-scheduler.service';
import type { Sequelize } from 'sequelize';
import type { CronicleService } from '~services/cronicle';

// ============================================================================
// CRONICLE JOB CONSTANTS (local to this feature)
// ============================================================================

const RELEASE_ORCHESTRATION_JOB = {
  TITLE: 'release_orchestration',
  CATEGORY: 'release_orchestration',
  CATEGORY_MAX_CHILDREN: 1,  // Only 1 concurrent job allowed in this category
  NOTES: 'Processes all active releases every 1 minute',
  WEBHOOK_PATH: '/internal/cron/releases',
  INTERVAL_MINUTES: 1
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
 * @deprecated Use storage.globalSchedulerService instead (migrated to aws-storage.ts)
 * This function is kept for backward compatibility but should not be used in new code.
 * 
 * @param storage - Storage instance
 * @returns Service or null if storage doesn't have Sequelize
 */
export function createGlobalSchedulerService(storage: Storage): GlobalSchedulerService | null {
  // ✅ Use proper type guard instead of 'as any'
  if (!hasGlobalSchedulerService(storage)) {
    return null;
  }
  
  // TypeScript now knows storage is StorageWithReleaseServices
  const storageWithServices: StorageWithReleaseServices = storage;
  return storageWithServices.globalSchedulerService;
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
    // ✅ Use proper type guard instead of 'as any'
    const cronicleService = hasReleaseCreationService(storage) 
      ? storage.cronicleService 
      : undefined;
    const result = await registerCronicleReleaseTick(cronicleService);
    
    if (result.success) {
      if (result.created) {
        console.log(`[SchedulerFactory] Cronicle job created: ${result.jobId}`);
      } else if (result.alreadyExists) {
        console.log(`[SchedulerFactory] Cronicle job already exists: ${result.jobId ?? 'unknown'}`);
      }  else {
        console.log(`[SchedulerFactory] Cronicle job status: ${result.jobId ? `exists (${result.jobId})` : 'unknown'}`);
      }
    } else {
      console.warn(`[SchedulerFactory] Could not register Cronicle job: ${result.error}`);
    }
    
    return result.success;
  }

  // ✅ Get GlobalSchedulerService from storage instance (migrated from factory)
  // Use proper type guard instead of 'as any'
  if (!hasGlobalSchedulerService(storage)) {
    console.warn('[SchedulerFactory] GlobalSchedulerService not available on storage, scheduler not started');
    return false;
  }
  
  // TypeScript now knows storage is StorageWithReleaseServices
  const storageWithServices: StorageWithReleaseServices = storage;
  cachedService = storageWithServices.globalSchedulerService;
  
  if (!cachedService) {
    console.warn('[SchedulerFactory] GlobalSchedulerService not available on storage, scheduler not started');
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
  const jobTitle = RELEASE_ORCHESTRATION_JOB.TITLE;

  try {
    // ✅ NEW: Get category ID from categoryTitle (required for getJobs API)
    const categoryId = await cronicleService.findCategoryByTitle(categoryTitle);
    
    if (categoryId === null) {
      // Category doesn't exist - no jobs in this category, proceed to create
      console.warn(`[SchedulerFactory] Category '${categoryTitle}' not found. Job creation will auto-create category.`);
    } else {
      // ✅ NEW: Fetch jobs by categoryId (Cronicle API requires category ID, not title)
      // We query by categoryId (derived from categoryTitle) and then filter by job title
      const jobsInCategory = await cronicleService.getJobs({ category: categoryId });
      
      // Check if job with matching title already exists
      const existingJob = jobsInCategory.find(job => job.title === jobTitle);
      
      if (existingJob) {
        console.log(`[SchedulerFactory] Job '${jobTitle}' already exists (id: ${existingJob.id}) - skipping creation`);
        return {
          success: true,
          created: false,
          alreadyExists: true,
          jobId: existingJob.id
        };
      }
    }

    // Build webhook URL using buildDirectUrl (route is at /internal/cron/releases)
    const webhookUrl = cronicleService.buildDirectUrl(RELEASE_ORCHESTRATION_JOB.WEBHOOK_PATH);
    const minutesArray = buildMinutesArray(RELEASE_ORCHESTRATION_JOB.INTERVAL_MINUTES);
    // Create the job (Cronicle auto-generates ID)
    // CronicleService handles category creation if it doesn't exist
    const jobId = await cronicleService.createJob({
      // No ID provided - let Cronicle auto-generate
      title: RELEASE_ORCHESTRATION_JOB.TITLE,
      category: categoryTitle,  // CronicleService handles ID resolution/creation
      categoryMaxChildren: RELEASE_ORCHESTRATION_JOB.CATEGORY_MAX_CHILDREN,
      enabled: true,
      timing: {
        minutes: minutesArray, // Every N minutes (e.g., [0, 1, 2, ..., 59] for every minute)
        hours: Array.from({ length: 24 }, (_, i) => i), // Every hour (0-23)
        days: Array.from({ length: 31 }, (_, i) => i + 1), // Every day of the month (1-31)
        months: Array.from({ length: 12 }, (_, i) => i + 1) // Every month (1-12)
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

const buildMinutesArray = (intervalMinutes: number): number[] => {
  const minutes: number[] = [];
  let minute = 0;
  
  while (minute < 60) {
    minutes.push(minute);
    minute += intervalMinutes;
  }
  
  return minutes;
};

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
  // ✅ Use repositories from storage instead of creating new instances (centralized initialization)
  // All repositories are already initialized in aws-storage.ts setup()
  const storageWithServices = storage as StorageWithReleaseServices;
  
  // Verify all required repositories are available on storage
  if (!storageWithServices.cronJobRepository) {
    throw new Error('CronJobRepository not available on storage instance');
  }
  if (!storageWithServices.releaseRepository) {
    throw new Error('ReleaseRepository not available on storage instance');
  }
  if (!storageWithServices.releaseTaskRepository) {
    throw new Error('ReleaseTaskRepository not available on storage instance');
  }
  if (!storageWithServices.regressionCycleRepository) {
    throw new Error('RegressionCycleRepository not available on storage instance');
  }
  if (!storageWithServices.platformMappingRepository) {
    throw new Error('ReleasePlatformTargetMappingRepository not available on storage instance');
  }
  if (!storageWithServices.releaseUploadsRepository) {
    throw new Error('ReleaseUploadsRepository not available on storage instance');
  }
  if (!storageWithServices.buildRepository) {
    throw new Error('BuildRepository not available on storage instance');
  }
  
  // ✅ Use repositories from storage (no new keyword)
  const cronJobRepo = storageWithServices.cronJobRepository;
  const releaseRepo = storageWithServices.releaseRepository;
  const releaseTaskRepo = storageWithServices.releaseTaskRepository;
  const regressionCycleRepo = storageWithServices.regressionCycleRepository;
  const platformMappingRepo = storageWithServices.platformMappingRepository;
  const releaseUploadsRepo = storageWithServices.releaseUploadsRepository;
  const buildRepo = storageWithServices.buildRepository;  // ✅ Required - actively initialized in aws-storage.ts

  // Create state machine factory
  // ✅ BUSINESS LOGIC: initialize() is called by the caller (GlobalSchedulerService), not here
  // This factory only creates the state machine instance - initialization happens in business logic
  const stateMachineFactory: StateMachineFactory = async (
    cronJob: CronJob
  ): Promise<CronJobStateMachine> => {
    // ✅ Use proper type guard instead of 'as any'
    if (!hasTaskExecutor(storage)) {
      throw new Error('TaskExecutor not available on storage instance');
    }
    
    // TypeScript now knows storage is StorageWithReleaseServices
    const storageWithServices: StorageWithReleaseServices = storage;
    const taskExecutor = storageWithServices.taskExecutor;

    const stateMachine = new CronJobStateMachine(
      cronJob.releaseId,
      cronJobRepo,
      releaseRepo,
      releaseTaskRepo,
      regressionCycleRepo,
      taskExecutor,
      storage,
      platformMappingRepo,
      releaseUploadsRepo,
      buildRepo  // ✅ Required - actively initialized in aws-storage.ts
    );

    // ✅ REMOVED: initialize() call - this is business logic, not factory responsibility
    // The caller (GlobalSchedulerService) will call initialize() after creating the state machine
    return stateMachine;
  };

  return { cronJobRepo, stateMachineFactory };
}
