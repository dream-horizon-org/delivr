/**
 * Cron Job State Machine (Context)
 * 
 * This is the "Context" in State Pattern.
 * It:
 * - Holds the current state
 * - Provides dependencies to states
 * - Delegates execution to current state
 * 
 * States can call: context.getCronJobRepo(), context.getReleaseId(), etc.
 * 
 * Status: ✅ Fully implemented with all 3 states (Kickoff, Regression, Pre-Release)
 */

import { ICronJobState } from './states/cron-job-state.interface';
import { KickoffState } from './states/kickoff.state';
import { RegressionState } from './states/regression.state';
import { PreReleaseState } from './states/pre-release.state';
import { CronJobRepository } from '~models/release/cron-job.repository';
import { ReleaseRepository } from '~models/release/release.repository';
import { ReleaseTaskRepository } from '~models/release/release-task.repository';
import { RegressionCycleRepository } from '~models/release/regression-cycle.repository';
import { ReleaseUploadsRepository } from '~models/release/release-uploads.repository';
import { ReleasePlatformTargetMappingRepository } from '~models/release/release-platform-target-mapping.repository';
import { BuildRepository } from '~models/release/build.repository';
import { TaskExecutor } from '~services/release/task-executor/task-executor';
import { Storage } from '~storage/storage';
import type { StorageWithReleaseServices } from '~types/release/storage-with-services.interface';
import type { BuildNotificationService } from '~services/release/build/build-notification.service';
import type { ReleaseNotificationService } from '~services/release-notification/release-notification.service';
import type { CronicleService } from '~services/cronicle';
import { StageStatus, CronStatus, ReleaseStatus, PauseType, PlatformName } from '~models/release/release.interface';
import type { PlatformVersionMapping } from '~utils/awaiting-manual-build.utils';
// Note: stopCronJob from cron-scheduler is deprecated. Using DB-only updates via cronJobRepo.

export class CronJobStateMachine {
  private currentState: ICronJobState | null = null;

  constructor(
    private releaseId: string,
    private cronJobRepo: CronJobRepository,
    private releaseRepo: ReleaseRepository,
    private releaseTaskRepo: ReleaseTaskRepository,
    private regressionCycleRepo: RegressionCycleRepository,
    private taskExecutor: TaskExecutor,
    private storage: Storage,
    private platformMappingRepo: ReleasePlatformTargetMappingRepository,  // ✅ Required - actively initialized in aws-storage.ts
    private releaseUploadsRepo: ReleaseUploadsRepository,  // ✅ Required - actively initialized in aws-storage.ts
    private buildRepo: BuildRepository  // ✅ Required - actively initialized in aws-storage.ts
  ) {
    // Note: We'll set initial state after async initialization
  }

