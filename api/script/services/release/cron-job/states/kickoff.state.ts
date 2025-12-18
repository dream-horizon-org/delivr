/**
 * Kickoff State (Stage 1)
 * 
 * Handles Stage 1 (Kickoff) cron job execution.
 * 
 * Responsibilities:
 * - Execute Stage 1 tasks in order
 * - Respect time constraints (kickoff reminder, branch fork)
 * - Detect when all tasks are complete
 * - Handle automatic vs manual transition to Stage 2
 * 
 * Status: ✅ Fully implemented (migrated from kickoff-cron-job.ts)
 */

import { ICronJobState } from './cron-job-state.interface';
import type { CronJobStateMachine } from '../cron-job-state-machine';
import { TaskStage, StageStatus, TaskStatus, CronStatus, ReleaseStatus, PlatformName, PauseType, type Release } from '~models/release/release.interface';
import { getOrderedTasks, canExecuteTask, getTaskBlockReason, isTaskRequired, OptionalTaskConfig } from '~utils/task-sequencing';
import { checkIntegrationAvailability } from '~utils/integration-availability.utils';
import { hasSequelize } from '~types/release/api-types';
import { processAwaitingManualBuildTasks } from '~utils/awaiting-manual-build.utils';

export class KickoffState implements ICronJobState {
  constructor(private context: CronJobStateMachine) {}

