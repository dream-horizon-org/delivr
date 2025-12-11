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
import { TaskStage, StageStatus, TaskStatus, CronStatus, ReleaseStatus, PlatformName } from '~models/release/release.interface';
import { getOrderedTasks, canExecuteTask, isTaskRequired, OptionalTaskConfig } from '~utils/task-sequencing';
import { checkIntegrationAvailability } from '~utils/integration-availability.utils';
import { hasSequelize } from '~types/release/api-types';
import { startCronJob, stopCronJob } from '~services/release/cron-job/cron-scheduler';
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
      
      // Stop cron if stage is complete or pending
      if (cronJob.stage1Status === StageStatus.COMPLETED || cronJob.stage1Status === StageStatus.PENDING) {
        stopCronJob(releaseId);
      }
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
        
        // Update cron job status to PAUSED (if not already)
        if (cronJob.cronStatus !== CronStatus.PAUSED) {
          await cronJobRepo.update(cronJob.id, {
            cronStatus: CronStatus.PAUSED,
            cronStoppedAt: new Date()
          });
        }
        
        // Stop cron job
        stopCronJob(releaseId);
        return;  // Early exit
      }
      
      const tasks = await tasksPromise;
      console.log(`[${instanceId}] [KickoffState] Found ${tasks.length} Stage 1 tasks`);

      // ✅ MANUAL BUILD CHECK: Process any tasks waiting for manual builds
      if (release.hasManualBuildUpload) {
        const releaseUploadsRepo = this.context.getReleaseUploadsRepo?.();
        
        if (releaseUploadsRepo) {
          // Get release platforms
          const platforms = await this.getReleasePlatforms(release);
          
          const manualBuildResults = await processAwaitingManualBuildTasks(
            releaseId,
            tasks,
            true,
            platforms,
            releaseUploadsRepo,
            releaseTaskRepo
          );

          // Log results
          for (const [taskId, result] of manualBuildResults) {
            if (result.consumed) {
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
          
          // If any task was completed, re-fetch tasks to get updated statuses
          const anyCompleted = Array.from(manualBuildResults.values()).some(r => r.consumed);
          if (anyCompleted) {
            console.log(`[${instanceId}] [KickoffState] Some tasks completed. Re-fetching task list.`);
            // Continue with the rest of the execution - tasks will be re-checked
          }
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

      // Execute tasks
      for (const task of orderedTasks) {
        if (!task.taskType) continue;
        
        // Single check handles all validation (required, dependencies, time, status)
        const canExecute = canExecuteTask(
          task,
          tasks,
          TaskStage.KICKOFF,
          config,
          (t) => this.isTimeToExecuteTask(t.taskType, release, config)
        );
        
        if (!canExecute) {
          console.log(`[${instanceId}] [KickoffState] Cannot execute task yet: ${task.taskType}`);
          continue;
        }
        
        console.log(`[${instanceId}] [KickoffState] Executing task: ${task.taskType} (${task.id})`);
        
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

      // Stop Stage 1 cron
      stopCronJob(releaseId);

      // Set next state
      const { RegressionState } = await import('./regression.state');
      this.context.setState(new RegressionState(this.context));

      // Start Stage 2 cron (State Machine will handle RegressionState execution)
      startCronJob(releaseId, async () => {
        await this.context.execute();
      });

      console.log(`[KickoffState] ✅ Transitioned: Stage 1 → Stage 2 (automatic)`);

    } else {
      // ⏸️ MANUAL MODE → Stop cron, wait for manual trigger
      console.log(`[KickoffState] Stage 1 complete. Waiting for manual Stage 2 trigger (autoTransitionToStage2 = false)`);

      // Update database: Mark Stage 1 COMPLETED, set cron to PAUSED
      await cronJobRepo.update(cronJob.id, {
        stage1Status: StageStatus.COMPLETED,
        cronStatus: CronStatus.PAUSED
        // Note: stage2Status stays PENDING
      });

      // Stop the cron job (no need to keep polling)
      stopCronJob(releaseId);

      console.log(
        `[KickoffState] ⏸️ Stage 1 complete. Cron job stopped. ` +
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
   * Get release platforms from platform mappings
   */
  private async getReleasePlatforms(release: import('~models/release/release.interface').Release): Promise<PlatformName[]> {
    // Try to get from storage if available
    const storageInstance = this.context.getStorage();
    if (hasSequelize(storageInstance)) {
      const platformMappingRepo = this.context.getPlatformMappingRepo?.();
      if (platformMappingRepo) {
        const mappings = await platformMappingRepo.getByReleaseId(release.id);
        if (mappings && mappings.length > 0) {
          // Map to PlatformName enum values (mappings.platform is compatible with PlatformName)
          const platforms = mappings
            .map(m => m.platform as unknown as PlatformName)
            .filter((p): p is PlatformName => Object.values(PlatformName).includes(p));
          return platforms;
        }
      }
    }
    
    // No platform mappings found - this is a configuration error
    throw new Error('Platform mappings not found for release. Release must have at least one platform configured.');
  }

  /**
   * Check if it's time to execute a specific task type
   * 
   * Some tasks have time constraints:
   * - PRE_KICK_OFF_REMINDER: Only at kickoff reminder time
   * - FORK_BRANCH: Only at branch fork time
   */
  private isTimeToExecuteTask(taskType: string, release: import('~models/release/release.interface').Release, _config: OptionalTaskConfig): boolean {
    // Import time check functions
    const { isKickOffReminderTime, isBranchForkTime } = require('~utils/time-utils');
    const { TaskType } = require('~models/release/release.interface');
    
    // Check task-specific time constraints
    switch (taskType) {
      case TaskType.PRE_KICK_OFF_REMINDER:
        return isKickOffReminderTime(release);
      
      case TaskType.FORK_BRANCH:
        return isBranchForkTime(release);
      
      default:
        // Most tasks can execute anytime
        return true;
    }
  }
}