  /**
   * Initialize state machine with correct starting state
   * 
   * Must be called after constructor (async initialization)
   * 
   * Validates state and detects corrupted states:
   * - Multiple stages IN_PROGRESS (corrupted)
   * - No stage IN_PROGRESS (invalid - cron should not be running)
   */
  async initialize(): Promise<void> {
    const cronJob = await this.cronJobRepo.findByReleaseId(this.releaseId);
    
    if (!cronJob) {
      throw new Error(`Cron job not found for release ${this.releaseId}`);
    }

    // ✅ ARCHIVE CHECK: Do not initialize state machine for archived releases
    const release = await this.releaseRepo.findById(this.releaseId);
    if (release && release.status === ReleaseStatus.ARCHIVED) {
      console.log(
        `[StateMachine] Release ${this.releaseId} is ARCHIVED. ` +
        `Not initializing state machine.`
      );
      
      // Update cron job status to COMPLETED (terminal state, not PAUSED)
      if (cronJob.cronStatus !== CronStatus.COMPLETED) {
        await this.cronJobRepo.update(cronJob.id, {
          cronStatus: CronStatus.COMPLETED,
          cronStoppedAt: new Date()
        });
      }
      
      // NEW ARCHITECTURE: No need to call stopCronJob() - DB status update is sufficient.
      // Global scheduler will skip this release since cronStatus != RUNNING.
      
      // Set currentState to null - no execution should happen
      this.currentState = null;
      return;
    }

    // State validation: Count how many stages are IN_PROGRESS
    const stagesInProgress = [
      cronJob.stage1Status === StageStatus.IN_PROGRESS,
      cronJob.stage2Status === StageStatus.IN_PROGRESS,
      cronJob.stage3Status === StageStatus.IN_PROGRESS
    ].filter(Boolean).length;

    // Corrupted state: Multiple stages IN_PROGRESS
    if (stagesInProgress > 1) {
      throw new Error(
        `Multiple stages IN_PROGRESS for release ${this.releaseId}: ` +
        `Stage 1=${cronJob.stage1Status}, Stage 2=${cronJob.stage2Status}, Stage 3=${cronJob.stage3Status}. ` +
        `This indicates a corrupted state.`
      );
    }

    // Allow 0 stages IN_PROGRESS (supports manual trigger scenarios and paused workflows)
    // If no stage is IN_PROGRESS, determine next state based on completion status
    if (stagesInProgress === 0) {
      console.log(
        `[StateMachine] No stage IN_PROGRESS for release ${this.releaseId}. ` +
        `Determining next state from completion status: ` +
        `Stage 1=${cronJob.stage1Status}, Stage 2=${cronJob.stage2Status}, Stage 3=${cronJob.stage3Status}`
      );
      
      // Determine which stage should be started next
      if (cronJob.stage1Status === StageStatus.PENDING) {
        // Start Stage 1
        this.currentState = new KickoffState(this);
        console.log(`[StateMachine] Initialized with KickoffState (starting from PENDING)`);
      } else if (cronJob.stage2Status === StageStatus.PENDING && cronJob.stage1Status === StageStatus.COMPLETED) {
        // Stage 1 done, Stage 2 ready to start (only if autoTransitionToStage2 is true)
        if (cronJob.autoTransitionToStage2) {
          this.currentState = new RegressionState(this);
          console.log(`[StateMachine] Initialized with RegressionState (starting from PENDING)`);
        } else {
          // Auto-transition disabled - waiting for manual trigger
          console.log(
            `[StateMachine] Stage 2 is PENDING but autoTransitionToStage2 is false. ` +
            `Waiting for manual trigger for release ${this.releaseId}`
          );
          // Set to null to indicate no state should execute
          this.currentState = null as any;
          return;
        }
      } else if (cronJob.stage3Status === StageStatus.PENDING && cronJob.stage2Status === StageStatus.COMPLETED) {
        // ✅ FLEXIBLE REGRESSION: Check for new slots BEFORE transitioning to Stage 3
        // Parse slots (handle both string and object)
        let slots: Array<{ date: string | Date; config: Record<string, unknown> }> = [];
        if (cronJob.upcomingRegressions) {
          if (typeof cronJob.upcomingRegressions === 'string') {
            try {
              slots = JSON.parse(cronJob.upcomingRegressions);
            } catch {
              slots = [];
            }
          } else {
            slots = cronJob.upcomingRegressions;
          }
        }

        const hasSlots = slots.length > 0;

        if (hasSlots) {
          // ✅ SLOTS EXIST: Initialize RegressionState (will auto-reopen Stage 2)
          // This OVERRIDES autoTransitionToStage3 - slots take priority!
          // RegressionState.execute() will check slot time and reopen Stage 2 when time arrives
          
          this.currentState = new RegressionState(this);
          console.log(
            `[StateMachine] Stage 2 COMPLETED but has ${slots.length} new slot(s). ` +
            `Initializing RegressionState (will auto-reopen Stage 2 when slot time arrives).`
          );
          return; // Exit early
        }

        // No slots - proceed with normal Stage 3 transition logic
        if (cronJob.autoTransitionToStage3) {
          this.currentState = new PreReleaseState(this);
          console.log(`[StateMachine] Initialized with PreReleaseState (starting from PENDING)`);
        } else {
          // Auto-transition disabled - waiting for manual trigger
          // ✅ RESTORE pauseType: Should be AWAITING_STAGE_TRIGGER if currently NONE
          // This handles the case where slots were deleted after being added
          // Only update if pauseType is actually NONE (optimization)
          if (cronJob.pauseType === PauseType.NONE) {
            await this.cronJobRepo.update(cronJob.id, {
              pauseType: PauseType.AWAITING_STAGE_TRIGGER
            });
            console.log(
              `[StateMachine] Restored pauseType (NONE → AWAITING_STAGE_TRIGGER) ` +
              `because no slots exist and autoTransitionToStage3 is false.`
            );
          }
          
          console.log(
            `[StateMachine] Stage 3 is PENDING but autoTransitionToStage3 is false. ` +
            `Waiting for manual trigger for release ${this.releaseId}`
          );
          // Set to null to indicate no state should execute
          this.currentState = null as any;
          return;
        }
      } else if (cronJob.stage3Status === StageStatus.COMPLETED) {
        // All stages completed - workflow is done
        console.log(
          `[StateMachine] All stages completed for release ${this.releaseId}. ` +
          `Stage 1=${cronJob.stage1Status}, Stage 2=${cronJob.stage2Status}, Stage 3=${cronJob.stage3Status}`
        );
        this.currentState = null as any;
        return;
      } else {
        // Invalid state - should not happen
        throw new Error(
          `Cannot determine next stage for release ${this.releaseId}: ` +
          `Stage 1=${cronJob.stage1Status}, Stage 2=${cronJob.stage2Status}, Stage 3=${cronJob.stage3Status}. ` +
          `Invalid state combination.`
        );
      }
      return; // Exit early, state is now set
    }

    // Determine which state to start in based on IN_PROGRESS status
    if (cronJob.stage1Status === StageStatus.IN_PROGRESS) {
      this.currentState = new KickoffState(this);
      console.log(`[StateMachine] Initialized with KickoffState for release ${this.releaseId}`);
    } else if (cronJob.stage2Status === StageStatus.IN_PROGRESS) {
      this.currentState = new RegressionState(this);
      console.log(`[StateMachine] Initialized with RegressionState for release ${this.releaseId}`);
    } else if (cronJob.stage3Status === StageStatus.IN_PROGRESS) {
      this.currentState = new PreReleaseState(this);
      console.log(`[StateMachine] Initialized with PreReleaseState for release ${this.releaseId}`);
    }
  }

