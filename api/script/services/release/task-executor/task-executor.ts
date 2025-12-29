/**
 * Task Executor Service
 * 
 * Executes individual release tasks by calling integration methods directly.
 * 
 * Follows cursorrules: No 'any' types - use explicit types
 */

import { v4 as uuidv4 } from 'uuid';
import type { Sequelize } from 'sequelize';
import { ReleaseTaskRepository } from '../../../models/release/release-task.repository';
import { ReleaseRepository } from '../../../models/release/release.repository';
import type { Release, ReleaseTask } from '../../../models/release/release.interface';
import { TaskType, TaskStatus, ReleaseStatus, TaskStage, PauseType } from '../../../models/release/release.interface';
import { CronJobRepository } from '../../../models/release/cron-job.repository';
import { RegressionCycleRepository } from '../../../models/release/regression-cycle.repository';
// Note: Removed getStorage() and hasSequelize imports - Sequelize is now passed directly to constructor (avoids circular dependency)

// Phase 6: Real integration services (DI)
import { SCMService } from '../../integrations/scm/scm.service';
import { CICDIntegrationRepository } from '../../../models/integrations/ci-cd/connection/connection.repository';
import { CICDWorkflowRepository } from '../../../models/integrations/ci-cd/workflow/workflow.repository';
import { CICDConfigService } from '../../integrations/ci-cd/config/config.service';
import { GitHubActionsWorkflowService } from '../../integrations/ci-cd/workflows/github-actions-workflow.service';
import { JenkinsWorkflowService } from '../../integrations/ci-cd/workflows/jenkins-workflow.service';
import { CICDProviderType } from '../../../types/integrations/ci-cd/connection.interface';
import { WorkflowType } from '../../../types/integrations/ci-cd/workflow.interface';
import { ProjectManagementTicketService } from '../../integrations/project-management/ticket/ticket.service';
import { Platform } from '../../../types/integrations/project-management/platform.interface';
import { TestManagementRunService } from '../../integrations/test-management/test-run/test-run.service';
import { TestPlatform } from '../../../types/integrations/test-management/platform.interface';
import { MessagingService } from '../../integrations/comm/messaging/messaging.service';
import type { ReleaseConfigRepository } from '../../../models/release-configs/release-config.repository';
import { RELEASE_ERROR_MESSAGES, RELEASE_DEFAULTS, CICD_JOB_BUILD_TYPE } from '../release.constants';
import { ReleaseNotificationService } from '../../release-notification/release-notification.service';
import { NotificationType } from '~types/release-notification';
import { ReleaseUploadsRepository } from '../../../models/release/release-uploads.repository';
import { PlatformName } from '../../../models/release/release.interface';
import {
  BUILD_PLATFORM,
  BUILD_STAGE,
  BUILD_TYPE,
  BUILD_UPLOAD_STATUS,
  STORE_TYPE,
  WORKFLOW_STATUS
} from '~types/release-management/builds';
import { generatePlatformVersionString } from '../release.utils';
import { getTaskNameWithStage, TASK_TYPE_TO_NAME } from './task-executor.constants';
import { buildDelivrUrl } from './task-executor.utils';

/**
 * Task execution result
 */
export interface TaskExecutionResult {
  success: boolean;
  externalId?: string | null;
  externalData?: Record<string, unknown>;
  error?: string;
}

/**
 * Task execution context
 */
/**
 * Platform-Target mapping from release_platforms_targets_mapping table
 * Stores per-platform integration run IDs (PM tickets, test runs, etc.)
 */
interface PlatformTargetMapping {
  id: string;
  releaseId: string;
  platform: string;  // ENUM: 'IOS' | 'ANDROID' | 'WEB'
  target: string;    // ENUM: 'APP_STORE' | 'PLAY_STORE' | 'WEB'
  version: string;
  projectManagementRunId?: string | null;  // JIRA ticket ID for this platform
  testManagementRunId?: string | null;     // Test suite run ID for this platform
}

export interface TaskExecutionContext {
  releaseId: string;
  tenantId: string;
  release: Release;
  task: ReleaseTask;
  platformTargetMappings: PlatformTargetMapping[];
}

/**
 * Extract versionCode from Play Store internal track link
 * @param internalTrackLink - URL like "https://play.google.com/apps/test/{packageName}/{versionCode}"
 * @returns versionCode string or null if URL is invalid/null
 */
const extractVersionCodeFromInternalTrackLink = (internalTrackLink: string | null | undefined): string | null => {
  const linkIsNullOrUndefined = internalTrackLink === null || internalTrackLink === undefined;
  if (linkIsNullOrUndefined) {
    return null;
  }
  
  // Pattern: https://play.google.com/apps/test/{packageName}/{versionCode}
  // We want the last segment after the final slash
  const segments = internalTrackLink.split('/');
  const lastSegment = segments[segments.length - 1];
  
  // Verify it looks like a version code (numeric string)
  const isNumeric = /^\d+$/.test(lastSegment);
  if (isNumeric) {
    return lastSegment;
  }
  
  return null;
};

// IntegrationInstances interface removed - now using real services via DI

/**
 * Task Executor Service
 * 
 * Executes tasks by calling integration methods directly via dependency injection.
 * Updates task status in database.
 */
export class TaskExecutor {
  private releaseTaskRepo: ReleaseTaskRepository;
  private releaseRepo: ReleaseRepository;
  private sequelize: Sequelize;
  private releaseUploadsRepo: ReleaseUploadsRepository;
  private cicdConfigService: CICDConfigService;
  private cronJobRepo: CronJobRepository;
  private regressionCycleRepo: RegressionCycleRepository;

  constructor(
    private scmService: SCMService,
    private cicdIntegrationRepository: CICDIntegrationRepository,
    private cicdWorkflowRepository: CICDWorkflowRepository,
    cicdConfigService: CICDConfigService,
    private pmTicketService: ProjectManagementTicketService,
    private testRunService: TestManagementRunService,
    private messagingService: MessagingService | null,
    private releaseConfigRepository: ReleaseConfigRepository,
    releaseTaskRepo: ReleaseTaskRepository,
    releaseRepo: ReleaseRepository,
    releaseUploadsRepo: ReleaseUploadsRepository,  // ✅ Required - actively initialized in aws-storage.ts
    cronJobRepo: CronJobRepository,  // ✅ Required - actively initialized in aws-storage.ts
    private releaseNotificationService: ReleaseNotificationService | undefined,
    sequelize: Sequelize,  // ✅ Pass Sequelize directly instead of calling getStorage() (avoids circular dependency)
    regressionCycleRepo: RegressionCycleRepository  // ✅ Required - actively initialized in aws-storage.ts
  ) {
    this.releaseTaskRepo = releaseTaskRepo;
    this.releaseRepo = releaseRepo;
    this.releaseUploadsRepo = releaseUploadsRepo;  // ✅ Active initialization - no lazy initialization
    this.cicdConfigService = cicdConfigService;
    this.cronJobRepo = cronJobRepo;  // ✅ Active initialization - no lazy initialization
    this.regressionCycleRepo = regressionCycleRepo;  // ✅ Active initialization - no lazy initialization
    
    // ✅ Use passed Sequelize instance instead of calling getStorage() (avoids circular dependency)
    // This allows TaskExecutor to be created during storage setup without requiring storage to be initialized first
    this.sequelize = sequelize;
  }

  /**
   * Get Release Configuration by ID
   * Helper method to fetch config for integration ID lookups
   */
  private async getReleaseConfig(releaseConfigId: string | null | undefined) {
    if (!releaseConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.RELEASE_CONFIG_ID_REQUIRED);
    }
    
    const config = await this.releaseConfigRepository.findById(releaseConfigId);
    
    if (!config) {
      throw new Error(RELEASE_ERROR_MESSAGES.RELEASE_CONFIG_NOT_FOUND(releaseConfigId));
    }
    
