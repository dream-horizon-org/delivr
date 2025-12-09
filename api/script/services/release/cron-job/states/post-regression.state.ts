/**
 * PostRegressionState (Stage 3)
 * 
 * Handles Stage 3 (Post-Regression) execution:
 * - Creates Stage 3 tasks if not already created
 * - Executes Stage 3 tasks in order
 * - Detects Stage 3 completion
 * - Ends workflow when Stage 3 completes (no Stage 4)
 * 
 * Extracted from: post-regression-cron-job.ts
 */

import { ICronJobState } from './cron-job-state.interface';
import { CronJobStateMachine } from '../cron-job-state-machine';
import { StageStatus, TaskStage, CronStatus, ReleaseStatus } from '~models/release/release.interface';
import { stopCronJob } from '~services/release/cron-job/cron-scheduler';
import { hasSequelize } from '~types/release/api-types';
import { checkIntegrationAvailability } from '~utils/integration-availability.utils';
import { createStage3Tasks } from '~utils/task-creation';
import { getOrderedTasks, canExecuteTask, OptionalTaskConfig, isTaskRequired, arePreviousTasksComplete } from '~utils/task-sequencing';

export class PostRegressionState implements ICronJobState {
  constructor(public context: CronJobStateMachine) {}

  private getInstanceId(): string {
    return `post-regression-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  getStage(): TaskStage {
    return TaskStage.POST_REGRESSION;
  }

  async execute(): Promise<void> {
    const instanceId = this.getInstanceId();
    const releaseId = this.context.getReleaseId();
    const cronJobRepo = this.context.getCronJobRepo();
    const releaseRepo = this.context.getReleaseRepo();
    const releaseTaskRepo = this.context.getReleaseTaskRepo();
    const taskExecutor = this.context.getTaskExecutor();

    console.log(`[${instanceId}] [PostRegressionState] Executing Stage 3 for release ${releaseId}`);

    try {
      // Use injected storage from context
      const storage = this.context.getStorage();
      
      // Start queries in parallel (lazy await pattern for early exit optimization)
      const cronJobPromise = cronJobRepo.findByReleaseId(releaseId);
      const releasePromise = releaseRepo.findById(releaseId);
      const tasksPromise = releaseTaskRepo.findByReleaseIdAndStage(releaseId, TaskStage.POST_REGRESSION);
      
      // Await in order of validation checks (enables early exit)
      const cronJob = await cronJobPromise;
      if (!cronJob || cronJob.stage3Status !== StageStatus.IN_PROGRESS) {
        console.log(`[${instanceId}] [PostRegressionState] Stage 3 not in progress or cron job not found.`);
        return;  // Early exit - release + tasks queries still running but we don't wait
      }

      const release = await releasePromise;
      if (!release) {
        console.log(`[${instanceId}] [PostRegressionState] Release ${releaseId} not found`);
        return;  // Early exit - tasks query still running but we don't wait
      }

      // ✅ ARCHIVE CHECK: Stop execution if release is archived
      if (release.status === ReleaseStatus.ARCHIVED) {
        console.log(`[${instanceId}] [PostRegressionState] Release is ARCHIVED. Stopping execution.`);
        
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
        console.log(`[${instanceId}] [PostRegressionState] No Stage 3 tasks found. Creating Stage 3 tasks...`);

        try {
          console.log(`[${instanceId}] [PostRegressionState] Creating Stage 3 tasks with config: hasProjectManagementIntegration=${integrationAvailability.hasProjectManagementIntegration}, hasIOSPlatform=${hasIOSPlatform}`);
          const createdTaskIds = await createStage3Tasks(releaseTaskRepo, {
            releaseId,
            accountId: release.createdByAccountId || 'system',
            cronConfig: cronJob.cronConfig ?? {},
            hasProjectManagementIntegration: integrationAvailability.hasProjectManagementIntegration,
            hasIOSPlatform
          });

          console.log(`[${instanceId}] [PostRegressionState] Stage 3 tasks created: ${createdTaskIds.length} tasks`);
          
          // Return after creation to let next poll handle execution
          return;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[${instanceId}] [PostRegressionState] Error creating Stage 3 tasks:`, errorMessage);
          
          // Re-check if tasks exist now
          const tasksAfterError = await releaseTaskRepo.findByReleaseIdAndStage(releaseId, TaskStage.POST_REGRESSION);
          if (tasksAfterError.length > 0) {
            console.log(`[${instanceId}] [PostRegressionState] Stage 3 tasks exist after error: ${tasksAfterError.length} tasks`);
          } else {
            throw error;
          }
        }
        
        return;
      }

      // Use existingStage3Tasks we already fetched (no need to fetch again)
      console.log(`[${instanceId}] [PostRegressionState] Found ${existingStage3Tasks.length} Stage 3 tasks`);

      // Get ordered tasks
      const orderedTasks = getOrderedTasks(existingStage3Tasks, TaskStage.POST_REGRESSION);
      
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
        if (canExecuteTask(task, orderedTasks, TaskStage.POST_REGRESSION, config, isTimeToExecute)) {
          console.log(`[${instanceId}] [PostRegressionState] Executing task: ${task.taskType} (${task.id})`);
          
          try {
            await taskExecutor.executeTask({
              releaseId,
              tenantId: release.tenantId,
              release,
              task
            });
            
            console.log(`[${instanceId}] [PostRegressionState] Task ${task.taskType} executed successfully`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[${instanceId}] [PostRegressionState] Task ${task.taskType} execution failed:`, errorMessage);
          }
        } else {
          const reasons: string[] = [];
          if (task.taskStatus !== 'PENDING') {
            reasons.push(`Status: ${task.taskStatus}`);
          }
          if (!isTaskRequired(task.taskType, config)) {
            reasons.push('Task not required');
          } else if (!arePreviousTasksComplete(task, orderedTasks, TaskStage.POST_REGRESSION, config)) {
            reasons.push('Previous tasks not complete');
          }
          console.log(`[${instanceId}] [PostRegressionState] Task ${task.taskType} cannot execute: ${reasons.join(', ')}`);
        }
      }

    } catch (error) {
      console.error(`[${instanceId}] [PostRegressionState] Error during execution:`, error);
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
    const tasksPromise = releaseTaskRepo.findByReleaseIdAndStage(releaseId, TaskStage.POST_REGRESSION);

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

    console.log(`[PostRegressionState] isComplete() = ${allComplete} (${allStage3Tasks.length} tasks)`);
    
    return allComplete;
  }

  async transitionToNext(): Promise<void> {
    const releaseId = this.context.getReleaseId();
    const cronJobRepo = this.context.getCronJobRepo();

    const cronJob = await cronJobRepo.findByReleaseId(releaseId);
    if (!cronJob) {
      console.log(`[PostRegressionState] Cannot transition: Cron job not found for release ${releaseId}`);
      return;
    }

    console.log(`[PostRegressionState] Stage 3 complete. Ending workflow (no Stage 4)...`);
    
    await cronJobRepo.update(cronJob.id, {
      stage3Status: StageStatus.COMPLETED,
      cronStatus: CronStatus.COMPLETED,
      cronStoppedAt: new Date()
    });

    stopCronJob(releaseId);
    console.log(`[PostRegressionState] ✅ Workflow COMPLETED: Stage 3 done, cron stopped`);
    console.log(`[PostRegressionState] Note: Release workflow ends here - no Stage 4. Submission tasks (SUBMIT_TO_TARGET) are manual APIs.`);
  }
}