  /**
   * Execute current state's logic
   * 
   * This is the main entry point called by cron scheduler.
   * It delegates to the current state and handles transitions.
   */
  async execute(): Promise<void> {
    // ✅ ARCHIVE CHECK: Check BEFORE currentState check (covers case where initialize set currentState=null)
    // This ensures we always detect and handle archived releases, even if state machine wasn't initialized
    const release = await this.releaseRepo.findById(this.releaseId);
    if (release && release.status === ReleaseStatus.ARCHIVED) {
      console.log(`[StateMachine] Release ${this.releaseId} is ARCHIVED in execute(). Stopping cron job.`);
      
      // Get cron job and set to COMPLETED (terminal state)
      const cronJob = await this.cronJobRepo.findByReleaseId(this.releaseId);
      if (cronJob && cronJob.cronStatus !== CronStatus.COMPLETED) {
        await this.cronJobRepo.update(cronJob.id, {
          cronStatus: CronStatus.COMPLETED,
          cronStoppedAt: new Date()
        });
        console.log(`[StateMachine] Cron job completed for archived release ${this.releaseId}`);
      }
      
      // NEW ARCHITECTURE: No need to call stopCronJob() - DB status update is sufficient.
      // Global scheduler will skip this release since cronStatus != RUNNING.
      return; // Early exit
    }

    // ✅ PAUSE CHECK: Skip execution if release is paused (any reason)
    // Exception: Allow AWAITING_STAGE_TRIGGER to proceed - RegressionState will check slot time
    // Scheduler keeps running but we don't process - state machine will check again on next tick
    const cronJob = await this.cronJobRepo.findByReleaseId(this.releaseId);
    if (cronJob && cronJob.pauseType && 
        cronJob.pauseType !== PauseType.NONE && 
        cronJob.pauseType !== PauseType.AWAITING_STAGE_TRIGGER) {
      console.log(`[StateMachine] Release ${this.releaseId} paused (${cronJob.pauseType}). Skipping execution.`);
      return; // Early exit - wait for resume/trigger
    }

    if (!this.currentState) {
      console.log(`[StateMachine] No state to execute (auto-transition disabled or workflow complete)`);
      return; // No state to execute - either waiting for manual trigger or workflow complete
    }

    // Execute current state's logic
    await this.currentState.execute();

    // Check if state is complete
    const complete = await this.currentState.isComplete();
    
    if (complete) {
      console.log(`[StateMachine] Stage ${this.currentState.getStage()} is complete. Checking transition...`);
      
      // Let state decide whether to transition
      await this.currentState.transitionToNext();
    }
  }

  /**
   * Set current state
   * 
   * Called by states when transitioning to next state.
   * Example: this.context.setState(new RegressionState(this.context))
   */
  setState(state: ICronJobState): void {
    console.log(`[StateMachine] State changed: ${this.currentState?.getStage()} → ${state.getStage()}`);
    this.currentState = state;
  }

  /**
   * Get current state (for testing/debugging)
   */
  getCurrentState(): ICronJobState | null {
    return this.currentState;
  }

