/**
 * RegressionState (Stage 2)
 * 
 * Handles Stage 2 (Regression) execution:
 * - Detects regression slot times
 * - Creates cycles on-demand when slot time arrives
 * - Executes Stage 2 tasks for current cycle
 * - Detects cycle completion
 * - Detects Stage 2 completion (all cycles done)
 * - Transitions to Stage 3 when Stage 2 completes
 * 
 * Extracted from: regression-cron-job.ts
 */

import { ICronJobState } from './cron-job-state.interface';
import { CronJobStateMachine } from '../cron-job-state-machine';
import { StageStatus, TaskStage, RegressionCycleStatus, CronStatus, ReleaseStatus, PauseType } from '~models/release/release.interface';
import { hasSequelize } from '~types/release/api-types';
import { checkIntegrationAvailability } from '~utils/integration-availability.utils';
import { createRegressionCycleWithTasks } from '~utils/regression-cycle-creation';
import { getOrderedTasks, getTaskBlockReason, OptionalTaskConfig, isTaskRequired } from '~utils/task-sequencing';
import { PreReleaseState } from './pre-release.state';
import { processAwaitingManualBuildTasks } from '~utils/awaiting-manual-build.utils';

export class RegressionState implements ICronJobState {
  constructor(public context: CronJobStateMachine) {}