    return config;
  }

  /**
   * Trigger a workflow by config ID, platform, and workflow type.
   * 
   * This is the correct method to use for triggering CI/CD workflows.
   * The config contains multiple workflows for different platforms/types,
   * and this method resolves the correct workflow to trigger.
   */
  private async triggerWorkflowByConfigId(
    configId: string,
    tenantId: string,
    platform: string,
    workflowType: WorkflowType,
    jobParameters: Record<string, unknown>
  ): Promise<{ queueLocation: string; workflowId: string; workflowType: string; providerType: CICDProviderType }> {
    const result = await this.cicdConfigService.triggerWorkflowByConfig({
      configId,
      tenantId,
      platform,
      workflowType,
      jobParameters
    });

    return {
      queueLocation: result.queueLocation,
      workflowId: result.workflowId,
      workflowType: result.workflowType,
      providerType: result.providerType
    };
  }

  /**
   * Extract externalId and externalData from integration response based on task type
   * 
   * Category A (6 tasks): Return simple string → Store in BOTH columns
   * Category B (13 tasks): Return object → Store in externalData ONLY (externalId = null)
   * 
   * @param taskType - Task type
   * @param result - Integration response (string or object)
   * @returns Tuple of [externalId, externalData]
   */
  private extractExternalData(
    taskType: TaskType,
    result: unknown
  ): [string | null, Record<string, unknown>] {
    if (result === null || result === undefined) {
      return [null, {}];
    }

    // Category A: These 7 tasks return SINGLE STRING VALUE
    // Store in BOTH externalId and externalData
    const categoryATasks: TaskType[] = [
      TaskType.CREATE_PROJECT_MANAGEMENT_TICKET,
      TaskType.CREATE_TEST_SUITE,
      TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
      TaskType.TRIGGER_REGRESSION_BUILDS,
      TaskType.TRIGGER_AUTOMATION_RUNS,
      TaskType.TRIGGER_TEST_FLIGHT_BUILD,
      TaskType.CREATE_AAB_BUILD,
    ];

    if (categoryATasks.includes(taskType)) {
      // Result is a simple string like 'JIRA-456' or '1.4.3'
      const externalId = String(result);
      const externalData = {
        externalId: externalId  // Duplicate for future-proofing
      };
      
      console.log(`[TaskExecutor] Category A task - storing in BOTH columns: externalId="${externalId}"`);
      return [externalId, externalData];
    }

    // Category B: All other tasks return OBJECTS
    // Store in externalData ONLY, externalId = null
    if (typeof result === 'object' && result !== null) {
      const resultObj = result as Record<string, unknown>;
      
      // Special case: CREATE_RELEASE_TAG returns { value: tagName, ... }
      // Extract 'value' as externalId so CREATE_FINAL_RELEASE_NOTES can find it
      if (taskType === TaskType.CREATE_RELEASE_TAG && 'value' in resultObj && typeof resultObj.value === 'string') {
        const externalId = resultObj.value;
        console.log(`[TaskExecutor] Category B (special) - storing tag in BOTH: externalId="${externalId}"`);
        return [externalId, resultObj];
      }
      
      // Result is an object like { value: '...', num: '...', timestamp: '...' }
      console.log(`[TaskExecutor] Category B task - storing in externalData ONLY (externalId=null)`);
      return [null, resultObj];
    }

    // Fallback: If it's a simple string but not in Category A
    // Store in externalData only
    console.log(`[TaskExecutor] Fallback - storing in externalData ONLY: value="${result}"`);
    return [null, { value: result }];
  }

  /**
   * Send notification based on task type (dispatcher)
   * 
   * Note: Build tasks (TRIGGER_PRE_REGRESSION_BUILDS, TRIGGER_REGRESSION_BUILDS, 
   * TRIGGER_TEST_FLIGHT_BUILD, CREATE_AAB_BUILD) are NOT handled here because they
   * complete asynchronously via CI/CD callbacks in build-callback.service.ts
   */
  private async notifyTaskCompletion(
    taskType: TaskType,
    context: TaskExecutionContext,
    externalData: Record<string, unknown> | null,
    externalId: string | null
  ): Promise<void> {
    if (!this.releaseNotificationService) {
      console.log('[TaskExecutor] ReleaseNotificationService not available, skipping notification');
      return;
    }

    try {
      switch (taskType) {
        case TaskType.FORK_BRANCH:
          await this.notifyBranchForkout(context, externalData, externalId);
          break;

        case TaskType.CREATE_PROJECT_MANAGEMENT_TICKET:
          await this.notifyProjectManagementLinks(context, externalData, externalId);
          break;

        case TaskType.CREATE_TEST_SUITE:
          await this.notifyTestManagementLinks(context, externalData, externalId);
          break;

        case TaskType.CREATE_RELEASE_NOTES:
          await this.notifyReleaseNotes(context, externalData, externalId);
          break;

        case TaskType.CREATE_FINAL_RELEASE_NOTES:
          await this.notifyFinalReleaseNotes(context, externalData, externalId);
          break;

        default:
          // No notification for other task types yet
          console.log(`[TaskExecutor] No notification configured for task type: ${taskType}`);
      }
    } catch (error) {
      console.error(`[TaskExecutor] Error sending notification for ${taskType}:`, error);
      // Don't fail the task if notification fails
    }
  }

  /**
   * Send BRANCH_FORKOUT notification
   */
  private async notifyBranchForkout(
    context: TaskExecutionContext,
    externalData: Record<string, unknown> | null,
    _externalId: string | null
  ): Promise<void> {
    if (!externalData || !externalData.branchName) {
      console.log('[TaskExecutor] Missing branch name in externalData, skipping notification');
      return;
    }

    const { tenantId, releaseId, release, platformTargetMappings } = context;
    const branchName = String(externalData.branchName);

    await this.releaseNotificationService!.notify({
      type: NotificationType.BRANCH_FORKOUT,
      tenantId,
      releaseId,
      branch: branchName,
      isSystemGenerated: true
    });

    console.log(`[TaskExecutor] Sent BRANCH_FORKOUT notification for release ${releaseId}`);
  }

  /**
   * Send PROJECT_MANAGEMENT_LINKS notification
   * 
   * IMPORTANT: Re-fetches platformTargetMappings from DB to get fresh data.
   * The context.platformTargetMappings may be stale (fetched before task execution),
   * but the task updates projectManagementRunId in the DB during execution.
   */
  private async notifyProjectManagementLinks(
    context: TaskExecutionContext,
    _externalData: Record<string, unknown> | null,
    _externalId: string | null
  ): Promise<void> {
    const { tenantId, releaseId, release } = context;

    // Get release config
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const pmConfigId = releaseConfig?.projectManagementConfigId;
    
    if (!pmConfigId) {
      console.log('[TaskExecutor] No PM config ID, skipping PM notification');
      return;
    }

    // Re-fetch fresh platform mappings from DB (context may have stale data)
    const PlatformTargetMappingModel = this.sequelize.models.PlatformTargetMapping;
    const freshMappingsRaw = await PlatformTargetMappingModel.findAll({
      where: { releaseId },
      raw: true
    });
    const freshMappings = freshMappingsRaw as unknown as PlatformTargetMapping[];

    if (!freshMappings || freshMappings.length === 0) {
      console.log('[TaskExecutor] No platform mappings found in DB, skipping PM notification');
      return;
    }

    // Fetch ticket URLs for each platform
    const links: string[] = [];
    for (const mapping of freshMappings) {
      if (mapping.projectManagementRunId) {
        try {
          const ticketUrl = await this.pmTicketService.getTicketUrl({
            pmConfigId,
            platform: mapping.platform as Platform,
            ticketKey: mapping.projectManagementRunId
          });
          links.push(ticketUrl);
        } catch (error) {
          console.error(`[TaskExecutor] Error getting ticket URL for ${mapping.platform}:`, error);
        }
      }
    }

    if (links.length === 0) {
      console.log('[TaskExecutor] No ticket URLs found, skipping PM notification');
      return;
    }

    await this.releaseNotificationService!.notify({
      type: NotificationType.PROJECT_MANAGEMENT_LINKS,
      tenantId,
      releaseId,
      links,
      isSystemGenerated: true
    });

    console.log(`[TaskExecutor] Sent PROJECT_MANAGEMENT_LINKS notification for release ${releaseId}`);
  }

  /**
   * Send TEST_MANAGEMENT_LINKS notification
   * 
   * IMPORTANT: Re-fetches platformTargetMappings from DB to get fresh data.
   * The context.platformTargetMappings may be stale (fetched before task execution),
   * but the task updates testManagementRunId in the DB during execution.
   */
  private async notifyTestManagementLinks(
    context: TaskExecutionContext,
    _externalData: Record<string, unknown> | null,
    _externalId: string | null
  ): Promise<void> {
    const { tenantId, releaseId, release } = context;

    // Get release config
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const testConfigId = releaseConfig?.testManagementConfigId;
    
    if (!testConfigId) {
      console.log('[TaskExecutor] No test config ID, skipping test management notification');
      return;
    }

    // Re-fetch fresh platform mappings from DB (context may have stale data)
    const PlatformTargetMappingModel = this.sequelize.models.PlatformTargetMapping;
    const freshMappingsRaw = await PlatformTargetMappingModel.findAll({
      where: { releaseId },
      raw: true
    });
    const freshMappings = freshMappingsRaw as unknown as PlatformTargetMapping[];

    if (!freshMappings || freshMappings.length === 0) {
      console.log('[TaskExecutor] No platform mappings found in DB, skipping test management notification');
      return;
    }

    // Fetch run URLs for each platform
    const links: string[] = [];
    for (const mapping of freshMappings) {
      if (mapping.testManagementRunId) {
        try {
          const runUrl = await this.testRunService.getRunUrl({
            runId: mapping.testManagementRunId,
            testManagementConfigId: testConfigId,
            platform: mapping.platform as TestPlatform  // Cast to TestPlatform enum type
          });
          links.push(runUrl);
        } catch (error) {
          console.error(`[TaskExecutor] Error getting run URL for ${mapping.platform}:`, error);
        }
      }
    }

    if (links.length === 0) {
      console.log('[TaskExecutor] No run URLs found, skipping test management notification');
      return;
    }

    await this.releaseNotificationService!.notify({
      type: NotificationType.TEST_MANAGEMENT_LINKS,
      tenantId,
      releaseId,
      links,
      isSystemGenerated: true
    });

    console.log(`[TaskExecutor] Sent TEST_MANAGEMENT_LINKS notification for release ${releaseId}`);
  }

  /**
   * Send RELEASE_NOTES notification (for regression cycles)
   */
  private async notifyReleaseNotes(
    context: TaskExecutionContext,
    externalData: Record<string, unknown> | null,
    _externalId: string | null
  ): Promise<void> {
    if (!externalData || !externalData.notes || !externalData.currentTag) {
      console.log('[TaskExecutor] Missing release notes data, skipping notification');
      return;
    }

    const { tenantId, releaseId } = context;
    const notes = String(externalData.notes);
    const currentTag = String(externalData.currentTag);
    const previousTag = externalData.previousTag ? String(externalData.previousTag) : currentTag;

    await this.releaseNotificationService!.notify({
      type: NotificationType.RELEASE_NOTES,
      tenantId,
      releaseId,
      startTag: previousTag,
      endTag: currentTag,
      tagChangeLog: notes,
      isSystemGenerated: true
    });

    console.log(`[TaskExecutor] Sent RELEASE_NOTES notification for release ${releaseId}`);
  }

  /**
   * Send FINAL_RELEASE_NOTES notification (for final release)
   */
  private async notifyFinalReleaseNotes(
    context: TaskExecutionContext,
    externalData: Record<string, unknown> | null,
    _externalId: string | null
  ): Promise<void> {
    if (!externalData || !externalData.releaseUrl || !externalData.currentTag) {
      console.log('[TaskExecutor] Missing final release notes data, skipping notification');
      return;
    }

    const { tenantId, releaseId } = context;
    const releaseUrl = String(externalData.releaseUrl);
    const releaseTag = String(externalData.currentTag);

    await this.releaseNotificationService!.notify({
      type: NotificationType.FINAL_RELEASE_NOTES,
      tenantId,
      releaseId,
      releaseTag,
      releaseUrl,
      isSystemGenerated: true
    });

    console.log(`[TaskExecutor] Sent FINAL_RELEASE_NOTES notification for release ${releaseId}`);
  }

  /**
   * Send TASK_FAILED notification
   */
  private async notifyTaskFailure(
    context: TaskExecutionContext,
    task: ReleaseTask,
    errorMessage: string
  ): Promise<void> {
    if (!this.releaseNotificationService) {
      return; // Service not available, skip notification
    }

    try {
      // Get task name with stage prefix (e.g., "Kickoff: Branch Forkout")
      const taskName = getTaskNameWithStage(task.taskType);
      
      // Build Delivr URL
      const delivrUrl = buildDelivrUrl(context.tenantId, context.releaseId);

      // Send notification
      await this.releaseNotificationService.notify({
        type: NotificationType.TASK_FAILED,
        tenantId: context.tenantId,
        releaseId: context.releaseId,
        taskName: taskName,
        delivrUrl: delivrUrl,
        isSystemGenerated: true
      });

      console.log(`[TaskExecutor] Sent TASK_FAILED notification for task ${task.id}`);
    } catch (error) {
      // Log but don't throw - notification failure shouldn't break the failure handler
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[TaskExecutor] Failed to send TASK_FAILED notification:`, errorMessage);
    }
  }

  /**
   * Execute a single task
   * 
   * @param context - Task execution context
   * @param integrations - Integration instances (for dependency injection)
   * @returns Task execution result
   */
  async executeTask(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { task } = context;

    if (!task || !task.taskType) {
      return {
        success: false,
        error: 'Task or taskType is missing'
      };
    }

    try {
      console.log(`[TaskExecutor] Starting execution of task ${task.taskType} (${task.id})`);
      console.log(`[TaskExecutor] Task status BEFORE: ${task.taskStatus}`);
      
      // Update task status to IN_PROGRESS
      // Use updateById since we have the database ID, not taskId
      await this.releaseTaskRepo.update(task.id, {
        taskStatus: TaskStatus.IN_PROGRESS
      });
      console.log(`[TaskExecutor] Task status set to IN_PROGRESS`);

      // Execute task based on type - returns either string (Category A) or object (Category B)
      const result = await this.executeTaskByType(
        task.taskType,
        context
      );
      console.log(`[TaskExecutor] Task ${task.taskType} execution completed successfully`);
      console.log(`[TaskExecutor] Raw result type: ${typeof result}, value:`, result);

      // Extract externalId and externalData based on task category
      const [externalId, externalData] = this.extractExternalData(task.taskType, result);

      // Check if task is waiting for external completion (manual builds or CI/CD callback)
      // Don't overwrite the status that was set by the task method
      const isAwaitingManualBuild = result === 'AWAITING_MANUAL_BUILD';
      const isAwaitingCiCd = result === 'AWAITING_CI_CD';
      const isAwaitingExternal = isAwaitingManualBuild || isAwaitingCiCd;
      
      if (isAwaitingExternal) {
        // Task already set status (AWAITING_MANUAL_BUILD or AWAITING_CALLBACK) - don't overwrite
        const waitingFor = isAwaitingManualBuild ? 'manual builds' : 'CI/CD callback';
        console.log(`[TaskExecutor] Task is waiting for ${waitingFor} - preserving status`);
        console.log(`[TaskExecutor] ✅ Task ${task.taskType} waiting for ${waitingFor}`);
        return {
          success: true,
          externalId: externalId,
          externalData: externalData
        };
      }

      // Update task status to COMPLETED (normal flow)
      // Use updateById since we have the database ID, not taskId
      console.log(`[TaskExecutor] Updating task status to COMPLETED...`);
      console.log(`[TaskExecutor]   externalId: ${externalId}`);
      console.log(`[TaskExecutor]   externalData:`, JSON.stringify(externalData));
      
      await this.releaseTaskRepo.update(task.id, {
        taskStatus: TaskStatus.COMPLETED,
        externalId: externalId,      // NULL for Category B, string for Category A
        externalData: externalData   // Always populated
      });
      console.log(`[TaskExecutor] Task status updated to COMPLETED, verifying...`);
      
      // Verify update persisted
      const verifyTask = await this.releaseTaskRepo.findById(task.id);
      console.log(`[TaskExecutor] Task status AFTER update (verified from DB): ${verifyTask?.taskStatus}`);
      
      if (verifyTask?.taskStatus !== TaskStatus.COMPLETED) {
        console.error(`[TaskExecutor] ❌ CRITICAL: Task ${task.taskType} status NOT COMPLETED in database after update!`);
        console.error(`[TaskExecutor] Expected: COMPLETED, Got: ${verifyTask?.taskStatus}`);
      } else {
        console.log(`[TaskExecutor] ✅ Task ${task.taskType} status COMPLETED and persisted successfully`);
        
        // 🆕 Send notification after task completion (mirrors executeTaskByType pattern)
        await this.notifyTaskCompletion(
          task.taskType,
          context,
          externalData,
          externalId
        );
      }

      

      return {
        success: true,
        externalId: externalId,
        externalData: externalData
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[TaskExecutor] ❌ Task ${task.taskType} (${task.id}) FAILED with error:`, errorMessage);
      if (error instanceof Error && error.stack) {
        console.error(`[TaskExecutor] Stack trace:`, error.stack);
      }
      
      // Update task status to FAILED
      await this.releaseTaskRepo.update(task.id, {
        taskStatus: TaskStatus.FAILED,
        externalData: {
          error: errorMessage,
          timestamp: new Date().toISOString()
        }
      });

      // PAUSE release (not ARCHIVE) - allows recovery after fix
      // Consistent with callback failure handling in BuildCallbackService
      await this.releaseRepo.update(
        context.releaseId,
        {
          status: ReleaseStatus.PAUSED,
          lastUpdatedByAccountId: context.release.lastUpdatedByAccountId || context.release.createdByAccountId || 'system'
        }
      );
      
      // Set pauseType on cronJob so scheduler knows why it's paused
      // ✅ cronJobRepo is required - actively initialized in aws-storage.ts, no null check needed
      const cronJob = await this.cronJobRepo.findByReleaseId(context.releaseId);
      if (cronJob) {
        await this.cronJobRepo.update(cronJob.id, { pauseType: PauseType.TASK_FAILURE });
      }
      
      console.log(`[TaskExecutor] Release ${context.releaseId} PAUSED due to task failure. Can be resumed after fix.`);

      // Send TASK_FAILED notification
      await this.notifyTaskFailure(context, task, errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Execute task by type
   * 
   * Returns raw integration response:
   * - Category A tasks: string (e.g., 'JIRA-456')
   * - Category B tasks: object (e.g., { value: '...', num: '...', timestamp: '...' })
   * 
   * @param taskType - Task type to execute
   * @param context - Task execution context
   * @param integrations - Integration instances
   * @returns Raw integration response (string or object)
   */
  private async executeTaskByType(
    taskType: TaskType,
    context: TaskExecutionContext
  ): Promise<unknown> {
    switch (taskType) {
      // Stage 1 (Kickoff) tasks
      case TaskType.FORK_BRANCH:
        return await this.executeForkBranch(context);

      case TaskType.CREATE_PROJECT_MANAGEMENT_TICKET:
        return await this.executeCreateProjectManagementTicket(context);

      case TaskType.CREATE_TEST_SUITE:
        return await this.executeCreateTestSuite(context);

      case TaskType.TRIGGER_PRE_REGRESSION_BUILDS:
        return await this.executeTriggerPreRegressionBuilds(context);

      // Stage 2 (Regression) tasks
      case TaskType.RESET_TEST_SUITE:
        return await this.executeResetTestSuite(context);

      case TaskType.CREATE_RC_TAG:
        return await this.executeCreateRCTag(context);

      case TaskType.CREATE_RELEASE_NOTES:
        // Stage 2: Regression cycle notes (has regressionId)
        return await this.executeCreateReleaseNotes(context);

      case TaskType.TRIGGER_REGRESSION_BUILDS:
        return await this.executeTriggerRegressionBuilds(context);

      case TaskType.TRIGGER_AUTOMATION_RUNS:
        return await this.executeTriggerAutomationRuns(context);

      case TaskType.AUTOMATION_RUNS:
        return await this.executeAutomationRuns(context);

      // Stage 3 (Pre-Release) tasks
      // Note: PRE_RELEASE_CHERRY_PICKS_REMINDER, SEND_PRE_RELEASE_MESSAGE removed - notifications handled by event system
      // Note: CHECK_PROJECT_RELEASE_APPROVAL removed - no longer needed
      case TaskType.CREATE_RELEASE_TAG:
        return await this.executeCreateReleaseTag(context);

      case TaskType.CREATE_FINAL_RELEASE_NOTES:
        // Stage 3: Final release notes (renamed from CREATE_GITHUB_RELEASE)
        return await this.executeCreateFinalReleaseNotes(context);

      case TaskType.TRIGGER_TEST_FLIGHT_BUILD:
        return await this.executeTestFlightBuild(context);

      case TaskType.CREATE_AAB_BUILD:
        return await this.executeCreateAABBuild(context);

      default:
        throw new Error(RELEASE_ERROR_MESSAGES.TASK_TYPE_NOT_IMPLEMENTED(taskType));
    }
  }

  /**
   * Execute FORK_BRANCH task (Category B)
   * 
   * Creates a new release branch from base branch using SCM integration.
   * Returns: Object with branch details
   */
  private async executeForkBranch(
    context: TaskExecutionContext
    
  ): Promise<Record<string, unknown>> {
    const { release, tenantId, platformTargetMappings } = context;

    if (!this.scmService) {
      throw new Error(RELEASE_ERROR_MESSAGES.SCM_INTEGRATION_NOT_AVAILABLE);
    }

    // Use the branch name stored in the database (set during release creation)
    // Fallback to generating it if not set (for backward compatibility)
    const releaseBranch = release.branch ?? `release/v${generatePlatformVersionString
(platformTargetMappings)}`;
    const baseBranch = release.baseBranch || 'master';

    // Call SCM integration
    await this.scmService.forkOutBranch(
      tenantId,
      releaseBranch,
      baseBranch
    );

    // Note: Branch is already set during release creation (release.branch)
    // Update lastUpdatedByAccountId to track this operation
    await this.releaseRepo.update(
      context.releaseId,
      {
        lastUpdatedByAccountId: release.lastUpdatedByAccountId || release.createdByAccountId || 'system'
      }
    );

    // Build branch URL (SCM service will provide actual repo URL when executing)
    const branchUrl = `${releaseBranch}`;

    // Category B: Return raw object
    return {
      branchName: releaseBranch,
      baseBranch: baseBranch,
      branchUrl: branchUrl,
      timestamp: new Date().toISOString()
    };
  }

  // Note: executePreKickOffReminder method removed - notifications handled by event system

  /**
   * Execute CREATE_PROJECT_MANAGEMENT_TICKET task (Category A)
   * 
   * Creates a project management ticket (JIRA, Linear, etc.) for each platform.
   * Stores ticket IDs in release_platforms_targets_mapping.projectManagementRunId
   * Returns: Simple string (comma-separated ticket IDs)
   */
  private async executeCreateProjectManagementTicket(
    context: TaskExecutionContext
    
  ): Promise<string> {
    const { release } = context;

    // Get release configuration
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const pmConfigId = releaseConfig.projectManagementConfigId;
    
    // Get platform mappings (stores integration results per platform)
    const platformMappings = context.platformTargetMappings;

    if (platformMappings.length === 0) {
      // No platforms configured - return empty success
      return '';
    }

    // Get PlatformTargetMapping model for updating records
    const PlatformTargetMappingModel = this.sequelize.models.PlatformTargetMapping;

    // PM integration must be configured if this task exists
    if (!pmConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.PM_INTEGRATION_NOT_CONFIGURED);
    }

    const ticketIds: string[] = [];
    const failedPlatforms: Array<{ platform: string; error: string }> = [];

    // Create ticket for EACH platform and store result in mapping
    
    for (const mapping of platformMappings) {
      const platformName = mapping.platform;
      
      // ✅ Idempotency check: Skip if ticket already created for this platform
      if (mapping.projectManagementRunId) {
        console.log(`[TaskExecutor] [CREATE_PROJECT_MANAGEMENT_TICKET] Skipping ${platformName} - ticket already exists: ${mapping.projectManagementRunId}`);
        ticketIds.push(mapping.projectManagementRunId);
        continue;
      }
      
      // Call PM service for this platform
      const results = await this.pmTicketService.createTickets({
        pmConfigId: pmConfigId,
        tickets: [{
          platform: platformName as Platform,
          title: `Release ${mapping.version} - ${platformName}`,
          description: `Release ${mapping.version} planned for ${release.targetReleaseDate}`
        }]
      });

      // Get the ticket ID for this platform
      const ticketResult = results[platformName as Platform];
      const ticketId = ticketResult?.ticketKey;

      if (ticketId) {
        ticketIds.push(ticketId);

        // Update the mapping record with the ticket ID
        if (PlatformTargetMappingModel) {
          await PlatformTargetMappingModel.update(
            { projectManagementRunId: ticketId },
            { where: { id: mapping.id } }
          );
        }
      } else {
        // Track failed platform (same pattern as BUILD tasks)
        const error = ticketResult?.error ?? 'Failed to create ticket - no ticket ID returned';
        failedPlatforms.push({ platform: platformName, error });
      }
    }

    // Fail if ANY platform failed (same as getTaskBuildStatus pattern)
    if (failedPlatforms.length > 0) {
      const failureDetails = failedPlatforms
        .map(f => `${f.platform}: ${f.error}`)
        .join('; ');
      throw new Error(
        `Failed to create tickets for ${failedPlatforms.length}/${platformMappings.length} platforms. ${failureDetails}`
      );
    }
    
    // Category A: Return comma-separated ticket IDs
    return ticketIds.join(',');
  }

  /**
   * Execute CREATE_TEST_SUITE task (Category A)
   * 
   * Creates a test suite in the test platform (Checkmate, TestRail, etc.) for each platform.
   * Stores run IDs in release_platforms_targets_mapping.testManagementRunId
   * Returns: Simple string (comma-separated run IDs)
   */
  private async executeCreateTestSuite(
    context: TaskExecutionContext
    
  ): Promise<string> {
    const { release } = context;

    // 1. Look up ReleaseConfiguration
    const config = await this.getReleaseConfig(release.releaseConfigId);
    
    // 2. Extract test management config ID
    const testConfigId = config.testManagementConfigId;

    // Get platform mappings
    const platformMappings = context.platformTargetMappings;

    if (platformMappings.length === 0) {
      return 'no-platforms-configured';
    }

    // Get PlatformTargetMapping model for updating records
    const PlatformTargetMappingModel = this.sequelize.models.PlatformTargetMapping;
    
    // 3. Test management must be configured if this task exists
    if (!testConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.TEST_MANAGEMENT_NOT_CONFIGURED);
    }
    
    if (!this.testRunService) {
      throw new Error(RELEASE_ERROR_MESSAGES.TEST_PLATFORM_NOT_AVAILABLE);
    }

    const runIds: string[] = [];
    const failedPlatforms: Array<{ platform: string; error: string }> = [];

    // Create test run for EACH platform and store result in mapping
    for (const mapping of platformMappings) {
      const platformName = mapping.platform;
      
      // ✅ Idempotency check: Skip if test run already created for this platform
      if (mapping.testManagementRunId) {
        console.log(`[TaskExecutor] [CREATE_TEST_SUITE] Skipping ${platformName} - test run already exists: ${mapping.testManagementRunId}`);
        runIds.push(mapping.testManagementRunId);
        continue;
      }
      
      // Call service with specific platform filter to avoid creating duplicate runs
      const results = await this.testRunService.createTestRuns({
        testManagementConfigId: testConfigId,
        runName: `Release ${mapping.version} - ${platformName} Test Suite`,
        platforms: [platformName as TestPlatform]
      });
      
      // Get the run ID for this platform
      const platformResult = results[platformName as keyof typeof results];
      const runId = platformResult && 'runId' in platformResult ? platformResult.runId : null;

      if (runId) {
        runIds.push(runId);

        // Update the mapping record with the run ID
        if (PlatformTargetMappingModel) {
          await PlatformTargetMappingModel.update(
            { testManagementRunId: runId },
            { where: { id: mapping.id } }
          );
        }
      } else {
        // Track failed platform (same pattern as BUILD tasks)
        const error = platformResult && 'error' in platformResult 
          ? platformResult.error 
          : 'Failed to create test run - no run ID returned';
        failedPlatforms.push({ platform: platformName, error });
      }
    }

    // Fail if ANY platform failed (same as getTaskBuildStatus pattern)
    if (failedPlatforms.length > 0) {
      const failureDetails = failedPlatforms
        .map(f => `${f.platform}: ${f.error}`)
        .join('; ');
      throw new Error(
        `Failed to create test runs for ${failedPlatforms.length}/${platformMappings.length} platforms. ${failureDetails}`
      );
    }
    
    return runIds.length > 0 ? runIds.join(',') : 'no-runs-created';
  }

  /**
   * Execute TRIGGER_PRE_REGRESSION_BUILDS task (Category A)
   * 
   * Two modes:
   * 1. Manual Mode (hasManualBuildUpload=true): Checks release_uploads table for builds
   * 2. CI/CD Mode (hasManualBuildUpload=false): Triggers CI/CD pipeline
   * 
   * Returns: Simple string (comma-separated build numbers, e.g., '1.4.3-ios-1,1.4.3-and-1')
   *          or 'AWAITING_MANUAL_BUILD' if waiting for uploads
   */
  private async executeTriggerPreRegressionBuilds(
    context: TaskExecutionContext
  ): Promise<string> {
    const { release, tenantId, task } = context;

    // Get platforms from platformTargetMappings (new schema uses ENUMs)
    const platformMappings = context.platformTargetMappings;
    if (platformMappings.length === 0) {
      return '';
    }
    
    const platforms = platformMappings.map(m => m.platform as PlatformName);

    // ========================================================================
    // MANUAL MODE: Check release_uploads table for builds
    // ========================================================================
    if (release.hasManualBuildUpload) {
      console.log(`[TaskExecutor] Manual mode for KICKOFF: checking uploads for platforms [${platforms.join(', ')}]`);
      
      // ✅ releaseUploadsRepo is required - actively initialized in aws-storage.ts, no null check needed

      // Check if all platforms have uploads ready
      const readiness = await this.releaseUploadsRepo.checkAllPlatformsReady(
        context.releaseId,
        BUILD_STAGE.KICKOFF,
        platforms
      );

      console.log(`[TaskExecutor] Manual mode check for KICKOFF: allReady=${readiness.allReady}, uploaded=[${readiness.uploadedPlatforms.join(',')}], missing=[${readiness.missingPlatforms.join(',')}]`);

      if (!readiness.allReady) {
        // Guard: Only send notification if task is NOT already AWAITING_MANUAL_BUILD
        const isNotAlreadyAwaiting = task.taskStatus !== TaskStatus.AWAITING_MANUAL_BUILD;
        
        if (isNotAlreadyAwaiting && this.releaseNotificationService) {
          try {
            const buildType = TASK_TYPE_TO_NAME[task.taskType];
            const delivrUrl = buildDelivrUrl(context.tenantId, context.releaseId);
            
            await this.releaseNotificationService.notify({
              type: NotificationType.MANUAL_BUILD_UPLOAD_REMINDER,
              tenantId: context.tenantId,
              releaseId: context.releaseId,
              buildType: buildType,
              delivrUrl: delivrUrl,
              isSystemGenerated: true
            });
            
            console.log(`[TaskExecutor] Sent MANUAL_BUILD_UPLOAD_REMINDER notification for task ${task.id} (${buildType})`);
          } catch (error) {
            // Log but don't throw - notification failure shouldn't block status update
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[TaskExecutor] Failed to send manual build upload reminder notification:`, errorMessage);
          }
        }
        
        // Set task to AWAITING_MANUAL_BUILD - waiting for user to upload builds
        await this.releaseTaskRepo.update(task.id, {
          taskStatus: TaskStatus.AWAITING_MANUAL_BUILD
        });
        console.log(`[TaskExecutor] Task ${task.id} set to AWAITING_MANUAL_BUILD - waiting for manual builds`);
        return 'AWAITING_MANUAL_BUILD';
      }

      // All platforms ready - consume uploads and create build records
      const uploads = await this.releaseUploadsRepo.findUnused(context.releaseId, BUILD_STAGE.KICKOFF);
      const BuildModel = this.sequelize.models.Build;
      const buildIds: string[] = [];

      for (const mapping of platformMappings) {
        const platformName = mapping.platform as PlatformName;
        const targetName = mapping.target;
        const upload = uploads.find(u => u.platform === platformName);

        if (upload) {
          // Mark upload as used
          await this.releaseUploadsRepo.markAsUsed(upload.id, task.id, null);

          // Create build record from manual upload
          const buildId = uuidv4();
          const versionName = mapping.version;
          if (BuildModel) {
            await BuildModel.create({
              id: buildId,
              tenantId: tenantId,
              buildNumber: null,
              artifactVersionName: versionName,
              artifactPath: upload.artifactPath,
              releaseId: context.releaseId,
              platform: platformName,
              storeType: targetName,
              regressionId: null,
              ciRunId: null,
              ciRunType: null,
              buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED,
              buildType: BUILD_TYPE.MANUAL,
              buildStage: BUILD_STAGE.KICKOFF,
              queueLocation: null,
              workflowStatus: null,
              taskId: task.id,
              testflightNumber: upload.testflightNumber ?? null,
              internalTrackLink: upload.internalTrackLink ?? null
            });
          }

          buildIds.push(buildId);
          console.log(`[TaskExecutor] Consumed manual upload for ${platformName}: ${upload.id}`);
        }
      }

      console.log(`[TaskExecutor] Manual mode KICKOFF completed: ${buildIds.join(',')}`);
      return buildIds.join(',');
    }

    // ========================================================================
    // CI/CD MODE: Trigger CI/CD pipeline
    // ========================================================================
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const ciConfigId = releaseConfig.ciConfigId;

    if (!ciConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.CICD_WORKFLOW_NOT_CONFIGURED);
    }

    const BuildModel = this.sequelize.models.Build;

    if (!BuildModel) {
      throw new Error(RELEASE_ERROR_MESSAGES.REQUIRED_MODELS_NOT_FOUND_BUILD);
    }

    const buildIds: string[] = [];

    for (const mapping of platformMappings) {
      const platformName = mapping.platform;
      const targetName = mapping.target;

      // ✅ Idempotency check: Skip if build already uploaded for this platform
      const existingBuild = await BuildModel.findOne({
        where: {
          taskId: task.id,
          platform: platformName,
          buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED
        }
      });

      if (existingBuild) {
        console.log(`[TaskExecutor] [TRIGGER_PRE_REGRESSION_BUILDS] Skipping ${platformName} - build already uploaded: ${existingBuild.get('id')}`);
        buildIds.push(existingBuild.get('id') as string);
        continue;
      }

      try {
        const result = await this.triggerWorkflowByConfigId(
          ciConfigId,
          tenantId,
          platformName,
          WorkflowType.PRE_REGRESSION_BUILD,
          {
            version: mapping.version,
            branch: release.branch,
          }
        );

        const buildId = uuidv4();
        const versionName = mapping.version;

        await BuildModel.create({
          id: buildId,
          tenantId: tenantId,
          buildNumber: null,
          artifactVersionName: versionName,
          artifactPath: null,
          releaseId: context.releaseId,
          platform: platformName,
          storeType: targetName,
          regressionId: null,
          ciRunId: null, // CI/CD system will populate this via callback
          ciRunType: result.providerType,
          buildUploadStatus: BUILD_UPLOAD_STATUS.PENDING,
          buildType: BUILD_TYPE.CI_CD,
          buildStage: BUILD_STAGE.KICKOFF,
          queueLocation: result.queueLocation,
          workflowStatus: WORKFLOW_STATUS.PENDING,
          taskId: task.id,
          testflightNumber: null,
          internalTrackLink: null
        });

        buildIds.push(buildId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[TaskExecutor] Failed to trigger pre-regression build workflow for platform ${platformName}:`, errorMessage);
        if (error instanceof Error && error.stack) {
          console.error(`[TaskExecutor] Stack trace:`, error.stack);
        }
        throw new Error(`Failed to trigger pre-regression build workflow for platform ${platformName}: ${errorMessage}`);
      }
    }

    // CI/CD Mode: Set task to AWAITING_CALLBACK - waiting for CI/CD pipeline callback
    await this.releaseTaskRepo.update(task.id, {
      taskStatus: TaskStatus.AWAITING_CALLBACK
    });
    console.log(`[TaskExecutor] Task ${task.id} set to AWAITING_CALLBACK - waiting for CI/CD callback`);

    // Return special marker so executeTask() knows not to mark as COMPLETED
    return 'AWAITING_CI_CD';
  }

  /**
   * Execute RESET_TEST_SUITE task (Category B)
   * 
   * Resets the test suite for a new regression cycle.
   * Returns: Object with reset details
   */
  private async executeResetTestSuite(
    context: TaskExecutionContext
    
  ): Promise<Record<string, unknown>> {
    const { release, tenantId: _tenantId, task } = context;

    if (!this.testRunService) {
      throw new Error(RELEASE_ERROR_MESSAGES.TEST_PLATFORM_NOT_AVAILABLE);
    }

    // Get suite ID from previous CREATE_TEST_SUITE task
    const testSuiteTask = await this.releaseTaskRepo.findByTaskType(
      context.releaseId,
      TaskType.CREATE_TEST_SUITE
    );

    if (!testSuiteTask || !testSuiteTask.externalId) {
      throw new Error(RELEASE_ERROR_MESSAGES.TEST_SUITE_NOT_FOUND);
    }

    const runId = testSuiteTask.externalId;

    // 1. Look up ReleaseConfiguration
    const config = await this.getReleaseConfig(release.releaseConfigId);
    
    // 2. Extract test management config ID
    const testConfigId = config.testManagementConfigId;
    
    if (!testConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.TEST_MANAGEMENT_NOT_CONFIGURED);
    }

    // 3. Reset test run - service returns ResetTestRunResponse
    await this.testRunService.resetTestRun({
      runId: runId,
      testManagementConfigId: testConfigId
    });

    // Category B: Return raw object
    return {
      runId: runId,
      action: 'reset',
      regressionId: task.regressionId,
      resetAt: new Date().toISOString()
    };
  }

  /**
   * Execute CREATE_RC_TAG task
   * 
   * Creates an RC (Release Candidate) tag for the regression cycle.
   */
  /**
   * Execute CREATE_RC_TAG task (Category B)
   * 
   * Creates RC tag in SCM.
   * Returns: Object with tag details
   */
  private async executeCreateRCTag(
    context: TaskExecutionContext
    
  ): Promise<Record<string, unknown>> {
    const { release, tenantId, task, platformTargetMappings } = context;

    if (!this.scmService) {
      throw new Error(RELEASE_ERROR_MESSAGES.SCM_INTEGRATION_NOT_AVAILABLE);
    }

    // Get cycle tag from task's regression cycle
    if (!task.regressionId) {
      throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_ID_NOT_FOUND);
    }

    // Get regression cycle to get cycleTag
    const RegressionCycleModel = this.sequelize.models.RegressionCycle;

    if (!RegressionCycleModel) {
        throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_MODEL_NOT_FOUND);
    }

    const cycle = await RegressionCycleModel.findByPk(task.regressionId);
    if (!cycle) {
      throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_NOT_FOUND(task.regressionId));
    }

    const cycleTag = (cycle as any).cycleTag;
    if (!cycleTag) {
        throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_TAG_NOT_FOUND(task.regressionId));
    }

    const version = generatePlatformVersionString
