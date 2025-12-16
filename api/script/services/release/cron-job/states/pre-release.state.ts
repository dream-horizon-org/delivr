/**
 * PreReleaseState (Stage 3)
 * 
 * Handles Stage 3 (Pre-Release) execution:
 * - Creates Stage 3 tasks if not already created
 * - Executes Stage 3 tasks in order
 * - Detects Stage 3 completion
 * - Ends workflow when Stage 3 completes (no Stage 4)
 * 
 * Extracted from: pre-release-cron-job.ts
 */

import { ICronJobState } from './cron-job-state.interface';
import { CronJobStateMachine } from '../cron-job-state-machine';
import { StageStatus, TaskStage, CronStatus, ReleaseStatus, PlatformName } from '~models/release/release.interface';
import { stopCronJob } from '~services/release/cron-job/cron-scheduler';
import { hasSequelize } from '~types/release/api-types';
import { checkIntegrationAvailability } from '~utils/integration-availability.utils';
import { createStage3Tasks } from '~utils/task-creation';
import { getOrderedTasks, getTaskBlockReason, OptionalTaskConfig, isTaskRequired } from '~utils/task-sequencing';
import { processAwaitingManualBuildTasks } from '~utils/awaiting-manual-build.utils';
import { deleteWorkflowPollingJobs } from '~services/release/workflow-polling';
import { StorageWithReleaseServices } from '~types/release/storage-with-services.interface';

export class PreReleaseState implements ICronJobState {
  constructor(public context: CronJobStateMachine) {}

  private getInstanceId(): string {
    return `pre-release-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  getStage(): TaskStage {
    return TaskStage.PRE_RELEASE;
  }

  async execute(): Promise<void> {
    const instanceId = this.getInstanceId();
    const releaseId = this.context.getReleaseId();
    const cronJobRepo = this.context.getCronJobRepo();
    const releaseRepo = this.context.getReleaseRepo();
    const releaseTaskRepo = this.context.getReleaseTaskRepo();
    const taskExecutor = this.context.getTaskExecutor();

    console.log(`[${instanceId}] [PreReleaseState] Executing Stage 3 for release ${releaseId}`);

    try {
      // Use injected storage from context
      const storage = this.context.getStorage();
      
      // Start queries in parallel (lazy await pattern for early exit optimization)
      const cronJobPromise = cronJobRepo.findByReleaseId(releaseId);
      const releasePromise = releaseRepo.findById(releaseId);
      const tasksPromise = releaseTaskRepo.findByReleaseIdAndStage(releaseId, TaskStage.PRE_RELEASE);
      
      // Await in order of validation checks (enables early exit)
      const cronJob = await cronJobPromise;
      if (!cronJob || cronJob.stage3Status !== StageStatus.IN_PROGRESS) {
        console.log(`[${instanceId}] [PreReleaseState] Stage 3 not in progress or cron job not found.`);
        return;  // Early exit - release + tasks queries still running but we don't wait
      }

      const release = await releasePromise;
      if (!release) {
        console.log(`[${instanceId}] [PreReleaseState] Release ${releaseId} not found`);
        return;  // Early exit - tasks query still running but we don't wait
      }

      // ✅ ARCHIVE CHECK: Stop execution if release is archived
      if (release.status === ReleaseStatus.ARCHIVED) {
        console.log(`[${instanceId}] [PreReleaseState] Release is ARCHIVED. Stopping execution.`);
        
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
      
      const existingStage3Tasks = await tasksPromise;
      
      // Fetch integration availability and platform info once
      if (!hasSequelize(storage)) {
        throw new Error('Sequelize storage required');
      }
      
      const integrationAvailability = await checkIntegrationAvailability(
        release.releaseConfigId,
        storage.sequelize
      );
      
      // Check if release has iOS platform
      let hasIOSPlatform = false;
      const ReleaseModel = storage.sequelize.models.release;
      const PlatformModel = storage.sequelize.models.platform;
      
      if (ReleaseModel && PlatformModel) {
        const releaseWithPlatforms = await ReleaseModel.findByPk(releaseId, {
          include: [{
            model: PlatformModel,
            as: 'platforms',
            through: { attributes: [] }
          }]
        });
        
        if (releaseWithPlatforms) {
          interface PlatformModel { id: string; name: string; }
          const platforms = (releaseWithPlatforms as any).platforms as PlatformModel[] || [];
          hasIOSPlatform = platforms.some((platform: PlatformModel) => platform.name === 'IOS');
        }
      }

      // Check if Stage 3 tasks exist, create them if not
      
      if (existingStage3Tasks.length === 0) {
        console.log(`[${instanceId}] [PreReleaseState] No Stage 3 tasks found. Creating Stage 3 tasks...`);

        try {
          console.log(`[${instanceId}] [PreReleaseState] Creating Stage 3 tasks with config: hasProjectManagementIntegration=${integrationAvailability.hasProjectManagementIntegration}, hasIOSPlatform=${hasIOSPlatform}`);
          const createdTaskIds = await createStage3Tasks(releaseTaskRepo, {
            releaseId,
            accountId: release.createdByAccountId || 'system',
            cronConfig: cronJob.cronConfig ?? {},
            hasProjectManagementIntegration: integrationAvailability.hasProjectManagementIntegration,
            hasIOSPlatform
          });

          console.log(`[${instanceId}] [PreReleaseState] Stage 3 tasks created: ${createdTaskIds.length} tasks`);
          
          // Return after creation to let next poll handle execution
          return;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[${instanceId}] [PreReleaseState] Error creating Stage 3 tasks:`, errorMessage);
          