  private getInstanceId(): string {
    return `regression-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  getStage(): TaskStage {
    return TaskStage.REGRESSION;
  }

  async execute(): Promise<void> {
    const instanceId = this.getInstanceId();
    const releaseId = this.context.getReleaseId();
    const cronJobRepo = this.context.getCronJobRepo();
    const releaseRepo = this.context.getReleaseRepo();
    const releaseTaskRepo = this.context.getReleaseTaskRepo();
    const regressionCycleRepo = this.context.getRegressionCycleRepo();
    const taskExecutor = this.context.getTaskExecutor();

    console.log(`[${instanceId}] [RegressionState] Executing Stage 2 for release ${releaseId}`);

    try {
      // Start queries in parallel (lazy await pattern for early exit optimization)
      const cronJobPromise = cronJobRepo.findByReleaseId(releaseId);
      const releasePromise = releaseRepo.findById(releaseId);
      
      // Await in order of validation checks (enables early exit)
      const cronJob = await cronJobPromise;
      if (!cronJob) {
        console.log(`[${instanceId}] [RegressionState] Cron job not found.`);
        return;  // Early exit
      }

      // ✅ CRITICAL: Block execution if Stage 3 has started
      // Once Stage 3 starts, no more regression cycles can be created
      const isStage3Started = cronJob.stage3Status === StageStatus.IN_PROGRESS || 
                              cronJob.stage3Status === StageStatus.COMPLETED;
      
      if (isStage3Started) {
        console.log(`[${instanceId}] [RegressionState] Stage 3 already started (${cronJob.stage3Status}). Cannot execute Stage 2.`);
        return;  // Early exit
      }

      // ✅ FLEXIBLE REGRESSION: Allow both IN_PROGRESS and COMPLETED
      // Stage 2 can be reopened if COMPLETED but has new slots added
      const isStage2InProgress = cronJob.stage2Status === StageStatus.IN_PROGRESS;
      const isStage2Completed = cronJob.stage2Status === StageStatus.COMPLETED;
      
      if (!isStage2InProgress && !isStage2Completed) {
        console.log(`[${instanceId}] [RegressionState] Stage 2 not in valid state (${cronJob.stage2Status}).`);
        return;  // Early exit
      }

      // ✅ AUTO-REOPEN: If Stage 2 is COMPLETED but has new slots, reopen it
      if (isStage2Completed) {
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
          // Reopen Stage 2 - new slots have been added!
          console.log(`[${instanceId}] [RegressionState] Stage 2 COMPLETED but has ${slots.length} new slot(s). Reopening Stage 2...`);
          
          await cronJobRepo.update(cronJob.id, {
            stage2Status: StageStatus.IN_PROGRESS,
            cronStatus: CronStatus.RUNNING
          });
          
          console.log(`[${instanceId}] [RegressionState] ✅ Stage 2 reopened to IN_PROGRESS`);
        } else {
          // No slots - nothing to do
          console.log(`[${instanceId}] [RegressionState] Stage 2 COMPLETED and no slots. Nothing to execute.`);
          return;  // Early exit
        }
      }

      const release = await releasePromise;
      if (!release) {
        console.log(`[${instanceId}] [RegressionState] Release not found: ${releaseId}`);
        return;  // Early exit
      }

      // ✅ ARCHIVE CHECK: Stop execution if release is archived
      if (release.status === ReleaseStatus.ARCHIVED) {
        console.log(`[${instanceId}] [RegressionState] Release is ARCHIVED. Stopping execution.`);
        
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
      
      // Fetch integration availability once and reuse - use injected storage from context
      const storageInstance = this.context.getStorage();
      if (!hasSequelize(storageInstance)) {
        throw new Error('Sequelize storage required for integration availability check');
      }
      
      // Try to fetch integration availability, use defaults if config not found (for tests)
      let integrationAvailability: { hasProjectManagementIntegration: boolean; hasTestPlatformIntegration: boolean };
      try {
        integrationAvailability = await checkIntegrationAvailability(
          release.releaseConfigId,
          storageInstance.sequelize
        );
      } catch (error) {
        console.warn(`[${instanceId}] [RegressionState] Could not check integration availability: ${error}. Using defaults.`);
        integrationAvailability = {
          hasProjectManagementIntegration: false,
          hasTestPlatformIntegration: false
        };
      }

      // Check for regression slots that need cycle creation
      // 🚀 Optimization: Fetch latestCycle once and reuse (eliminates duplicate query)
      let latestCycle = await regressionCycleRepo.findLatest(releaseId);

      // Check if there are any upcoming regressions to process
      // Note: We no longer use isRegressionSlotTime() which checked 60-second window.
      // Now we check if slot time has passed (even if hours ago) as long as before targetReleaseDate.
      if (cronJob.upcomingRegressions) {
        let slots: Array<{ date: string | Date; config: Record<string, unknown> }>;
        if (typeof cronJob.upcomingRegressions === 'string') {
          try {
            slots = JSON.parse(cronJob.upcomingRegressions) as Array<{ date: string | Date; config: Record<string, unknown> }>;
          } catch {
            console.log(`[${instanceId}] [RegressionState] Failed to parse upcomingRegressions`);
            slots = [];
          }
        } else {
          slots = cronJob.upcomingRegressions;
        }

        const now = new Date();
        const targetReleaseDate = release.targetReleaseDate ? new Date(release.targetReleaseDate) : null;
        const LATE_WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

        const canCreateNewCycle = !latestCycle || latestCycle.status === RegressionCycleStatus.DONE;

        if (canCreateNewCycle) {
          // Find all past slots that should be executed (before targetReleaseDate)
          const executableSlots = slots
            .map(slot => {
              const slotTime = new Date(slot.date);
              if (isNaN(slotTime.getTime())) {
                return null;
              }
              
              // Check if slot time has passed
              const isPast = slotTime.getTime() <= now.getTime();
              
              if (!isPast) {
                return null; // Future slot, skip
              }
              
              // Check if we're past the targetReleaseDate deadline
              if (targetReleaseDate && now.getTime() >= targetReleaseDate.getTime()) {
                // Don't execute - deadline has passed
                console.warn(
                  `[${instanceId}] [RegressionState] ⚠️ Skipping slot past targetReleaseDate. ` +
                  `Slot: ${slotTime.toISOString()}, Deadline: ${targetReleaseDate.toISOString()}, Now: ${now.toISOString()}`
                );
                return null;
              }
              
              // Slot is executable (past time but before deadline)
              const lateMs = now.getTime() - slotTime.getTime();
              
              return { slot, slotTime, lateMs };
            })
            .filter((s): s is { slot: typeof slots[0]; slotTime: Date; lateMs: number } => s !== null)
            .sort((a, b) => a.slotTime.getTime() - b.slotTime.getTime()); // Oldest first

          if (executableSlots.length > 0) {
            const { slot, slotTime, lateMs } = executableSlots[0];
            
            // Log warning if executing more than 5 minutes late
            if (lateMs > LATE_WARNING_THRESHOLD_MS) {
              const lateMinutes = Math.floor(lateMs / (60 * 1000));
              console.warn(
                `[${instanceId}] [RegressionState] ⚠️ Executing regression slot ${lateMinutes} minutes late. ` +
                `Scheduled: ${slotTime.toISOString()}, Now: ${now.toISOString()}`
              );
            }
            
            console.log(`[${instanceId}] [RegressionState] Creating regression cycle for slot at ${slotTime.toISOString()}`);
            
            await createRegressionCycleWithTasks(
              regressionCycleRepo,
              releaseTaskRepo,
              releaseRepo,
              {
                releaseId,
                accountId: release.createdByAccountId || 'system',
                cronConfig: {
                  automationBuilds: (slot.config.automationBuilds === true),
                  automationRuns: (slot.config.automationRuns === true)
                },
                hasTestPlatformIntegration: integrationAvailability.hasTestPlatformIntegration
              }
            );

            const remainingSlots = slots
              .filter(s => {
                const sTime = new Date(s.date);
                if (isNaN(sTime.getTime())) {
                  return false;
                }
                return sTime.getTime() !== slotTime.getTime();
              })
              .map(s => ({
                date: s.date instanceof Date ? s.date : new Date(s.date),
                config: s.config
              }));

            await cronJobRepo.update(cronJob.id, {
              upcomingRegressions: remainingSlots.length > 0 ? remainingSlots : null
            });

            console.log(`[${instanceId}] [RegressionState] Regression cycle created. Remaining slots: ${remainingSlots.length}`);
            
            // ⚡ Refetch latestCycle ONLY if we created a new one
            latestCycle = await regressionCycleRepo.findLatest(releaseId);
          }
        } else {
          console.log(`[${instanceId}] [RegressionState] Latest cycle ${latestCycle?.id} is ${latestCycle?.status}, waiting for completion`);
        }
      }

      // ✅ Reuse latestCycle (already fetched above, or refetched if cycle was created)
      
      if (!latestCycle) {
        console.log(`[${instanceId}] [RegressionState] No regression cycle found. Waiting for slot time...`);
        return;
      }

      // Check if cycle is complete
      const cycleTasks = await releaseTaskRepo.findByRegressionCycleId(latestCycle.id);

      // ✅ MANUAL BUILD CHECK: Process any tasks waiting for manual builds
      if (release.hasManualBuildUpload) {
        const releaseUploadsRepo = this.context.getReleaseUploadsRepo?.();
        
        if (releaseUploadsRepo) {
          // Get platform version mappings (includes version for each platform)
          const platformVersionMappings = await this.context.getPlatformVersionMappings(release.id);
          
          // Add cycleId to tasks for proper linking
          const tasksWithCycle = cycleTasks.map(t => ({
            ...t,
            cycleId: latestCycle.id
          }));
          
          // Get build repository for creating build records
          const buildRepo = this.context.getBuildRepo?.();
          
          const manualBuildResults = await processAwaitingManualBuildTasks(
            releaseId,
            tasksWithCycle,
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
                `[${instanceId}] [RegressionState] Manual build consumed for task ${taskId}. ` +
                `Task is now COMPLETED. Cycle: ${latestCycle.id}`
              );
            } else if (result.checked && !result.allReady) {
              console.log(
                `[${instanceId}] [RegressionState] Task ${taskId} still waiting for uploads. ` +
                `Missing: [${result.missingPlatforms.join(', ')}]`
              );
            }
          }
          
          // Store for later use
          (this as any)._justCompletedTaskIds = justCompletedTaskIds;
        }
      }
      
      // Get tasks that were just completed by manual build handler (if any)
      const justCompletedTaskIds: Set<string> = (this as any)._justCompletedTaskIds ?? new Set();
      
      const allCycles = await regressionCycleRepo.findByReleaseId(releaseId);
      const cycleIndex = allCycles.findIndex(c => c.id === latestCycle.id);
      const isSubsequentSlot = cycleIndex > 0;

      const config: OptionalTaskConfig = {
        cronConfig: cronJob.cronConfig || {},
        hasProjectManagementIntegration: integrationAvailability.hasProjectManagementIntegration,
        hasTestPlatformIntegration: integrationAvailability.hasTestPlatformIntegration,
        isSubsequentSlot
      };

      const allCycleTasksComplete = cycleTasks.every(task => {
        if (!task.taskType) return true;
        
        // Tasks just completed by manual build handler are considered complete
        // (their status in our array is stale but DB is updated)
        if (justCompletedTaskIds.has(task.id)) {
          return true;
        }
        
        const required = isTaskRequired(task.taskType, config);
        if (!required) {
          return true;
        }
        
        const isCompleted = task.taskStatus === 'COMPLETED';
        if (!isCompleted) {
          console.log(`[${instanceId}] [RegressionState] Cycle task ${task.taskType} not complete: status=${task.taskStatus}`);
        }
        return isCompleted;
      });

      if (allCycleTasksComplete) {
        console.log(`[${instanceId}] [RegressionState] All tasks complete for cycle ${latestCycle.id}`);
        
        await regressionCycleRepo.update(latestCycle.id, {
          status: RegressionCycleStatus.DONE
        });
      } else {
        // Update cycle to IN_PROGRESS if it's still NOT_STARTED
        if (latestCycle.status === RegressionCycleStatus.NOT_STARTED) {
          await regressionCycleRepo.update(latestCycle.id, {
            status: RegressionCycleStatus.IN_PROGRESS
          });
          console.log(`[${instanceId}] [RegressionState] Cycle ${latestCycle.id} status updated to IN_PROGRESS`);
        }
        
        // Execute pending tasks
        const orderedTasks = getOrderedTasks(cycleTasks, TaskStage.REGRESSION);
        
        for (const task of orderedTasks) {
          if (!task.taskType) continue;
          
          // Skip tasks that were just completed by manual build handler
          if (justCompletedTaskIds.has(task.id)) {
            continue;
          }
          
          // Single check handles all validation (required, dependencies, status)
          const blockReason = getTaskBlockReason(task, cycleTasks, TaskStage.REGRESSION, config);
          const canExecute = blockReason === 'EXECUTABLE';
          if (!canExecute) {
            // Only log non-completed tasks to reduce noise
            const isAlreadyDone = blockReason === 'ALREADY_COMPLETED' || blockReason === 'ALREADY_SKIPPED';
            if (!isAlreadyDone) {
              console.log(`[${instanceId}] [RegressionState] Task ${task.taskType} blocked: ${blockReason}`);
            }
            continue;
          }
          
          console.log(`[${instanceId}] [RegressionState] Executing task: ${task.taskType} (${task.id})`);
          
          try {
            await taskExecutor.executeTask({
              releaseId,
              tenantId: release.tenantId,
              release,
              task
            });
          } catch (error) {
            console.error(`[${instanceId}] [RegressionState] Error executing task ${task.taskType}:`, error);
          }
        }
      }

    } catch (error) {
      console.error(`[${instanceId}] [RegressionState] Error during execution:`, error);
    }
  }

  async isComplete(): Promise<boolean> {
    const releaseId = this.context.getReleaseId();
    const cronJobRepo = this.context.getCronJobRepo();
    const regressionCycleRepo = this.context.getRegressionCycleRepo();

    // 🚀 Start both queries immediately (lazy await pattern for early exit optimization)
    const cronJobPromise = cronJobRepo.findByReleaseId(releaseId);
    const cyclesPromise = regressionCycleRepo.findByReleaseId(releaseId);

    // ⚡ Await in order (enables early exit)
    const cronJob = await cronJobPromise;
    if (!cronJob) return false;  // Early exit - cycles query still running but we don't wait

    const allCycles = await cyclesPromise;
    const allCyclesDone = allCycles.every(cycle => cycle.status === RegressionCycleStatus.DONE);

    // Check if no upcoming regressions
    const hasUpcomingRegressions = cronJob.upcomingRegressions && 
      (typeof cronJob.upcomingRegressions === 'string' 
        ? JSON.parse(cronJob.upcomingRegressions).length > 0
        : cronJob.upcomingRegressions.length > 0);

    const isComplete = allCyclesDone && !hasUpcomingRegressions;
    
    console.log(`[RegressionState] isComplete() = ${isComplete} (cycles: ${allCycles.length}, all done: ${allCyclesDone}, upcoming: ${hasUpcomingRegressions})`);
    
    return isComplete;
  }

  async transitionToNext(): Promise<void> {
    const releaseId = this.context.getReleaseId();
    const cronJobRepo = this.context.getCronJobRepo();

    const cronJob = await cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      console.log(`[RegressionState] Cannot transition: Cron job not found for release ${releaseId}`);
      return;
    }

    const autoTransitionToStage3 = cronJob.autoTransitionToStage3 === true;

    if (autoTransitionToStage3) {
      console.log(`[RegressionState] Stage 2 complete. Auto-transitioning to Stage 3...`);
      
      await cronJobRepo.update(cronJob.id, {
        stage2Status: StageStatus.COMPLETED,
        stage3Status: StageStatus.IN_PROGRESS
      });

      // NEW ARCHITECTURE: No manual timer management needed.
      // Global scheduler will pick up the new stage status on next tick.
      console.log(`[RegressionState] ✅ Transitioned: Stage 2 → Stage 3 (automatic)`);
      
      // Set next state (will be used on next scheduler tick)
      this.context.setState(new PreReleaseState(this.context));
      
      console.log(`[RegressionState] Stage 3 will start on next scheduler tick`);
    } else {
      console.log(`[RegressionState] Stage 2 complete. Waiting for manual Stage 3 trigger (autoTransitionToStage3 = false)`);
      
      // Update database: Mark Stage 2 COMPLETED, set pauseType to AWAITING_STAGE_TRIGGER
      // Note: Scheduler keeps running but state machine will skip execution
      await cronJobRepo.update(cronJob.id, {
        stage2Status: StageStatus.COMPLETED,
        pauseType: PauseType.AWAITING_STAGE_TRIGGER
        // Note: stage3Status stays PENDING, cronStatus stays RUNNING
      });

      // DON'T stop the cron job - state machine will check pauseType and skip
      // This approach works with both setInterval and Cronicle (external scheduler)
      console.log(`[RegressionState] ⏸️ Stage 2 complete. Paused (AWAITING_STAGE_TRIGGER). Use trigger-pre-release API to start Stage 3.`);
    }
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

}