  /**
   * Get unique instance ID for logging
   */
  private getInstanceId(): string {
    return `kickoff-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Execute Stage 1 logic
   * 
   * This method contains the core Stage 1 execution logic,
   * extracted from executeKickoffCronJob().
   */
  async execute(): Promise<void> {
    const instanceId = this.getInstanceId();
    const releaseId = this.context.getReleaseId();
    const cronJobRepo = this.context.getCronJobRepo();
    const releaseRepo = this.context.getReleaseRepo();
    const releaseTaskRepo = this.context.getReleaseTaskRepo();
    const taskExecutor = this.context.getTaskExecutor();

    console.log(`[${instanceId}] [KickoffState] Executing Stage 1 for release ${releaseId}`);

    // Get cron job
    const cronJob = await cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      console.log(`[${instanceId}] [KickoffState] Cron job not found for release ${releaseId}`);
      return;
    }

    // Verify Stage 1 is active
    if (cronJob.stage1Status !== StageStatus.IN_PROGRESS) {
      console.log(`[${instanceId}] [KickoffState] Stage 1 not IN_PROGRESS (status: ${cronJob.stage1Status})`);
      
      // NEW ARCHITECTURE: No manual timer management needed.
      // Global scheduler will skip this release automatically based on DB status.
      return;
    }

    try {
      // Start queries in parallel (lazy await pattern for early exit optimization)
      const releasePromise = releaseRepo.findById(releaseId);
      const tasksPromise = releaseTaskRepo.findByReleaseIdAndStage(releaseId, TaskStage.KICKOFF);
      
      // Await in order of validation checks (enables early exit)
      const release = await releasePromise;
      if (!release) {
        console.log(`[${instanceId}] [KickoffState] Release not found: ${releaseId}`);
        return;  // Early exit - tasks query still running but we don't wait
      }

      // ✅ ARCHIVE CHECK: Stop execution if release is archived
      if (release.status === ReleaseStatus.ARCHIVED) {
        console.log(`[${instanceId}] [KickoffState] Release is ARCHIVED. Stopping execution.`);
        
        // Update cron job status to COMPLETED (terminal state, not PAUSED)
        if (cronJob.cronStatus !== CronStatus.COMPLETED) {
          await cronJobRepo.update(cronJob.id, {
            cronStatus: CronStatus.COMPLETED,
            cronStoppedAt: new Date()
          });
        }
        
        // NEW ARCHITECTURE: DB status update is sufficient.
        // Global scheduler will skip this release since cronStatus != RUNNING.
        return;  // Early exit
      }
      
      const tasks = await tasksPromise;
      console.log(`[${instanceId}] [KickoffState] Found ${tasks.length} Stage 1 tasks`);

      // ✅ MANUAL BUILD CHECK: Process any tasks waiting for manual builds
      if (release.hasManualBuildUpload) {
        const releaseUploadsRepo = this.context.getReleaseUploadsRepo?.();
        
        if (releaseUploadsRepo) {
          // Get platform version mappings (includes version for each platform)
          const platformVersionMappings = await this.context.getPlatformVersionMappings(release.id);
          
          // Get build repository for creating build records
          const buildRepo = this.context.getBuildRepo?.();
          
          const manualBuildResults = await processAwaitingManualBuildTasks(
            releaseId,
            tasks,
            true,
            platformVersionMappings,
            releaseUploadsRepo,
            releaseTaskRepo,
            buildRepo
          );

          // Track which tasks were just completed by manual build handler
          const justCompletedTaskIds = new Set<string>();
          
          // Log results
          for (const [taskId, result] of manualBuildResults) {
            if (result.consumed) {
              justCompletedTaskIds.add(taskId);
              console.log(
                `[${instanceId}] [KickoffState] Manual build consumed for task ${taskId}. ` +
                `Task is now COMPLETED.`
              );
            } else if (result.checked && !result.allReady) {
              console.log(
                `[${instanceId}] [KickoffState] Task ${taskId} still waiting for uploads. ` +
                `Missing: [${result.missingPlatforms.join(', ')}]`
              );
            }
          }
          
          // If any task was completed, log it (no re-fetch needed - we track completed IDs)
          if (justCompletedTaskIds.size > 0) {
            console.log(`[${instanceId}] [KickoffState] ${justCompletedTaskIds.size} task(s) completed via manual uploads.`);
          }
          
          // Store for later use in task loop
          (this as any)._justCompletedTaskIds = justCompletedTaskIds;
        }
      }

      // Check integration availability - use injected storage from context
      const storageInstance = this.context.getStorage();
      if (!hasSequelize(storageInstance)) {
        throw new Error('Sequelize storage required for integration availability check');
      }
      
      const integrationAvailability = await checkIntegrationAvailability(
        release.releaseConfigId,
        storageInstance.sequelize
      );

      // Build task config
      const config: OptionalTaskConfig = {
        cronConfig: cronJob.cronConfig || {},
        hasProjectManagementIntegration: integrationAvailability.hasProjectManagementIntegration,
        hasTestPlatformIntegration: integrationAvailability.hasTestPlatformIntegration
      };

      // Get ordered tasks
      const orderedTasks = getOrderedTasks(tasks, TaskStage.KICKOFF);
      console.log(`[${instanceId}] [KickoffState] Processing ${orderedTasks.length} tasks`);
      
      // Get tasks that were just completed by manual build handler (if any)
      const justCompletedTaskIds: Set<string> = (this as any)._justCompletedTaskIds ?? new Set();

      // Execute tasks
      for (const task of orderedTasks) {
        if (!task.taskType) continue;
        
        // Skip logging for tasks that were just completed by manual build handler
        // (their status in our array is stale but DB is updated)
        if (justCompletedTaskIds.has(task.id)) {
          continue;
        }
        
        // Single check handles all validation (required, dependencies, time, status)
        const blockReason = getTaskBlockReason(
          task,
          tasks,
          TaskStage.KICKOFF,
          config,
          (t) => this.isTimeToExecuteTask(t.taskType, release, config)
        );
        
        const canExecute = blockReason === 'EXECUTABLE';
        if (!canExecute) {
          // Only log non-completed tasks to reduce noise
          const isAlreadyDone = blockReason === 'ALREADY_COMPLETED' || blockReason === 'ALREADY_SKIPPED';
          if (!isAlreadyDone) {
            console.log(`[${instanceId}] [KickoffState] Task ${task.taskType} blocked: ${blockReason}`);
          }
          continue;
        }
        
        console.log(`[${instanceId}] [KickoffState] Executing task: ${task.taskType} (${task.id})`);
        
        // Add special logging for FORK_BRANCH catch-up execution
        if (task.taskType === 'FORK_BRANCH') {
          const kickOffDate = release.kickOffDate ? new Date(release.kickOffDate) : null;
          const now = new Date();
          
          if (kickOffDate && kickOffDate.getTime() < now.getTime()) {
            const lateMs = now.getTime() - kickOffDate.getTime();
            const lateMinutes = Math.round(lateMs / 60000);
            
            console.log(
              `[${instanceId}] [KickoffState] ⚠️ FORK_BRANCH executing in CATCH-UP mode. ` +
              `Scheduled: ${kickOffDate.toISOString()}, Now: ${now.toISOString()}, ` +
              `Late by: ${lateMinutes} minute(s)`
            );
          } else if (kickOffDate) {
            console.log(
              `[${instanceId}] [KickoffState] ✅ FORK_BRANCH executing ON-TIME. ` +
              `Scheduled: ${kickOffDate.toISOString()}`
            );
          }
        }
        
        try {
          await taskExecutor.executeTask({
            releaseId,
            tenantId: release.tenantId,
            release,
            task
          });
        } catch (error) {
          console.error(`[${instanceId}] [KickoffState] Error executing task ${task.taskType}:`, error);
        }
      }

      console.log(`[${instanceId}] [KickoffState] Stage 1 execution cycle complete`);

    } catch (error) {
      console.error(`[${instanceId}] [KickoffState] Error during execution:`, error);
    }
  }

  /**
   * Check if Stage 1 is complete
   * 
   * Returns true when all REQUIRED tasks are COMPLETED.
   * Optional tasks that aren't required don't block completion.
   */
  async isComplete(): Promise<boolean> {
    const releaseId = this.context.getReleaseId();
    const releaseTaskRepo = this.context.getReleaseTaskRepo();
    const cronJobRepo = this.context.getCronJobRepo();
    const releaseRepo = this.context.getReleaseRepo();

    // Get tasks
    const tasks = await releaseTaskRepo.findByReleaseIdAndStage(releaseId, TaskStage.KICKOFF);
    
    console.log(`[KickoffState] isComplete() checking ${tasks.length} tasks`);

    // If no tasks, consider complete
    if (tasks.length === 0) {
      console.log(`[KickoffState] isComplete() = true (no tasks)`);
      return true;
    }

    // Get integration availability to determine which tasks are required
    const storageInstance = this.context.getStorage();
    if (!hasSequelize(storageInstance)) {
      console.log(`[KickoffState] isComplete() = false (no Sequelize)`);
      return false;
    }

    const release = await releaseRepo.findById(releaseId);
    const cronJob = await cronJobRepo.findByReleaseId(releaseId);
    
    if (!release || !cronJob) {
      console.log(`[KickoffState] isComplete() = false (release/cronJob not found)`);
      return false;
    }

    const integrationAvailability = await checkIntegrationAvailability(
      release.releaseConfigId,
      storageInstance.sequelize
    );

    // Build task config to determine which tasks are required
    const config: OptionalTaskConfig = {
      cronConfig: cronJob.cronConfig || {},
      hasProjectManagementIntegration: integrationAvailability.hasProjectManagementIntegration,
      hasTestPlatformIntegration: integrationAvailability.hasTestPlatformIntegration
    };

    // Check if all REQUIRED tasks are completed
    // Optional tasks that aren't required don't block completion
    const allRequiredComplete = tasks.every(task => {
      const taskRequired = isTaskRequired(task.taskType, config);
      
      if (!taskRequired) {
        // Optional task - doesn't block completion
        return true;
      }
      
      // Required task - must be COMPLETED
      return task.taskStatus === TaskStatus.COMPLETED;
    });

    console.log(`[KickoffState] isComplete() = ${allRequiredComplete}`);
    return allRequiredComplete;
  }

  /**
   * Transition to next state (Stage 2 - Regression)
   * 
   * This method handles the conditional transition logic:
   * - If autoTransitionToStage2 is true → Transition to Stage 2
   * - If autoTransitionToStage2 is false → Stay in Stage 1 (manual mode)
   */
  async transitionToNext(): Promise<void> {
    const releaseId = this.context.getReleaseId();
    const cronJobRepo = this.context.getCronJobRepo();

    // Get cron job
    const cronJob = await cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      console.log(`[KickoffState] Cannot transition: Cron job not found for release ${releaseId}`);
      return;
    }

    // Check if automatic transition is enabled
    const autoTransitionToStage2 = cronJob.autoTransitionToStage2 === true;

    if (autoTransitionToStage2) {
      // ✅ AUTOMATIC TRANSITION → Stage 2
      console.log(`[KickoffState] Stage 1 complete. Auto-transitioning to Stage 2...`);

      // Update database: Mark Stage 1 COMPLETED, Stage 2 IN_PROGRESS
      await cronJobRepo.update(cronJob.id, {
        stage1Status: StageStatus.COMPLETED,
        stage2Status: StageStatus.IN_PROGRESS
      });

      // NEW ARCHITECTURE: No manual timer management needed.
      // Global scheduler will pick up the new stage status on next tick.

      // Set next state (will be used on next scheduler tick)
      const { RegressionState } = await import('./regression.state');
      this.context.setState(new RegressionState(this.context));

      console.log(`[KickoffState] ✅ Transitioned: Stage 1 → Stage 2 (automatic)`);
      console.log(`[KickoffState] Stage 2 will start on next scheduler tick`);

    } else {
      // ⏸️ MANUAL MODE → Set pauseType, keep scheduler running (state machine will skip)
      console.log(`[KickoffState] Stage 1 complete. Waiting for manual Stage 2 trigger (autoTransitionToStage2 = false)`);

      // Update database: Mark Stage 1 COMPLETED, set pauseType to AWAITING_STAGE_TRIGGER
      // Note: Scheduler keeps running but state machine will skip execution
      await cronJobRepo.update(cronJob.id, {
        stage1Status: StageStatus.COMPLETED,
        pauseType: PauseType.AWAITING_STAGE_TRIGGER
        // Note: stage2Status stays PENDING, cronStatus stays RUNNING
      });

      // DON'T stop the cron job - state machine will check pauseType and skip
      // This approach works with both setInterval and Cronicle (external scheduler)

      console.log(
        `[KickoffState] ⏸️ Stage 1 complete. Paused (AWAITING_STAGE_TRIGGER). ` +
        `Use POST /tenants/:tenantId/releases/${releaseId}/trigger-regression-testing to start Stage 2.`
      );

      // DON'T call setState() - user must manually trigger Stage 2 via API
    }
  }

  /**
   * Get the stage this state represents
   */
  getStage(): TaskStage {
    return TaskStage.KICKOFF;
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================


  /**
   * Check if it's time to execute a specific task type
   * 
   * Some tasks have time constraints:
   * - FORK_BRANCH: Only at branch fork time
   * 
   * Note: PRE_KICK_OFF_REMINDER removed - notifications handled by event system
   */
  private isTimeToExecuteTask(taskType: string, release: Release, _config: OptionalTaskConfig): boolean {
    // Import time check functions
    const { isBranchForkTime } = require('~utils/time-utils');
    const { TaskType } = require('~models/release/release.interface');
    
    // Check task-specific time constraints
    switch (taskType) {
      
      case TaskType.FORK_BRANCH:
        return isBranchForkTime(release);
      
      default:
        // Most tasks can execute anytime
        return true;
    }
  }
}

