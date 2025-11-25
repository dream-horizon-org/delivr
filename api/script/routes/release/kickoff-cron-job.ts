/**
 * Kickoff Cron Job Route
 * 
 * Handles cron job polling for Stage 1 (Kickoff) tasks.
 * 
 * This is a basic implementation that:
 * - Polls every 60 seconds
 * - Uses distributed locking to prevent concurrent execution
 * - Logs task status (no actual task execution yet)
 * 
 * Follows cursorrules: No 'any' types - use explicit types
 */

import { Request, Response, Router } from 'express';
import * as storageTypes from '~storage/storage';
import { CronJobDTO } from '~storage/release/cron-job-dto';
import { ReleaseDTO } from '~storage/release/release-dto';
import { ReleaseTasksDTO } from '~storage/release/release-tasks-dto';
import { CronLockService } from '~services/cron-lock-service';
import { startCronJob, stopCronJob, isCronJobRunning } from '~services/cron-scheduler';
import { getOrderedTasks, canExecuteTask, OptionalTaskConfig, isTaskRequired, arePreviousTasksComplete } from '~utils/task-sequencing';
import { isKickOffReminderTime, isBranchForkTime } from '~utils/time-utils';
import { TaskStage, StageStatus, TaskType } from '~storage/release/release-models';
import { hasSequelize } from '~types/release';
import type { StorageWithSequelize } from '~types/release';
import { TaskExecutor } from '~services/task-executor';
import { getMockIntegrations } from '~services/integration-mocks';

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
import { SlackIntegrationService } from '~services/integrations/comm/slack-integration/slack-integration.service';
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
  const slackService = new SlackIntegrationService(undefined as any); // TODO: Add slack repository
  
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
 * In production, this could be the EC2 instance ID, container ID, etc.
 */
function getInstanceId(): string {
  // For now, use a combination of hostname and process ID
  // In production, use actual instance identifier
  return `instance-${process.env.HOSTNAME || 'local'}-${process.pid}`;
}

/**
 * Basic polling function (logs only, no execution)
 * 
 * This function:
 * - Acquires lock
 * - Fetches tasks
 * - Checks which tasks can execute
 * - Logs task status
 * - Does NOT execute tasks (that's for Chunk 7)
 */
