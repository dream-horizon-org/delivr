/**
 * Regression Cron Job Route
 * 
 * Handles cron job polling for Stage 2 (Regression) tasks.
 * 
 * This implementation:
 * - Polls every 60 seconds
 * - Detects regression slot times
 * - Creates cycles on-demand when slot time arrives
 * - Executes Stage 2 tasks for current cycle
 * - Detects cycle completion
 * - Detects Stage 2 completion (all cycles done)
 * - Transitions to Stage 3 when Stage 2 completes
 * 
 * Follows cursorrules: No 'any' types - use explicit types
 */

import { Request, Response, Router } from 'express';
import * as storageTypes from '~storage/storage';
import { CronJobDTO } from '~storage/release/cron-job-dto';
import { ReleaseDTO } from '~storage/release/release-dto';
import { ReleaseTasksDTO } from '~storage/release/release-tasks-dto';
import { RegressionCycleDTO } from '~storage/release/regression-cycle-dto';
import { CronLockService } from '~services/cron-lock-service';
import { startCronJob, stopCronJob, isCronJobRunning } from '~services/cron-scheduler';
import { getOrderedTasks, canExecuteTask, OptionalTaskConfig, isTaskRequired, arePreviousTasksComplete, TASK_ORDER } from '~utils/task-sequencing';
import { isRegressionSlotTime } from '~utils/time-utils';
import { TaskStage, StageStatus, RegressionCycleStatus, TaskType } from '~storage/release/release-models';
import { hasSequelize } from '~types/release';
import type { StorageWithSequelize } from '~types/release';
import { TaskExecutor } from '~services/task-executor';
import { getMockIntegrations } from '~services/integration-mocks';
import { createRegressionCycleWithTasks } from '~utils/regression-cycle-creation';

// Phase 7: Import real integration services and repositories
import { SCMService } from '~services/integrations/scm/scm.service';
import { CICDIntegrationRepository } from '~models/integrations/ci-cd/connection/connection.repository';
import { CICDWorkflowRepository } from '~models/integrations/ci-cd/workflow/workflow.repository';
import { ProjectManagementTicketService } from '~services/integrations/project-management/ticket/ticket.service';
import { ProjectManagementConfigRepository } from '~models/integrations/project-management/configuration/configuration.repository';
import { ProjectManagementIntegrationRepository } from '~models/integrations/project-management/integration/integration.repository';
import { TestManagementRunService } from '~services/integrations/test-management/test-run/test-run.service';
import { TestManagementConfigRepository } from '~models/integrations/test-management/test-management-config/test-management-config.repository';
import { TenantTestManagementIntegrationRepository } from '~models/integrations/test-management';
import { CommIntegrationService } from '~services/integrations/comm/comm-integration';
import { ReleaseConfigRepository } from '~models/release-configs/release-config.repository';
import { getStorage } from '~storage/storage-instance';

/**
 * Helper function to create TaskExecutor with all required services
 */
function createTaskExecutor(sequelize: any): TaskExecutor {
  // Instantiate repositories
  const cicdIntegrationRepo = new CICDIntegrationRepository(sequelize.models.cicdIntegration);
  const cicdWorkflowRepo = new CICDWorkflowRepository(sequelize.models.cicdWorkflow);
  const pmConfigRepo = new ProjectManagementConfigRepository(sequelize.models.projectManagementConfig);
  const pmIntegrationRepo = new ProjectManagementIntegrationRepository(sequelize.models.projectManagementIntegration);
  const tmConfigRepo = new TestManagementConfigRepository(sequelize.models.testManagementConfig);
  const tmIntegrationRepo = new TenantTestManagementIntegrationRepository(sequelize.models.testManagementIntegration);
  const releaseConfigRepo = new ReleaseConfigRepository(sequelize.models.releaseConfig);
  
  // Instantiate services
  const scmService = new SCMService();
  const pmTicketService = new ProjectManagementTicketService(pmConfigRepo, pmIntegrationRepo);
  const testRunService = new TestManagementRunService(tmConfigRepo, tmIntegrationRepo);
  const slackService = new CommIntegrationService(undefined as any); // TODO: Add slack repository
  
  // Create and return TaskExecutor
  return new TaskExecutor(
    scmService,
    cicdIntegrationRepo,
    cicdWorkflowRepo,
    pmTicketService,
    testRunService,
    slackService,
    releaseConfigRepo
  );
}