(platformTargetMappings);
    const releaseBranch = release.branch || `release/v${version}`;

    // Create RC tag - integration returns tag name
    await this.scmService.createReleaseTag(
      tenantId,
      releaseBranch,
      cycleTag,
      undefined, // targets (not needed for RC tags)
      version
    );

    // Category B: Return raw object
    return {
      value: cycleTag,
      tag: cycleTag,
      branch: releaseBranch,
      version: version,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute CREATE_RELEASE_NOTES task
   * 
   * Generates release notes for the regression cycle.
   */
  /**
   * Execute CREATE_RELEASE_NOTES task (Category B)
   * 
   * Creates release notes for regression cycle.
   * Returns: Object with notes details
   */
  private async executeCreateReleaseNotes(
    context: TaskExecutionContext
    
  ): Promise<Record<string, unknown>> {
    const { release, tenantId, task, platformTargetMappings } = context;

    if (!this.scmService) {
      throw new Error(RELEASE_ERROR_MESSAGES.SCM_INTEGRATION_NOT_AVAILABLE);
    }

    // Get current RC tag
    if (!task.regressionId) {
      throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_ID_NOT_FOUND);
    }

    const RegressionCycleModel = this.sequelize.models.RegressionCycle;

    if (!RegressionCycleModel) {
        throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_MODEL_NOT_FOUND);
    }

    const cycle = await RegressionCycleModel.findByPk(task.regressionId);
    if (!cycle) {
      throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_NOT_FOUND(task.regressionId));
    }

    const currentTag = (cycle as any).cycleTag;
    if (!currentTag) {
        throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_TAG_NOT_FOUND(task.regressionId));
    }

    // Get previous tag (from previous cycle or base release)
    // ✅ Use regressionCycleRepository from storage (passed via constructor) - actively initialized, always available
    let previousTag: string | undefined;
    const previousCycle = await this.regressionCycleRepo.findPrevious(context.releaseId);
    if (previousCycle && previousCycle.length > 0) {
      previousTag = previousCycle[0].cycleTag || undefined;
    }

    // Create release notes - integration returns notes content (string)
    const notes = await this.scmService.createReleaseNotes(
      tenantId,
      currentTag,
      previousTag,
      generatePlatformVersionString
(platformTargetMappings),
      undefined // parentTargets (not needed for regression notes)
    );

    // Category B: Return raw object
    return {
      notes: notes,
      currentTag: currentTag,
      previousTag: previousTag || null,
      regressionId: task.regressionId,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Execute TRIGGER_REGRESSION_BUILDS task
   * 
   * Triggers regression builds via CI/CD integration.
   * Creates build records in builds table for each platform, linked to regression cycle.
   */
  /**
   * Execute TRIGGER_REGRESSION_BUILDS task (Category A)
   * 
   * Two modes:
   * 1. Manual Mode (hasManualBuildUpload=true): Checks release_uploads table for builds
   * 2. CI/CD Mode (hasManualBuildUpload=false): Triggers CI/CD pipeline
   * 
   * Returns: Simple string (comma-separated build numbers, e.g., '1.4.3-ios-2,1.4.3-and-2')
   *          or 'AWAITING_MANUAL_BUILD' if waiting for uploads
   */
  private async executeTriggerRegressionBuilds(
    context: TaskExecutionContext
  ): Promise<string> {
    const { release, tenantId, task } = context;

    if (!task.regressionId) {
      throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_ID_NOT_FOUND);
    }

    const platformMappings = context.platformTargetMappings;
    if (platformMappings.length === 0) {
      return '';
    }
    
    const platforms = platformMappings.map(m => m.platform as PlatformName);

    // ========================================================================
    // MANUAL MODE: Check release_uploads table for builds
    // ========================================================================
    if (release.hasManualBuildUpload) {
      console.log(`[TaskExecutor] Manual mode for REGRESSION (cycle ${task.regressionId}): checking uploads for platforms [${platforms.join(', ')}]`);
      
      // ✅ releaseUploadsRepo is required - actively initialized in aws-storage.ts, no null check needed

      // Check if all platforms have uploads ready
      const readiness = await this.releaseUploadsRepo.checkAllPlatformsReady(
        context.releaseId,
        'REGRESSION',
        platforms
      );

      console.log(`[TaskExecutor] Manual mode check for REGRESSION: allReady=${readiness.allReady}, uploaded=[${readiness.uploadedPlatforms.join(',')}], missing=[${readiness.missingPlatforms.join(',')}]`);

      if (!readiness.allReady) {
        // Guard: Only send notification if task is NOT already AWAITING_MANUAL_BUILD
        const isNotAlreadyAwaiting = task.taskStatus !== TaskStatus.AWAITING_MANUAL_BUILD;
        
        if (isNotAlreadyAwaiting && this.releaseNotificationService) {
          try {
            const buildType = TASK_TYPE_TO_NAME[task.taskType];
            const delivrUrl = buildDelivrUrl(context.tenantId, context.releaseId);
            
            await this.releaseNotificationService.notify({
              type: NotificationType.MANUAL_BUILD_UPLOAD_REMINDER,
              tenantId: context.tenantId,
              releaseId: context.releaseId,
              buildType: buildType,
              delivrUrl: delivrUrl,
              isSystemGenerated: true
            });
            
            console.log(`[TaskExecutor] Sent MANUAL_BUILD_UPLOAD_REMINDER notification for task ${task.id} (${buildType})`);
          } catch (error) {
            // Log but don't throw - notification failure shouldn't block status update
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[TaskExecutor] Failed to send manual build upload reminder notification:`, errorMessage);
          }
        }
        
        // Set task to AWAITING_MANUAL_BUILD - waiting for user to upload regression builds
        await this.releaseTaskRepo.update(task.id, {
          taskStatus: TaskStatus.AWAITING_MANUAL_BUILD
        });
        console.log(`[TaskExecutor] Task ${task.id} set to AWAITING_MANUAL_BUILD - waiting for manual regression builds`);
        return 'AWAITING_MANUAL_BUILD';
      }

      // All platforms ready - consume uploads
      const uploads = await this.releaseUploadsRepo.findUnused(context.releaseId, 'REGRESSION');
      const BuildModel = this.sequelize.models.Build;
      const buildIds: string[] = [];

      for (const mapping of platformMappings) {
        const platformName = mapping.platform as PlatformName;
        const targetName = mapping.target;
        const upload = uploads.find(u => u.platform === platformName);

        if (upload) {
          // Mark upload as used (with cycle ID for regression)
          await this.releaseUploadsRepo.markAsUsed(upload.id, task.id, task.regressionId);

          // Create build record from manual upload
          const buildId = uuidv4();
          const versionName = mapping.version;
          if (BuildModel) {
            await BuildModel.create({
              id: buildId,
              tenantId: tenantId,
              buildNumber: null,
              artifactVersionName: versionName,
              artifactPath: upload.artifactPath,
              releaseId: context.releaseId,
              platform: platformName,
              storeType: targetName,
              regressionId: task.regressionId,
              ciRunId: null,
              ciRunType: null,
              buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED,
              buildType: BUILD_TYPE.MANUAL,
              buildStage: BUILD_STAGE.REGRESSION,
              queueLocation: null,
              workflowStatus: null,
              taskId: task.id,
              testflightNumber: upload.testflightNumber ?? null,
              internalTrackLink: upload.internalTrackLink ?? null
            });
          }

          buildIds.push(buildId);
          console.log(`[TaskExecutor] Consumed manual upload for ${platformName} (cycle ${task.regressionId}): ${upload.id}`);
        }
      }

      console.log(`[TaskExecutor] Manual mode REGRESSION completed: ${buildIds.join(',')}`);
      return buildIds.join(',');
    }

    // ========================================================================
    // CI/CD MODE: Trigger CI/CD pipeline
    // ========================================================================
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const ciConfigId = releaseConfig.ciConfigId;

    if (!ciConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.CICD_WORKFLOW_NOT_CONFIGURED);
    }

    const BuildModel = this.sequelize.models.Build;

    if (!BuildModel) {
      throw new Error(RELEASE_ERROR_MESSAGES.REQUIRED_MODELS_NOT_FOUND_BUILD);
    }

    const buildIds: string[] = [];

    for (const mapping of platformMappings) {
      const platformName = mapping.platform;
      const targetName = mapping.target;

      // ✅ Idempotency check: Skip if build already uploaded for this platform
      const existingBuild = await BuildModel.findOne({
        where: {
          taskId: task.id,
          platform: platformName,
          buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED
        }
      });

      if (existingBuild) {
        console.log(`[TaskExecutor] [TRIGGER_REGRESSION_BUILDS] Skipping ${platformName} - build already uploaded: ${existingBuild.get('id')}`);
        buildIds.push(existingBuild.get('id') as string);
        continue;
      }

      try {
        const result = await this.triggerWorkflowByConfigId(
          ciConfigId,
          tenantId,
          platformName,
          WorkflowType.REGRESSION_BUILD,
          {
            version: mapping.version,
            branch: release.branch,
          }
        );

        const buildId = uuidv4();
        const versionName = mapping.version;

        await BuildModel.create({
          id: buildId,
          tenantId: tenantId,
          buildNumber: null,
          artifactVersionName: versionName,
          artifactPath: null,
          releaseId: context.releaseId,
          platform: platformName,
          storeType: targetName,
          regressionId: task.regressionId,
          ciRunId: null, // CI/CD system will populate this via callback
          ciRunType: result.providerType,
          buildUploadStatus: BUILD_UPLOAD_STATUS.PENDING,
          buildType: BUILD_TYPE.CI_CD,
          buildStage: BUILD_STAGE.REGRESSION,
          queueLocation: result.queueLocation,
          workflowStatus: WORKFLOW_STATUS.PENDING,
          taskId: task.id,
          testflightNumber: null,
          internalTrackLink: null
        });

        buildIds.push(buildId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[TaskExecutor] Failed to trigger regression build workflow for platform ${platformName}:`, errorMessage);
        if (error instanceof Error && error.stack) {
          console.error(`[TaskExecutor] Stack trace:`, error.stack);
        }
        throw new Error(`Failed to trigger regression build workflow for platform ${platformName}: ${errorMessage}`);
      }
    }

    // CI/CD Mode: Set task to AWAITING_CALLBACK - waiting for CI/CD pipeline callback
    await this.releaseTaskRepo.update(task.id, {
      taskStatus: TaskStatus.AWAITING_CALLBACK
    });
    console.log(`[TaskExecutor] Task ${task.id} set to AWAITING_CALLBACK - waiting for CI/CD callback`);

    // Return special marker so executeTask() knows not to mark as COMPLETED
    return 'AWAITING_CI_CD';
  }

  /**
   * Execute TRIGGER_AUTOMATION_RUNS task (Category A)
   * 
   * Triggers automation test runs via CI/CD integration.
   * Returns: Simple string (e.g., 'run-123')
   */
  private async executeTriggerAutomationRuns(
    context: TaskExecutionContext
  ): Promise<string> {
    const { release, tenantId, task } = context;

    if (!task.regressionId) {
      throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_ID_NOT_FOUND);
    }

    // Get release configuration
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const ciConfigId = releaseConfig.ciConfigId;
    
    // Get platforms from platformTargetMappings (new schema uses ENUMs)
    const platformMappings = context.platformTargetMappings;
    if (platformMappings.length === 0) {
      // No platforms configured - return empty success
      return '';
    }

    // CI/CD config must be configured if this task exists
    if (!ciConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.CICD_WORKFLOW_NOT_CONFIGURED);
    }

    const runIds: string[] = [];

    // Trigger automation for each platform-target mapping
    for (const mapping of platformMappings) {
      const platformName = mapping.platform;

      try {
        const result = await this.triggerWorkflowByConfigId(
          ciConfigId,
          tenantId,
          platformName,
          WorkflowType.AUTOMATION_BUILD,
          {
            platform: platformName,
            version: mapping.version,
            branch: release.branch,
            regressionId: task.regressionId,
            buildType: CICD_JOB_BUILD_TYPE.AUTOMATION
          }
        );

        runIds.push(result.queueLocation ?? `run-${Date.now()}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[TaskExecutor] Failed to trigger automation build workflow for platform ${platformName}:`, errorMessage);
        if (error instanceof Error && error.stack) {
          console.error(`[TaskExecutor] Stack trace:`, error.stack);
        }
        throw new Error(`Failed to trigger automation build workflow for platform ${platformName}: ${errorMessage}`);
      }
    }

    // Category A: Return raw string
    return runIds.join(',');
  }

  /**
   * Execute AUTOMATION_RUNS task
   * 
   * Checks automation test run status.
   */
  /**
   * Execute AUTOMATION_RUNS task (Category B)
   * 
   * Waits for automation runs to complete.
   * Returns: Object with test status
   */
  private async executeAutomationRuns(
    context: TaskExecutionContext
    
  ): Promise<Record<string, unknown>> {
    const { release, tenantId: _tenantId, task, platformTargetMappings } = context;

    if (!this.testRunService) {
      throw new Error(RELEASE_ERROR_MESSAGES.TEST_PLATFORM_NOT_AVAILABLE);
    }

    // Get first platform from platformTargetMappings
    if (!platformTargetMappings || platformTargetMappings.length === 0) {
      throw new Error('No platform targets configured for release');
    }
    const platform = platformTargetMappings[0].platform as TestPlatform;

    // Get automation run ID from TRIGGER_AUTOMATION_RUNS task
    // Get all tasks for this regression cycle and find TRIGGER_AUTOMATION_RUNS
    const cycleTasks = await this.releaseTaskRepo.findByRegressionCycleId(task.regressionId!);
    
    // Find the TRIGGER_AUTOMATION_RUNS task for this regression cycle
    const automationTask = cycleTasks.find(t => t.taskType === TaskType.TRIGGER_AUTOMATION_RUNS);
    if (!automationTask || !automationTask.externalId) {
      throw new Error(RELEASE_ERROR_MESSAGES.AUTOMATION_RUN_NOT_FOUND);
    }

    // Use automation run ID for test status check
    const runId = automationTask.externalId;
    
    // 1. Look up ReleaseConfiguration
    const config = await this.getReleaseConfig(release.releaseConfigId);
    
    // 2. Extract test management config ID
    const testConfigId = config.testManagementConfigId;
    
    if (!testConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.TEST_MANAGEMENT_NOT_CONFIGURED);
    }
    
    // 3. Get test status
    const status = await this.testRunService.getTestStatus({
      runId: runId,
      testManagementConfigId: testConfigId,
      platform: platform
    });

    // Category B: Return raw object
    return {
      runId: runId,
      status: status.status,
      passed: status.passed,
      failed: status.failed,
      total: status.total,
      untested: status.untested,
      blocked: status.blocked,
      inProgress: status.inProgress,
      passPercentage: status.passPercentage,
      threshold: status.threshold,
      isPassingThreshold: status.isPassingThreshold,
      readyForApproval: status.readyForApproval,
      url: status.url,
      completedAt: new Date().toISOString()
    };
  }

  // Note: executeSendRegressionBuildMessage method removed - notifications handled by event system
  // Note: executePreReleaseCherryPicksReminder method removed - notifications handled by event system

  /**
   * Execute CREATE_RELEASE_TAG task
   * 
   * Creates final release tag (e.g., "wps_1.0.0" from targets + version).
   */
  /**
   * Execute CREATE_RELEASE_TAG task (Category B)
   * 
   * Creates final release tag.
   * Returns: Object with tag details
   */
  private async executeCreateReleaseTag(
    context: TaskExecutionContext
    
  ): Promise<Record<string, unknown>> {
    const { release, tenantId } = context;

    if (!this.scmService) {
      throw new Error(RELEASE_ERROR_MESSAGES.SCM_INTEGRATION_NOT_AVAILABLE);
    }

    // Get targets from platformTargetMappings (new schema uses ENUMs)
    const platformMappings = context.platformTargetMappings || [];
    const targets: string[] = Array.from(new Set(platformMappings.map(m => m.target)));

    // Create final release tag - integration generates tag from targets + version (returns string)
    const version = generatePlatformVersionString
(platformMappings);
    const tagName = await this.scmService.createReleaseTag(
      tenantId,
      release.branch || `release/v${version}`,
      undefined, // No explicit tagName - let integration generate from targets + version
      targets,
      version
    );

    // Update release record with the created tag
    await this.releaseRepo.update(release.id, {
      releaseTag: tagName
    });

    // Category B: Return raw object
    return {
      value: tagName,
      tagName: tagName,
      targets: targets,
      version: version,
      branch: release.branch,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute CREATE_FINAL_RELEASE_NOTES task for Stage 3 (final release notes)
   * Renamed from CREATE_GITHUB_RELEASE
   * 
   * Creates final release notes for the release (not regression cycle notes).
   * Note: CREATE_RELEASE_NOTES is used for Stage 2 (regression cycles) only.
   */
  /**
   * Execute CREATE_FINAL_RELEASE_NOTES task (Category B)
   * 
   * Creates final release notes (renamed from CREATE_GITHUB_RELEASE).
   * Returns: Object with release details
   */
  private async executeCreateFinalReleaseNotes(
    context: TaskExecutionContext
    
  ): Promise<Record<string, unknown>> {
    const { release, tenantId, platformTargetMappings } = context;

    if (!this.scmService) {
      throw new Error(RELEASE_ERROR_MESSAGES.SCM_INTEGRATION_NOT_AVAILABLE);
    }

    // Get current tag from release record (set by CREATE_RELEASE_TAG task)
    // This matches OG Delivr pattern where releaseTag is stored on the release
    if (!release.releaseTag) {
      throw new Error(RELEASE_ERROR_MESSAGES.CREATE_RELEASE_TAG_TASK_MISSING);
    }

    const currentTag = release.releaseTag;

    // Get previous tag from parent release (if exists)
    // This matches OG Delivr pattern: release?.parent?.releaseTag
    let previousTag: string | undefined = undefined;

    if (release.baseReleaseId) {
      const parentRelease = await this.releaseRepo.findById(release.baseReleaseId);
      if (parentRelease && parentRelease.releaseTag) {
        // Use parent's releaseTag directly (just like OG Delivr)
        previousTag = parentRelease.releaseTag;
      }
    }

    // Create final release notes - returns release notes URL (string)
    const targetDate = release.targetReleaseDate 
      ? (typeof release.targetReleaseDate === 'string' ? new Date(release.targetReleaseDate) : release.targetReleaseDate)
      : new Date();
    const releaseUrl = await this.scmService.createFinalReleaseNotes(
      tenantId,
      currentTag,
      previousTag,
      targetDate
    );

    // Category B: Return raw object
    return {
      releaseUrl: releaseUrl,
      currentTag: currentTag,
      previousTag: previousTag ?? null,
      version: generatePlatformVersionString
(platformTargetMappings),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute TRIGGER_TEST_FLIGHT_BUILD task (Category A)
   * 
   * Two modes:
   * 1. Manual Mode (hasManualBuildUpload=true): Checks release_uploads table for IOS build
   * 2. CI/CD Mode (hasManualBuildUpload=false): Triggers CI/CD pipeline
   * 
   * Returns: Simple string (e.g., 'testflight-123')
   *          or 'AWAITING_MANUAL_BUILD' if waiting for uploads
   */
  private async executeTestFlightBuild(
    context: TaskExecutionContext
  ): Promise<string> {
    const { release, tenantId, task } = context;

    // Verify iOS platform exists using platformTargetMappings
    const platformMappings = context.platformTargetMappings;
    const hasIOS = platformMappings.some(m => m.platform === BUILD_PLATFORM.IOS);

    if (!hasIOS) {
        throw new Error(RELEASE_ERROR_MESSAGES.IOS_PLATFORM_REQUIRED);
    }

    // Get iOS mapping for version
    const iosMapping = platformMappings.find(m => m.platform === BUILD_PLATFORM.IOS);

    // ========================================================================
    // MANUAL MODE: Check release_uploads table for IOS build
    // ========================================================================
    if (release.hasManualBuildUpload) {
      console.log(`[TaskExecutor] Manual mode for PRE_RELEASE (TestFlight): checking uploads for IOS`);
      
      // ✅ releaseUploadsRepo is required - actively initialized in aws-storage.ts, no null check needed

      // Check if IOS has upload ready
      const readiness = await this.releaseUploadsRepo.checkAllPlatformsReady(
        context.releaseId,
        'PRE_RELEASE',
        [PlatformName.IOS]
      );

      console.log(`[TaskExecutor] Manual mode check for PRE_RELEASE (TestFlight): allReady=${readiness.allReady}`);

      if (!readiness.allReady) {
        // Guard: Only send notification if task is NOT already AWAITING_MANUAL_BUILD
        const isNotAlreadyAwaiting = task.taskStatus !== TaskStatus.AWAITING_MANUAL_BUILD;
        
        if (isNotAlreadyAwaiting && this.releaseNotificationService) {
          try {
            const buildType = TASK_TYPE_TO_NAME[task.taskType];
            const delivrUrl = buildDelivrUrl(context.tenantId, context.releaseId);
            
            await this.releaseNotificationService.notify({
              type: NotificationType.MANUAL_BUILD_UPLOAD_REMINDER,
              tenantId: context.tenantId,
              releaseId: context.releaseId,
              buildType: buildType,
              delivrUrl: delivrUrl,
              isSystemGenerated: true
            });
            
            console.log(`[TaskExecutor] Sent MANUAL_BUILD_UPLOAD_REMINDER notification for task ${task.id} (${buildType})`);
          } catch (error) {
            // Log but don't throw - notification failure shouldn't block status update
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[TaskExecutor] Failed to send manual build upload reminder notification:`, errorMessage);
          }
        }
        
        // Set task to AWAITING_MANUAL_BUILD - waiting for manual TestFlight build
        await this.releaseTaskRepo.update(task.id, {
          taskStatus: TaskStatus.AWAITING_MANUAL_BUILD
        });
        console.log(`[TaskExecutor] Task ${task.id} set to AWAITING_MANUAL_BUILD - waiting for manual TestFlight build`);
        return 'AWAITING_MANUAL_BUILD';
      }

      // IOS ready - consume upload and create build record
      const uploads = await this.releaseUploadsRepo.findUnused(context.releaseId, 'PRE_RELEASE');
      const BuildModel = this.sequelize.models.Build;
      
      const iosUpload = uploads.find(u => u.platform === BUILD_PLATFORM.IOS);
      if (iosUpload && BuildModel) {
        // Mark upload as used
        await this.releaseUploadsRepo.markAsUsed(iosUpload.id, task.id, null);
        
        // For iOS TestFlight, buildNumber must be the testflightNumber
        const hasTestflightNumber = iosUpload.testflightNumber !== null && iosUpload.testflightNumber !== undefined;
        if (!hasTestflightNumber) {
          throw new Error(RELEASE_ERROR_MESSAGES.TESTFLIGHT_NUMBER_REQUIRED);
        }
        const buildNumber = iosUpload.testflightNumber;

        // Extract filename from artifactPath for logging
        const uploadFileName = iosUpload.artifactPath?.split('/').pop() ?? iosUpload.artifactPath ?? 'unknown';

        // Create build record from manual upload
        const buildId = uuidv4();
        const versionName = iosMapping?.version;
        await BuildModel.create({
          id: buildId,
          tenantId: tenantId,
          buildNumber: buildNumber,
          artifactVersionName: versionName,
          artifactPath: iosUpload.artifactPath,
          releaseId: context.releaseId,
          platform: BUILD_PLATFORM.IOS,
          storeType: STORE_TYPE.APP_STORE,
          regressionId: null,
          ciRunType: null,
          buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED,
          buildType: BUILD_TYPE.MANUAL,
          buildStage: BUILD_STAGE.PRE_RELEASE,
          queueLocation: null,
          workflowStatus: null,
          taskId: task.id,
          testflightNumber: iosUpload.testflightNumber
        });

        console.log(`[TaskExecutor] Consumed manual upload for IOS (TestFlight): buildNumber=${buildNumber}, file=${uploadFileName}`);
        return buildNumber;
      }
    }

    // ========================================================================
    // CI/CD MODE: Trigger CI/CD pipeline
    // ========================================================================
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const ciConfigId = releaseConfig.ciConfigId;

    // CI/CD config must be configured if this task exists
    if (!ciConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.CICD_WORKFLOW_NOT_CONFIGURED);
    }

    const BuildModel = this.sequelize.models.Build;

    if (!BuildModel) {
      throw new Error(RELEASE_ERROR_MESSAGES.REQUIRED_MODELS_NOT_FOUND_BUILD);
    }

    // Create TestFlight build for iOS platform
    try {
      const result = await this.triggerWorkflowByConfigId(
        ciConfigId,
        tenantId,
        BUILD_PLATFORM.IOS,
        WorkflowType.TEST_FLIGHT_BUILD,
        {
          version: iosMapping?.version,
          branch: release.branch,
        }
      );

      const buildId = uuidv4();
      const versionName = iosMapping?.version;

      await BuildModel.create({
        id: buildId,
        tenantId: tenantId,
        buildNumber: null,
        artifactVersionName: versionName,
        artifactPath: null,
        releaseId: context.releaseId,
        platform: BUILD_PLATFORM.IOS,
        storeType: STORE_TYPE.APP_STORE,
        regressionId: null,
        ciRunId: null, // CI/CD system will populate this via callback
        ciRunType: result.providerType,
        buildUploadStatus: BUILD_UPLOAD_STATUS.PENDING,
        buildType: BUILD_TYPE.CI_CD,
        buildStage: BUILD_STAGE.PRE_RELEASE,
        queueLocation: result.queueLocation,
        workflowStatus: WORKFLOW_STATUS.PENDING,
        taskId: task.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[TaskExecutor] Failed to trigger TestFlight build workflow:`, errorMessage);
      if (error instanceof Error && error.stack) {
        console.error(`[TaskExecutor] Stack trace:`, error.stack);
      }
      throw new Error(`Failed to trigger TestFlight build workflow: ${errorMessage}`);
    }

    // CI/CD Mode: Set task to AWAITING_CALLBACK - waiting for CI/CD pipeline callback
    await this.releaseTaskRepo.update(task.id, {
      taskStatus: TaskStatus.AWAITING_CALLBACK
    });
    console.log(`[TaskExecutor] Task ${task.id} set to AWAITING_CALLBACK - waiting for CI/CD callback`);

    // Return special marker so executeTask() knows not to mark as COMPLETED
    return 'AWAITING_CI_CD';
  }

  /**
   * Execute CREATE_AAB_BUILD task (Category A)
   * 
   * Two modes:
   * 1. Manual Mode (hasManualBuildUpload=true): Checks release_uploads table for ANDROID build
   * 2. CI/CD Mode (hasManualBuildUpload=false): Triggers CI/CD pipeline
   * 
   * Returns: Simple string (e.g., 'aab-1.5.0-123')
   *          or 'AWAITING_MANUAL_BUILD' if waiting for uploads
   */
  private async executeCreateAABBuild(
    context: TaskExecutionContext
  ): Promise<string> {
    const { release, tenantId, task } = context;

    // Verify ANDROID platform exists using platformTargetMappings
    const platformMappings = context.platformTargetMappings;
    const hasAndroid = platformMappings.some(m => m.platform === BUILD_PLATFORM.ANDROID);

    if (!hasAndroid) {
      throw new Error('CREATE_AAB_BUILD task requires ANDROID platform, but no ANDROID platform found');
    }

    // Get ANDROID mapping for version
    const androidMapping = platformMappings.find(m => m.platform === BUILD_PLATFORM.ANDROID);

    // ========================================================================
    // MANUAL MODE: Check release_uploads table for ANDROID build
    // ========================================================================
    if (release.hasManualBuildUpload) {
      console.log(`[TaskExecutor] Manual mode for PRE_RELEASE (AAB): checking uploads for ANDROID`);
      
      // ✅ releaseUploadsRepo is required - actively initialized in aws-storage.ts, no null check needed

      // Check if ANDROID has upload ready
      const readiness = await this.releaseUploadsRepo.checkAllPlatformsReady(
        context.releaseId,
        'PRE_RELEASE',
        [PlatformName.ANDROID]
      );

      console.log(`[TaskExecutor] Manual mode check for PRE_RELEASE (AAB): allReady=${readiness.allReady}`);

      if (!readiness.allReady) {
        // Guard: Only send notification if task is NOT already AWAITING_MANUAL_BUILD
        const isNotAlreadyAwaiting = task.taskStatus !== TaskStatus.AWAITING_MANUAL_BUILD;
        
        if (isNotAlreadyAwaiting && this.releaseNotificationService) {
          try {
            const buildType = TASK_TYPE_TO_NAME[task.taskType];
            const delivrUrl = buildDelivrUrl(context.tenantId, context.releaseId);
            
            await this.releaseNotificationService.notify({
              type: NotificationType.MANUAL_BUILD_UPLOAD_REMINDER,
              tenantId: context.tenantId,
              releaseId: context.releaseId,
              buildType: buildType,
              delivrUrl: delivrUrl,
              isSystemGenerated: true
            });
            
            console.log(`[TaskExecutor] Sent MANUAL_BUILD_UPLOAD_REMINDER notification for task ${task.id} (${buildType})`);
          } catch (error) {
            // Log but don't throw - notification failure shouldn't block status update
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[TaskExecutor] Failed to send manual build upload reminder notification:`, errorMessage);
          }
        }
        
        // Set task to AWAITING_MANUAL_BUILD - waiting for manual AAB build
        await this.releaseTaskRepo.update(task.id, {
          taskStatus: TaskStatus.AWAITING_MANUAL_BUILD
        });
        console.log(`[TaskExecutor] Task ${task.id} set to AWAITING_MANUAL_BUILD - waiting for manual AAB build`);
        return 'AWAITING_MANUAL_BUILD';
      }

      // ANDROID ready - consume upload and create build record
      const uploads = await this.releaseUploadsRepo.findUnused(context.releaseId, 'PRE_RELEASE');
      const BuildModel = this.sequelize.models.Build;
      
      const androidUpload = uploads.find(u => u.platform === BUILD_PLATFORM.ANDROID);
      if (androidUpload && BuildModel) {
        // Mark upload as used
        await this.releaseUploadsRepo.markAsUsed(androidUpload.id, task.id, null);
        
        // For Android AAB, buildNumber must be the versionCode parsed from internalTrackLink
        const versionCode = extractVersionCodeFromInternalTrackLink(androidUpload.internalTrackLink);
        const hasVersionCode = versionCode !== null;
        if (!hasVersionCode) {
          throw new Error(RELEASE_ERROR_MESSAGES.AAB_VERSION_CODE_REQUIRED);
        }
        const buildNumber = versionCode;

        // Extract filename from artifactPath for logging
        const uploadFileName = androidUpload.artifactPath?.split('/').pop() ?? androidUpload.artifactPath ?? 'unknown';

        // Create build record from manual upload
        const buildId = uuidv4();
        const versionName = androidMapping?.version;
        await BuildModel.create({
          id: buildId,
          tenantId: tenantId,
          buildNumber: buildNumber,
          artifactVersionName: versionName,
          artifactPath: androidUpload.artifactPath,
          releaseId: context.releaseId,
          platform: BUILD_PLATFORM.ANDROID,
          storeType: STORE_TYPE.PLAY_STORE,
          regressionId: null,
          ciRunType: null,
          buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED,
          buildType: BUILD_TYPE.MANUAL,
          buildStage: BUILD_STAGE.PRE_RELEASE,
          queueLocation: null,
          workflowStatus: null,
          taskId: task.id,
          internalTrackLink: androidUpload.internalTrackLink ?? null,
          testflightNumber: null
        });

        console.log(`[TaskExecutor] Consumed manual upload for ANDROID (AAB): buildNumber=${buildNumber}, file=${uploadFileName}`);
        return buildNumber;
      }
    }

    // ========================================================================
    // CI/CD MODE: Trigger CI/CD pipeline
    // ========================================================================
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const ciConfigId = releaseConfig.ciConfigId;

    // CI/CD config must be configured if this task exists
    if (!ciConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.CICD_WORKFLOW_NOT_CONFIGURED);
    }

    const BuildModel = this.sequelize.models.Build;

    if (!BuildModel) {
      throw new Error(RELEASE_ERROR_MESSAGES.REQUIRED_MODELS_NOT_FOUND_BUILD);
    }

    // Create AAB build for Android platform
    try {
      const result = await this.triggerWorkflowByConfigId(
        ciConfigId,
        tenantId,
        BUILD_PLATFORM.ANDROID,
        WorkflowType.AAB_BUILD,
        {
          version: androidMapping?.version,
          branch: release.branch,
        }
      );

      const buildId = uuidv4();
      const versionName = androidMapping?.version;

      await BuildModel.create({
        id: buildId,
        tenantId: tenantId,
        buildNumber: null,
        artifactVersionName: versionName,
        artifactPath: null,
        releaseId: context.releaseId,
        platform: BUILD_PLATFORM.ANDROID,
        storeType: STORE_TYPE.PLAY_STORE,
        regressionId: null,
        ciRunId: null, // CI/CD system will populate this via callback
        ciRunType: result.providerType,
        buildUploadStatus: BUILD_UPLOAD_STATUS.PENDING,
        buildType: BUILD_TYPE.CI_CD,
        buildStage: BUILD_STAGE.PRE_RELEASE,
        queueLocation: result.queueLocation,
        workflowStatus: WORKFLOW_STATUS.PENDING,
        taskId: task.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[TaskExecutor] Failed to trigger AAB build workflow:`, errorMessage);
      if (error instanceof Error && error.stack) {
        console.error(`[TaskExecutor] Stack trace:`, error.stack);
      }
      throw new Error(`Failed to trigger AAB build workflow: ${errorMessage}`);
    }

    // CI/CD Mode: Set task to AWAITING_CALLBACK - waiting for CI/CD pipeline callback
    await this.releaseTaskRepo.update(task.id, {
      taskStatus: TaskStatus.AWAITING_CALLBACK
    });
    console.log(`[TaskExecutor] Task ${task.id} set to AWAITING_CALLBACK - waiting for CI/CD callback`);

    // Return special marker so executeTask() knows not to mark as COMPLETED
    return 'AWAITING_CI_CD';
  }
  // Note: executeSendPreReleaseMessage method removed - notifications handled by event system
  // Note: executeCheckProjectReleaseApproval method removed - no longer needed

}