          // Re-check if tasks exist now
          const tasksAfterError = await releaseTaskRepo.findByReleaseIdAndStage(releaseId, TaskStage.PRE_RELEASE);
          if (tasksAfterError.length > 0) {
            console.log(`[${instanceId}] [PreReleaseState] Stage 3 tasks exist after error: ${tasksAfterError.length} tasks`);
          } else {
            throw error;
          }
        }
        
        return;
      }

      // Use existingStage3Tasks we already fetched (no need to fetch again)
      console.log(`[${instanceId}] [PreReleaseState] Found ${existingStage3Tasks.length} Stage 3 tasks`);

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
            existingStage3Tasks,
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
                `[${instanceId}] [PreReleaseState] Manual build consumed for task ${taskId}. ` +
                `Task is now COMPLETED.`
              );
            } else if (result.checked && !result.allReady) {
              console.log(
                `[${instanceId}] [PreReleaseState] Task ${taskId} still waiting for uploads. ` +
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

      // Get ordered tasks
      const orderedTasks = getOrderedTasks(existingStage3Tasks, TaskStage.PRE_RELEASE);
      
      const config: OptionalTaskConfig = {
        cronConfig: cronJob.cronConfig || {},
        hasProjectManagementIntegration: integrationAvailability.hasProjectManagementIntegration,
        hasTestPlatformIntegration: integrationAvailability.hasTestPlatformIntegration,
        hasIOSPlatform
      };

      // Stage 3 tasks don't have time constraints
      const isTimeToExecute = () => true;

      // Execute tasks
      for (const task of orderedTasks) {
        // Skip tasks that were just completed by manual build handler
        if (justCompletedTaskIds.has(task.id)) {
          continue;
        }
        
        const blockReason = getTaskBlockReason(task, orderedTasks, TaskStage.PRE_RELEASE, config, isTimeToExecute);
        const canExecute = blockReason === 'EXECUTABLE';
        
        if (canExecute) {
          console.log(`[${instanceId}] [PreReleaseState] Executing task: ${task.taskType} (${task.id})`);
          
          try {
            await taskExecutor.executeTask({
              releaseId,
              tenantId: release.tenantId,
              release,
              task
            });
            
            console.log(`[${instanceId}] [PreReleaseState] Task ${task.taskType} executed successfully`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[${instanceId}] [PreReleaseState] Task ${task.taskType} execution failed:`, errorMessage);
          }
        } else {
          // Only log non-completed tasks to reduce noise
          const isAlreadyDone = blockReason === 'ALREADY_COMPLETED' || blockReason === 'ALREADY_SKIPPED';
          if (!isAlreadyDone) {
            console.log(`[${instanceId}] [PreReleaseState] Task ${task.taskType} blocked: ${blockReason}`);
          }
        }
      }

    } catch (error) {
      console.error(`[${instanceId}] [PreReleaseState] Error during execution:`, error);
    }
  }

  async isComplete(): Promise<boolean> {
    const releaseId = this.context.getReleaseId();
    const cronJobRepo = this.context.getCronJobRepo();
    const releaseRepo = this.context.getReleaseRepo();
    const releaseTaskRepo = this.context.getReleaseTaskRepo();

    // 🚀 Start all queries immediately (lazy await pattern for early exit optimization)
    const cronJobPromise = cronJobRepo.findByReleaseId(releaseId);
    const releasePromise = releaseRepo.findById(releaseId);
    const tasksPromise = releaseTaskRepo.findByReleaseIdAndStage(releaseId, TaskStage.PRE_RELEASE);

    // ⚡ Await in order (enables early exit)
    const cronJob = await cronJobPromise;
    if (!cronJob) return false;  // Early exit - saves ~90ms (release + tasks queries)

    const release = await releasePromise;
    if (!release) return false;  // Early exit - saves ~50ms (tasks query)

    const allStage3Tasks = await tasksPromise;
    
    // Use injected storage from context
    const storageInstance = this.context.getStorage();
    if (!hasSequelize(storageInstance)) {
      throw new Error('Sequelize storage required for integration availability check');
    }
    
    const integrationAvailability = await checkIntegrationAvailability(
      release.releaseConfigId,
      storageInstance.sequelize
    );

    const config: OptionalTaskConfig = {
      cronConfig: cronJob.cronConfig || {},
      hasProjectManagementIntegration: integrationAvailability.hasProjectManagementIntegration,
      hasTestPlatformIntegration: integrationAvailability.hasTestPlatformIntegration
    };

    const allComplete = allStage3Tasks.every(task => {
      if (!task.taskType) return true;
      
      const required = isTaskRequired(task.taskType, config);
      if (!required) {
        return true;
      }
      
      return task.taskStatus === 'COMPLETED';
    });

    console.log(`[PreReleaseState] isComplete() = ${allComplete} (${allStage3Tasks.length} tasks)`);
    
    return allComplete;
  }

  async transitionToNext(): Promise<void> {
    const releaseId = this.context.getReleaseId();
    const cronJobRepo = this.context.getCronJobRepo();

    const cronJob = await cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      console.log(`[PreReleaseState] Cannot transition: Cron job not found for release ${releaseId}`);
      return;
    }

    console.log(`[PreReleaseState] Stage 3 complete. Ending workflow (no Stage 4)...`);
    
    await cronJobRepo.update(cronJob.id, {
      stage3Status: StageStatus.COMPLETED,
      cronStatus: CronStatus.COMPLETED,
      cronStoppedAt: new Date()
    });

    stopCronJob(releaseId);
    console.log(`[PreReleaseState] ✅ Workflow COMPLETED: Stage 3 done, cron stopped`);
    console.log(`[PreReleaseState] Note: Release workflow ends here - no Stage 4. Submission tasks (SUBMIT_TO_TARGET) are manual APIs.`);

    // Delete workflow polling Cronicle jobs (release is COMPLETED)
    await this.deleteWorkflowPollingJobs(releaseId);
  }

  /**
   * Delete workflow polling Cronicle jobs for a completed release.
   * Called when the release workflow completes (Stage 3 done).
   */
  private async deleteWorkflowPollingJobs(releaseId: string): Promise<void> {
    const storage = this.context.getStorage();
    const storageWithServices = storage as StorageWithReleaseServices;
    const cronicleService = storageWithServices.cronicleService;
    
    const cronicleNotAvailable = !cronicleService;
    if (cronicleNotAvailable) {
      console.log(`[PreReleaseState] Cronicle not available, skipping workflow polling job deletion for release ${releaseId}`);
      return;
    }

    try {
      const result = await deleteWorkflowPollingJobs({
        releaseId,
        cronicleService
      });

      console.log(`[PreReleaseState] Workflow polling jobs deletion for release ${releaseId}: pending=${result.pendingDeleted}, running=${result.runningDeleted}`);
      
      const hasErrors = result.errors.length > 0;
      if (hasErrors) {
        console.warn(`[PreReleaseState] Some workflow polling jobs could not be deleted:`, result.errors);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[PreReleaseState] Error deleting workflow polling jobs for release ${releaseId}:`, errorMessage);
      // Don't throw - cleanup failures shouldn't block release completion
    }
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

}