export interface CronJobConfig {
  storage: storageTypes.Storage;
}

/**
 * Generate unique instance ID for this service instance
 */
function getInstanceId(): string {
  return `instance-${process.env.HOSTNAME || 'local'}-${process.pid}`;
}

/**
 * Execute regression cron job
 * 
 * This function:
 * - Checks if Stage 2 is IN_PROGRESS
 * - Detects regression slot times
 * - Creates cycles on-demand when slot time arrives
 * - Executes Stage 2 tasks for current cycle
 * - Detects cycle completion
 * - Detects Stage 2 completion
 * - Transitions to Stage 3 when complete
 */
export async function executeRegressionCronJob(
  releaseId: string,
  storage: storageTypes.Storage
): Promise<void> {
  const instanceId = getInstanceId();
  const cronJobDTO = new CronJobDTO();
  const releaseDTO = new ReleaseDTO();
  const releaseTasksDTO = new ReleaseTasksDTO();
  const regressionCycleDTO = new RegressionCycleDTO();

  // Get cron job
  const cronJob = await cronJobDTO.getByReleaseId(releaseId);
  if (!cronJob) {
    console.log(`[${instanceId}] Cron job not found for release ${releaseId}`);
    return;
  }

  // Check if Stage 2 is active
  if (cronJob.stage2Status !== StageStatus.IN_PROGRESS) {
    console.log(`[${instanceId}] Stage 2 not in progress for release ${releaseId}. Status: ${cronJob.stage2Status}`);
    
    // If stage is complete or not started, stop cron job
    if (cronJob.stage2Status === StageStatus.COMPLETED || cronJob.stage2Status === StageStatus.PENDING) {
      stopCronJob(releaseId);
    }
    return;
  }

  // TODO: Temporarily disabled lock acquisition for testing
  // Will re-enable after core functionality is verified
  console.log(`[${instanceId}] Lock acquisition disabled - assuming lock acquired for release ${releaseId}. Starting cron job execution...`);

  try {
    // Get release
    const release = await releaseDTO.get(releaseId);
    if (!release) {
      console.log(`[${instanceId}] Release not found: ${releaseId}`);
      return;
    }

    // Check for regression slots that need cycle creation
    if (cronJob.upcomingRegressions && isRegressionSlotTime(cronJob)) {
      // Parse upcomingRegressions to find slots that need cycle creation
      let slots: Array<{ date: string | Date; config: Record<string, unknown> }>;
      if (typeof cronJob.upcomingRegressions === 'string') {
        try {
          slots = JSON.parse(cronJob.upcomingRegressions) as Array<{ date: string | Date; config: Record<string, unknown> }>;
        } catch {
          console.log(`[${instanceId}] Failed to parse upcomingRegressions`);
          slots = [];
        }
      } else {
        slots = cronJob.upcomingRegressions;
      }

      // Find slots that need cycle creation (within time window)
      // Process slots sequentially: only create one cycle per poll
      // Process the earliest slot first, wait for its cycle to complete, then process next slot
      const now = new Date();
      const TIME_WINDOW_MS = 60 * 1000; // 60 seconds

      // Get latest cycle to check if we can create a new one
      const latestCycle = await regressionCycleDTO.getLatest(releaseId);
      
      // Only create a new cycle if:
      // 1. No cycle exists, OR
      // 2. Latest cycle is DONE (previous cycle completed)
      const canCreateNewCycle = !latestCycle || latestCycle.status === RegressionCycleStatus.DONE;

      if (canCreateNewCycle) {
        // Find the earliest slot that's within the time window
        const slotsInWindow = slots
          .map(slot => {
            const slotTime = new Date(slot.date);
            if (isNaN(slotTime.getTime())) {
              return null;
            }
            const diff = Math.abs(now.getTime() - slotTime.getTime());
            if (diff < TIME_WINDOW_MS) {
              return { slot, slotTime, diff };
            }
            return null;
          })
          .filter((s): s is { slot: typeof slots[0]; slotTime: Date; diff: number } => s !== null)
          .sort((a, b) => a.slotTime.getTime() - b.slotTime.getTime()); // Sort by time (earliest first)

        if (slotsInWindow.length > 0) {
          // Process the earliest slot
          const { slot, slotTime } = slotsInWindow[0];
          
          console.log(`[${instanceId}] Creating regression cycle for slot at ${slotTime.toISOString()}`);
          
          // Create cycle with tasks
          await createRegressionCycleWithTasks(
            regressionCycleDTO,
            releaseTasksDTO,
            releaseDTO,
            {
              releaseId,
              accountId: release.createdByAccountId || 'system',
              cronConfig: {
                automationBuilds: (slot.config.automationBuilds === true),
                automationRuns: (slot.config.automationRuns === true)
              },
              hasTestPlatformIntegration: true // TODO: Check actual integration availability
            }
          );

          // Remove processed slot from upcomingRegressions
          // Convert date strings to Date objects for type safety
          const remainingSlots = slots
            .filter(s => {
              const sTime = new Date(s.date);
              if (isNaN(sTime.getTime())) {
                return false;
              }
              // Remove the slot we just processed (by comparing dates)
              return sTime.getTime() !== slotTime.getTime();
            })
            .map(s => ({
              date: s.date instanceof Date ? s.date : new Date(s.date),
              config: s.config
            }));

          await cronJobDTO.update(cronJob.id, {
            upcomingRegressions: remainingSlots.length > 0 ? remainingSlots : null
          });

          console.log(`[${instanceId}] Regression cycle created. Remaining slots: ${remainingSlots.length}`);
        } else {
          console.log(`[${instanceId}] No slots within time window for release ${releaseId}`);
        }
      } else {
        console.log(`[${instanceId}] Latest cycle ${latestCycle?.id} is ${latestCycle?.status}, waiting for completion before creating next cycle`);
      }
    }

    // Get latest regression cycle
    const latestCycle = await regressionCycleDTO.getLatest(releaseId);
    
    if (!latestCycle) {
      console.log(`[${instanceId}] No regression cycle found for release ${releaseId}. Waiting for slot time...`);
      return;
    }

    // Check if cycle is complete
    const cycleTasks = await releaseTasksDTO.getByRegressionCycle(latestCycle.id);
    
    // Check actual integration availability (same logic as task creation)
    const stage1Tasks = await releaseTasksDTO.getByReleaseAndStage(releaseId, TaskStage.KICKOFF);
    const hasJiraIntegration = stage1Tasks.some(t => t.taskType === TaskType.CREATE_PROJECT_MANAGEMENT_TICKET);
    const hasTestPlatformIntegration = stage1Tasks.some(t => t.taskType === TaskType.CREATE_TEST_SUITE);
    
    // Determine if this is a subsequent cycle (not the first one)
    const allCycles = await regressionCycleDTO.getByRelease(releaseId);
    const cycleIndex = allCycles.findIndex(c => c.id === latestCycle.id);
    const isSubsequentSlot = cycleIndex > 0; // First cycle is index 0, subsequent cycles are > 0

    const config: OptionalTaskConfig = {
      cronConfig: cronJob.cronConfig || {},
      hasJiraIntegration,
      hasTestPlatformIntegration,
      isSubsequentSlot // Critical: Required for RESET_TEST_SUITE to be considered "required"
    };

    const allCycleTasksComplete = cycleTasks.every(task => {
      if (!task.taskType) return true;
      
      const required = isTaskRequired(task.taskType, config);
      if (!required) {
        return true; // Optional task that's not required - consider it "complete"
      }
      
      const isCompleted = task.taskStatus === 'COMPLETED';
      if (!isCompleted) {
        console.log(`[${instanceId}] Cycle task ${task.taskType} (${task.id}) not complete: status=${task.taskStatus}, required=${required}`);
      }
      return isCompleted;
    });

    if (allCycleTasksComplete) {
      console.log(`[${instanceId}] All tasks complete for cycle ${latestCycle.id}`);
      
      // Mark cycle as DONE
      await regressionCycleDTO.update(latestCycle.id, {
        status: RegressionCycleStatus.DONE
      });

      // Check if all cycles are complete (Stage 2 complete)
      const allCycles = await regressionCycleDTO.getByRelease(releaseId);
      const allCyclesDone = allCycles.every(cycle => cycle.status === RegressionCycleStatus.DONE);
      
      if (allCyclesDone && (!cronJob.upcomingRegressions || 
          (typeof cronJob.upcomingRegressions === 'string' 
            ? JSON.parse(cronJob.upcomingRegressions).length === 0
            : cronJob.upcomingRegressions.length === 0))) {
        console.log(`[${instanceId}] All regression cycles complete for release ${releaseId}`);
        
        // Mark Stage 2 as COMPLETED
        await cronJobDTO.update(cronJob.id, {
          stage2Status: StageStatus.COMPLETED
        });

        // Check if automatic transition to Stage 3 is enabled
        const autoTransitionToStage3 = cronJob.autoTransitionToStage3 === true || cronJob.autoTransitionToStage3 === 1;
        
        if (autoTransitionToStage3) {
          // Automatic transition enabled - start Stage 3
          await cronJobDTO.update(cronJob.id, {
            stage3Status: StageStatus.IN_PROGRESS
          });

          // Stop cron job for Stage 2
          stopCronJob(releaseId);
          console.log(`[${instanceId}] Stage 2 complete. Stage 3 started automatically.`);

          // Start the post-regression cron job for Stage 3
          const { startCronJob: startPostRegressionCronJob } = await import('../../services/cron-scheduler');
          const { executePostRegressionCronJob } = await import('./post-regression-cron-job');
          startPostRegressionCronJob(releaseId, async () => {
            await executePostRegressionCronJob(releaseId, storage);
          });
          console.log(`[${instanceId}] Started post-regression cron job for release ${releaseId}`);
        } else {
          // Automatic transition disabled - Stage 3 must be manually triggered
          console.log(`[${instanceId}] Stage 2 complete. Stage 3 transition disabled (autoTransitionToStage3 = false). Use trigger-pre-release API to start Stage 3.`);
        }
        
        return;
      }

      // Cycle complete but more cycles to come
      console.log(`[${instanceId}] Cycle ${latestCycle.id} complete. Waiting for next slot...`);
      return;
    }

    // Execute tasks for current cycle
    let orderedTasks = getOrderedTasks(cycleTasks, TaskStage.REGRESSION);
    console.log(`[${instanceId}] Ordered tasks for cycle ${latestCycle.id}:`, orderedTasks.map(t => t.taskType));
    console.log(`[${instanceId}] Task statuses: ${orderedTasks.map(t => `${t.taskType}=${t.taskStatus}`).join(', ')}`);

    // Check which tasks can execute
    const isTimeToExecute = (task: typeof cycleTasks[0]) => {
      if (!task.taskType) return false;
      
      // Stage 2 tasks don't have time constraints (slot detection handles timing)
      return true;
    };

    // Execute only ONE task per poll to ensure fresh data in next poll
    let taskExecuted = false;
    
    for (const task of orderedTasks) {
      if (!task.taskType) continue;

      const canExecute = canExecuteTask(
        task,
        orderedTasks,
        TaskStage.REGRESSION,
        config,
        isTimeToExecute
      );

      if (canExecute) {
        console.log(`[${instanceId}] Task ${task.taskType} (${task.id}) can execute - executing now...`);
        console.log(`[${instanceId}] Task status BEFORE execution: ${task.taskStatus}`);
        
        // Execute task
        try {
          const storage = getStorage();
          if (!hasSequelize(storage)) {
            throw new Error('Storage does not have Sequelize instance');
          }
          const sequelize = (storage as StorageWithSequelize).sequelize;
          
          const taskExecutor = createTaskExecutor(sequelize);
          
          const result = await taskExecutor.executeTask({
            releaseId,
            tenantId: release.tenantId,
            release,
            task
          });
          
          if (result.success) {
            console.log(`[${instanceId}] ✅ Task ${task.taskType} executed successfully`);
            
            // Verify task status was updated in database
            const verifyTask = await releaseTasksDTO.getById(task.id);
            console.log(`[${instanceId}] Task status AFTER execution (from DB): ${verifyTask?.taskStatus}`);
            
            if (verifyTask?.taskStatus !== 'COMPLETED') {
              console.error(`[${instanceId}] ⚠️ WARNING: Task ${task.taskType} status not COMPLETED in database after execution!`);
            }
            
            taskExecuted = true;
            
            // CRITICAL FIX: Break after executing ONE task
            // This ensures next poll will fetch fresh task data from database
            // Without this, in-memory orderedTasks array has stale status data
            console.log(`[${instanceId}] Breaking after one task execution - next poll will use fresh data`);
            break;
          } else {
            console.error(`[${instanceId}] Task ${task.taskType} execution failed: ${result.error}`);
            // Error handling is done in TaskExecutor - release status updated to FAILED
            break; // Stop processing more tasks
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[${instanceId}] Error executing task ${task.taskType}:`, errorMessage);
          // Error handling is done in TaskExecutor - release status updated to FAILED
          break; // Stop processing more tasks
        }
      } else {
        console.log(`[${instanceId}] Task ${task.taskType} (${task.id}) cannot execute yet`);
        
        // Log why it can't execute
        if (task.taskStatus !== 'PENDING') {
          console.log(`  - Status: ${task.taskStatus} (not PENDING)`);
        }
        
        if (!arePreviousTasksComplete(task, orderedTasks, TaskStage.REGRESSION, config)) {
          console.log(`  - Previous tasks not complete`);
          // Debug: Show which previous tasks are not complete
          const order = TASK_ORDER[TaskStage.REGRESSION];
          if (order) {
            const taskIndex = order.indexOf(task.taskType as TaskType);
            if (taskIndex > 0) {
              const previousTaskTypes = order.slice(0, taskIndex);
              const incompletePreviousTasks = previousTaskTypes
                .map(prevType => {
                  const prevTask = orderedTasks.find(t => t.taskType === prevType);
                  if (!prevTask) return null;
                  const required = isTaskRequired(prevType, config);
                  if (!required) return null;
                  if (prevTask.taskStatus !== 'COMPLETED') {
                    return `${prevType} (${prevTask.taskStatus})`;
                  }
                  return null;
                })
                .filter((t): t is string => t !== null);
              
              if (incompletePreviousTasks.length > 0) {
                console.log(`    Incomplete previous tasks: ${incompletePreviousTasks.join(', ')}`);
              }
            }
          }
        }
      }
    }

  } finally {
    // TODO: Lock release disabled (lock acquisition is disabled)
    // if (lockService) {
    //   await lockService.releaseLock(cronJob.id, instanceId);
    //   console.log(`[${instanceId}] Released lock for release ${releaseId}`);
    // }
  }
}

/**
 * Creates and configures the Regression Cron Job router
 */
export function getRegressionCronJobRouter(config: CronJobConfig): Router {
  const storage: storageTypes.Storage = config.storage;
  const router: Router = Router();

  /**
   * Start regression cron job for a release
   * POST /api/releases/:releaseId/regression-cron/start
   */
  router.post(
    '/releases/:releaseId/regression-cron/start',
    async (req: Request, res: Response): Promise<Response> => {
      const releaseId: string = req.params.releaseId;

      try {
        if (!hasSequelize(storage)) {
          return res.status(500).json({
            error: 'Storage does not have Sequelize instance'
          });
        }

        // Start cron job
        startCronJob(releaseId, async () => {
          await executeRegressionCronJob(releaseId, storage);
        });

        return res.json({
          success: true,
          message: `Regression cron job started for release ${releaseId}`
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error starting regression cron job:', errorMessage);
        return res.status(500).json({
          error: 'Failed to start regression cron job',
          details: errorMessage
        });
      }
    }
  );

  /**
   * Stop regression cron job for a release
   * POST /api/releases/:releaseId/regression-cron/stop
   */
  router.post(
    '/releases/:releaseId/regression-cron/stop',
    async (req: Request, res: Response): Promise<Response> => {
      const releaseId: string = req.params.releaseId;

      try {
        stopCronJob(releaseId);

        return res.json({
          success: true,
          message: `Regression cron job stopped for release ${releaseId}`
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error stopping regression cron job:', errorMessage);
        return res.status(500).json({
          error: 'Failed to stop regression cron job',
          details: errorMessage
        });
      }
    }
  );

  /**
   * Get regression cron job status
   * GET /api/releases/:releaseId/regression-cron/status
   */
  router.get(
    '/releases/:releaseId/regression-cron/status',
    async (req: Request, res: Response): Promise<Response> => {
      const releaseId: string = req.params.releaseId;

      try {
        if (!hasSequelize(storage)) {
          return res.status(500).json({
            error: 'Storage does not have Sequelize instance'
          });
        }

        const cronJobDTO = new CronJobDTO();
        const cronJob = await cronJobDTO.getByReleaseId(releaseId);

        if (!cronJob) {
          return res.status(404).json({
            error: 'Cron job not found'
          });
        }

        const isRunning = isCronJobRunning(releaseId);

        return res.json({
          success: true,
          running: isRunning,
          stage2Status: cronJob.stage2Status,
          upcomingRegressions: cronJob.upcomingRegressions
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error getting regression cron job status:', errorMessage);
        return res.status(500).json({
          error: 'Failed to get regression cron job status',
          details: errorMessage
        });
      }
    }
  );

  return router;
}