  /**
   * Check if entire workflow is complete
   * 
   * Returns true when:
   * - All stages are COMPLETED
   * - Cron status is COMPLETED
   */
  async isWorkflowComplete(): Promise<boolean> {
    const cronJob = await this.cronJobRepo.findByReleaseId(this.releaseId);
    
    if (!cronJob) {
      return false;
    }

    return (
      cronJob.stage1Status === StageStatus.COMPLETED &&
      cronJob.stage2Status === StageStatus.COMPLETED &&
      cronJob.stage3Status === StageStatus.COMPLETED &&
      cronJob.cronStatus === CronStatus.COMPLETED
    );
  }

  // ========================================================================
  // Dependency Getters (for states to access)
  // ========================================================================

  getCronJobRepo(): CronJobRepository {
    return this.cronJobRepo;
  }

  getReleaseRepo(): ReleaseRepository {
    return this.releaseRepo;
  }

  getReleaseTaskRepo(): ReleaseTaskRepository {
    return this.releaseTaskRepo;
  }

  getRegressionCycleRepo(): RegressionCycleRepository {
    return this.regressionCycleRepo;
  }

  getTaskExecutor(): TaskExecutor {
    return this.taskExecutor;
  }

  getStorage(): Storage {
    return this.storage;
  }

  getReleaseId(): string {
    return this.releaseId;
  }

  async getCronJobId(): Promise<string> {
    const cronJob = await this.cronJobRepo.findByReleaseId(this.releaseId);
    if (!cronJob) {
      throw new Error(`Cron job not found for release ${this.releaseId}`);
    }
    return cronJob.id;
  }

  // ========================================================================
  // Optional Repository Getters (for manual build upload feature)
  // ========================================================================

  /**
   * Get release uploads repository (for manual build upload feature)
   * Returns undefined if not provided during construction
   */
  getReleaseUploadsRepo(): ReleaseUploadsRepository | undefined {
    return this.releaseUploadsRepo;
  }

  /**
   * Get build repository (for manual build handler)
   * Returns undefined if not provided during construction
   */
  getBuildRepo(): BuildRepository | undefined {
    return this.buildRepo;
  }

  /**
   * Get platform mapping repository (for getting release platforms)
   * Returns undefined if not provided during construction
   */
  getPlatformMappingRepo(): ReleasePlatformTargetMappingRepository | undefined {
    return this.platformMappingRepo;
  }

  /**
   * Get platform version mappings from release_platform_target_mapping table.
   * Returns platform + version for each mapping (used for build artifact versioning).
   * 
   * This is a convenience method that states can use instead of duplicating this logic.
   * 
   * @param releaseId - The release ID to get mappings for
   * @returns Array of platform version mappings
   * @throws Error if platform mapping repository is not available or no mappings found
   */
  async getPlatformVersionMappings(releaseId: string): Promise<PlatformVersionMapping[]> {
    const repoNotAvailable = !this.platformMappingRepo;
    
    if (repoNotAvailable) {
      throw new Error('Platform mapping repository not available');
    }
    
    const mappings = await this.platformMappingRepo.getByReleaseId(releaseId);
    const noMappingsFound = !mappings || mappings.length === 0;
    
    if (noMappingsFound) {
      throw new Error('Platform mappings not found for release. Release must have at least one platform configured.');
    }
    
    // Convert to PlatformVersionMapping format
    const platformVersionMappings: PlatformVersionMapping[] = mappings
      .map(m => ({
        platform: m.platform as unknown as PlatformName,
        version: m.version
      }))
      .filter((m): m is PlatformVersionMapping => Object.values(PlatformName).includes(m.platform));
    
    return platformVersionMappings;
  }

  // ========================================================================
  // Service Getters (typed access to storage services - centralizes casting)
  // ========================================================================

  /**
   * Get typed storage with release services.
   * Centralizes the casting so states don't need to cast individually.
   */
  private getTypedStorage(): StorageWithReleaseServices {
    return this.storage as StorageWithReleaseServices;
  }

  /**
   * Get build notification service from storage.
   * Used for sending build artifact notifications.
   */
  getBuildNotificationService(): BuildNotificationService {
    return this.getTypedStorage().buildNotificationService;
  }

  /**
   * Get release notification service from storage.
   * Used for sending stage approval requests and other notifications.
   */
  getReleaseNotificationService(): ReleaseNotificationService {
    return this.getTypedStorage().releaseNotificationService;
  }

  /**
   * Get cronicle service from storage (optional).
   * Used for managing workflow polling jobs.
   * @returns CronicleService or undefined if not configured
   */
  getCronicleService(): CronicleService | undefined {
    return this.getTypedStorage().cronicleService;
  }
}