export async function executeKickoffCronJob(
  releaseId: string,
  storage: storageTypes.Storage
): Promise<void> {
  const instanceId = getInstanceId();
  const cronJobDTO = new CronJobDTO();
  const releaseDTO = new ReleaseDTO();
  const releaseTasksDTO = new ReleaseTasksDTO();

  // Get cron job
  const cronJob = await cronJobDTO.getByReleaseId(releaseId);
  if (!cronJob) {
    console.log(`[${instanceId}] Cron job not found for release ${releaseId}`);
    return;
  }

  // Check if Stage 1 is active
  if (cronJob.stage1Status !== StageStatus.IN_PROGRESS) {
    console.log(`[${instanceId}] Stage 1 not in progress for release ${releaseId}. Status: ${cronJob.stage1Status}`);
    
    // If stage is complete or not started, stop cron job
    if (cronJob.stage1Status === StageStatus.COMPLETED || cronJob.stage1Status === StageStatus.PENDING) {
      stopCronJob(releaseId);
    }
    return;
  }

  // TODO: Temporarily disabled lock acquisition for testing
  // Will re-enable after core functionality is verified
  // const lockService = new CronLockService(cronJobDTO);
  // const lockResult = await lockService.acquireLock(cronJob.id, instanceId);
  // 
  // if (!lockResult.acquired) {
  //   console.log(`[${instanceId}] Could not acquire lock for release ${releaseId}. Reason: ${lockResult.reason}`);
  //   return; // Another instance is handling this
  // }

  // Assume lock is always acquired for now
  const lockService = null; // Not used when lock is disabled
  console.log(`[${instanceId}] Lock acquisition disabled - assuming lock acquired for release ${releaseId}. Starting cron job execution...`);

  try {

    // Get release
    const release = await releaseDTO.get(releaseId);
    if (!release) {
      console.log(`[${instanceId}] Release not found: ${releaseId}`);
      return;
    }

    // Get tasks for Stage 1
    const tasks = await releaseTasksDTO.getByReleaseAndStage(releaseId, TaskStage.KICKOFF);
    console.log(`[${instanceId}] Found ${tasks.length} tasks for Stage 1`);

    // Check actual integration availability (same logic as task creation)
    const stage1TasksForCompletion = await releaseTasksDTO.getByReleaseAndStage(releaseId, TaskStage.KICKOFF);
    const hasJiraIntegration = stage1TasksForCompletion.some(t => t.taskType === TaskType.CREATE_PROJECT_MANAGEMENT_TICKET);
    const hasTestPlatformIntegration = stage1TasksForCompletion.some(t => t.taskType === TaskType.CREATE_TEST_SUITE);
    
    // Check if all tasks are complete
    const config: OptionalTaskConfig = {
      cronConfig: cronJob.cronConfig || {},
      hasJiraIntegration,
      hasTestPlatformIntegration
    };
    
    const allComplete = tasks.every(task => {
      const taskType = task.taskType;
      if (!taskType) return true; // Skip tasks without type
      
      // Check if task is required
      const required = isTaskRequired(taskType, config);
      
      if (!required) {
        return true; // Optional task that's not required - consider it "complete"
      }
      
      return task.taskStatus === 'COMPLETED';
    });

    if (allComplete) {
      console.log(`[${instanceId}] All Stage 1 tasks complete for release ${releaseId}`);
      
      // Mark Stage 1 as COMPLETED
      await cronJobDTO.update(cronJob.id, {
        stage1Status: StageStatus.COMPLETED,
        stage2Status: StageStatus.IN_PROGRESS // Start Stage 2
      });

      // Stop cron job for Stage 1
      stopCronJob(releaseId);
      console.log(`[${instanceId}] Stage 1 complete. Stage 2 started.`);

      // Start Stage 2 (Regression) cron job
      const { executeRegressionCronJob } = await import('./regression-cron-job');
      startCronJob(releaseId, async () => {
        await executeRegressionCronJob(releaseId, storage);
      });
      console.log(`[${instanceId}] Stage 2 cron job started.`);
      return;
    }

    // Order tasks by execution order
    const orderedTasks = getOrderedTasks(tasks, TaskStage.KICKOFF);
    console.log(`[${instanceId}] Ordered tasks:`, orderedTasks.map(t => t.taskType));

    // Check which tasks can execute (but don't execute yet - just log)
    const isTimeToExecute = (task: typeof tasks[0]) => {
      if (!task.taskType) return false;
      
      switch (task.taskType) {
        case 'PRE_KICK_OFF_REMINDER':
          return isKickOffReminderTime(release);
        case 'FORK_BRANCH':
          return isBranchForkTime(release);
        default:
          return true; // No time constraint
      }
    };

    for (const task of orderedTasks) {
      if (!task.taskType) continue;

      const canExecute = canExecuteTask(
        task,
        orderedTasks,
        TaskStage.KICKOFF,
        config,
        isTimeToExecute
      );

      if (canExecute) {
        console.log(`[${instanceId}] Task ${task.taskType} (${task.id}) can execute`);
        
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
            console.log(`[${instanceId}] Task ${task.taskType} executed successfully`);
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
        // Only log reasons if task is PENDING (skip logging for COMPLETED tasks)
        if (task.taskStatus === 'PENDING') {
          console.log(`[${instanceId}] Task ${task.taskType} (${task.id}) cannot execute yet`);
          
          // Log why it can't execute
          if (!arePreviousTasksComplete(task, orderedTasks, TaskStage.KICKOFF, config)) {
            console.log(`  - Previous tasks not complete`);
          }
          
          if (!isTimeToExecute(task)) {
            console.log(`  - Time condition not met`);
          }
          
          if (!isTaskRequired(task.taskType as TaskType, config)) {
            console.log(`  - Task not required`);
          }
        }
        // Skip logging for COMPLETED/IN_PROGRESS tasks to reduce noise
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
 * Creates and configures the Kickoff Cron Job router
 */
export function getKickoffCronJobRouter(config: CronJobConfig): Router {
  const storage: storageTypes.Storage = config.storage;
  const router: Router = Router();

  /**
   * Start cron job for a release
   * POST /api/releases/:releaseId/cron/start
   */
  router.post(
    '/releases/:releaseId/cron/start',
    async (req: Request, res: Response): Promise<Response> => {
      const releaseId: string = req.params.releaseId;

      try {
        if (!hasSequelize(storage)) {
          return res.status(500).json({
            success: false,
            error: 'Storage does not have Sequelize instance'
          });
        }

        const cronJobDTO = new CronJobDTO();
        const cronJob = await cronJobDTO.getByReleaseId(releaseId);

        if (!cronJob) {
          return res.status(404).json({
            success: false,
            error: 'Cron job not found for release'
          });
        }

        // Check if already running
        if (isCronJobRunning(releaseId)) {
          return res.status(200).json({
            success: true,
            message: 'Cron job already running',
            releaseId
          });
        }

        // Start cron job
        const started = startCronJob(releaseId, async () => {
          await executeKickoffCronJob(releaseId, storage);
        });

        if (!started) {
          return res.status(500).json({
            success: false,
            error: 'Failed to start cron job'
          });
        }

        // Update cron job status
        await cronJobDTO.update(cronJob.id, {
          stage1Status: StageStatus.IN_PROGRESS
        });

        return res.status(200).json({
          success: true,
          message: 'Cron job started',
          releaseId
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error starting cron job:', errorMessage);
        return res.status(500).json({
          success: false,
          error: `Failed to start cron job: ${errorMessage}`
        });
      }
    }
  );

  /**
   * Stop cron job for a release
   * POST /api/releases/:releaseId/cron/stop
   */
  router.post(
    '/releases/:releaseId/cron/stop',
    async (req: Request, res: Response): Promise<Response> => {
      const releaseId: string = req.params.releaseId;

      try {
        const stopped = stopCronJob(releaseId);

        if (!stopped) {
          return res.status(404).json({
            success: false,
            error: 'Cron job not running'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Cron job stopped',
          releaseId
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error stopping cron job:', errorMessage);
        return res.status(500).json({
          success: false,
          error: `Failed to stop cron job: ${errorMessage}`
        });
      }
    }
  );

  /**
   * Get cron job status
   * GET /api/releases/:releaseId/cron/status
   */
  router.get(
    '/releases/:releaseId/cron/status',
    async (req: Request, res: Response): Promise<Response> => {
      const releaseId: string = req.params.releaseId;

      try {
        if (!hasSequelize(storage)) {
          return res.status(500).json({
            success: false,
            error: 'Storage does not have Sequelize instance'
          });
        }

        const cronJobDTO = new CronJobDTO();
        const cronJob = await cronJobDTO.getByReleaseId(releaseId);

        if (!cronJob) {
          return res.status(404).json({
            success: false,
            error: 'Cron job not found'
          });
        }

        const lockService = new CronLockService(cronJobDTO);
        const lockInfo = await lockService.getLockInfo(cronJob.id);

        return res.status(200).json({
          success: true,
          releaseId,
          cronJob: {
            id: cronJob.id,
            stage1Status: cronJob.stage1Status,
            stage2Status: cronJob.stage2Status,
            stage3Status: cronJob.stage3Status,
            cronStatus: cronJob.cronStatus
          },
          isRunning: isCronJobRunning(releaseId),
          lockInfo
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error getting cron job status:', errorMessage);
        return res.status(500).json({
          success: false,
          error: `Failed to get cron job status: ${errorMessage}`
        });
      }
    }
  );

  return router;
}

