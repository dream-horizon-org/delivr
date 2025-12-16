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
import { getStorage } from '../../../storage/storage-instance';
import { hasSequelize } from '../../../types/release/api-types';

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
import { ReleaseUploadsRepository } from '../../../models/release/release-uploads.repository';
import { PlatformName } from '../../../models/release/release.interface';
import {
  BUILD_PLATFORM,
  BUILD_STAGE,
  BUILD_TYPE,
  BUILD_UPLOAD_STATUS,
  STORE_TYPE
} from '~types/release-management/builds';

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
  version: string | null;
  projectManagementRunId?: string | null;  // JIRA ticket ID for this platform
  testManagementRunId?: string | null;     // Test suite run ID for this platform
}

export interface TaskExecutionContext {
  releaseId: string;
  tenantId: string;
  release: Release;
  task: ReleaseTask;
  platformTargetMappings?: PlatformTargetMapping[];
}

/**
 * Extract version from release branch
 * @param branch - Branch name like "release/v1.0.0" or "release/v1.2.3-beta"
 * @returns Version string like "1.0.0" or "1.2.3-beta", or null if branch is null/invalid
 * 
 * Schema Note: The new schema stores `branch` directly (e.g., "release/v1.0.0")
 * instead of a separate `version` column. This helper extracts the version part.
 */
const extractVersionFromBranch = (branch: string | null | undefined): string | null => {
  // Handle null/undefined branch gracefully
  const branchIsNullOrUndefined = branch === null || branch === undefined;
  if (branchIsNullOrUndefined) {
    return null;
  }
  
  // Pattern: "release/v{version}" -> extract "{version}"
  const match = branch.match(/^release\/v(.+)$/);
  const matchFound = match !== null && match.length > 1;
  if (matchFound) {
    return match[1];
  }
  
  // Fallback: if branch doesn't match pattern, use branch name as-is
  return branch;
};

/**
 * Get version for a release
 * Priority: platformMappings[0].version > branch-derived version > fallback "0.0.0"
 * 
 * @param release - Release object with branch field
 * @param platformMappings - Optional platform mappings containing per-platform version
 * @returns Version string
 */
const getReleaseVersion = (
  release: Release, 
  platformMappings?: PlatformTargetMapping[]
): string => {
  // Priority 1: Use version from platform mappings (most reliable)
  const hasPlatformMappings = platformMappings && platformMappings.length > 0;
  if (hasPlatformMappings) {
    const firstMappingVersion = platformMappings[0].version;
    const versionExists = firstMappingVersion !== null && firstMappingVersion !== undefined && firstMappingVersion !== '';
    if (versionExists) {
      return firstMappingVersion;
    }
  }
  
  // Priority 2: Extract from branch
  const branchVersion = extractVersionFromBranch(release.branch);
  const hasBranchVersion = branchVersion !== null;
  if (hasBranchVersion) {
    return branchVersion;
  }
  
  // Priority 3: Fallback (should never reach here in normal operation)
  console.warn(`[getReleaseVersion] No version found for release ${release.id}, using fallback`);
  return RELEASE_DEFAULTS.FALLBACK_VERSION;
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
  private releaseUploadsRepo: ReleaseUploadsRepository | null;
  private cicdConfigService: CICDConfigService;
  private cronJobRepo: CronJobRepository | null;

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
    releaseUploadsRepo?: ReleaseUploadsRepository | null,
    cronJobRepo?: CronJobRepository | null
  ) {
    this.releaseTaskRepo = releaseTaskRepo;
    this.releaseRepo = releaseRepo;
    this.releaseUploadsRepo = releaseUploadsRepo ?? null;
    this.cicdConfigService = cicdConfigService;
    this.cronJobRepo = cronJobRepo ?? null;
    
    // Initialize Sequelize instance (validate once at construction)
    const storage = getStorage();
    if (!hasSequelize(storage)) {
      throw new Error(RELEASE_ERROR_MESSAGES.STORAGE_NO_SEQUELIZE);
    }
    this.sequelize = storage.sequelize;
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
   * Get the appropriate workflow service based on provider type
   * Looks up workflow to determine provider, then instantiates correct service
   * 
   * @deprecated Use triggerWorkflowByConfig instead - workflowId is actually configId
   */
  private async getWorkflowService(workflowId: string): Promise<GitHubActionsWorkflowService | JenkinsWorkflowService> {
    // Look up workflow to get provider type
    const workflow = await this.cicdWorkflowRepository.findById(workflowId);
    
    if (!workflow) {
      throw new Error(RELEASE_ERROR_MESSAGES.CICD_WORKFLOW_NOT_FOUND(workflowId));
    }

    // Instantiate the correct service based on provider type
    switch (workflow.providerType) {
      case CICDProviderType.GITHUB_ACTIONS:
        return new GitHubActionsWorkflowService(
          this.cicdIntegrationRepository,
          this.cicdWorkflowRepository
        );
      
      case CICDProviderType.JENKINS:
        return new JenkinsWorkflowService(
          this.cicdIntegrationRepository,
          this.cicdWorkflowRepository
        );
      
      default:
        throw new Error(RELEASE_ERROR_MESSAGES.CICD_PROVIDER_UNSUPPORTED(workflow.providerType));
    }
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
  ): Promise<{ queueLocation: string; workflowId: string }> {
    const result = await this.cicdConfigService.triggerWorkflowByConfig({
      configId,
      tenantId,
      platform,
      workflowType,
      jobParameters
    });

    return {
      queueLocation: result.queueLocation,
      workflowId: result.workflowId
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
      
      // Fetch platformTargetMappings if not provided in context
      let enrichedContext = context;
      if (!context.platformTargetMappings) {
        const PlatformTargetMappingModel = this.sequelize.models.PlatformTargetMapping;
        if (PlatformTargetMappingModel) {
          const mappings = await PlatformTargetMappingModel.findAll({
            where: { releaseId: context.releaseId }
          });
          const mappingsData = mappings.map(m => (m as any).toJSON()) as PlatformTargetMapping[];
          enrichedContext = { ...context, platformTargetMappings: mappingsData };
        }
      }
      
      // Update task status to IN_PROGRESS
      // Use updateById since we have the database ID, not taskId
      await this.releaseTaskRepo.update(task.id, {
        taskStatus: TaskStatus.IN_PROGRESS
      });
      console.log(`[TaskExecutor] Task status set to IN_PROGRESS`);

      // Execute task based on type - returns either string (Category A) or object (Category B)
      const result = await this.executeTaskByType(
        task.taskType,
        enrichedContext
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
      if (this.cronJobRepo) {
        const cronJob = await this.cronJobRepo.findByReleaseId(context.releaseId);
        if (cronJob) {
          await this.cronJobRepo.update(cronJob.id, { pauseType: PauseType.TASK_FAILURE });
        }
      }
      
      console.log(`[TaskExecutor] Release ${context.releaseId} PAUSED due to task failure. Can be resumed after fix.`);

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

    // Generate release branch name (e.g., release/v1.0.0)
    const version = getReleaseVersion(release, platformTargetMappings);
    const releaseBranch = `release/v${version}`;
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
    const platformMappings = context.platformTargetMappings || [];

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

    // Create ticket for EACH platform and store result in mapping
    const version = getReleaseVersion(release, platformMappings);
    for (const mapping of platformMappings) {
      const platformName = mapping.platform;
      
      // Call PM service for this platform
      const results = await this.pmTicketService.createTickets({
        pmConfigId: pmConfigId,
        tickets: [{
          platform: platformName as Platform,
          title: `Release ${version} - ${platformName}`,
          description: `Release ${version} planned for ${release.targetReleaseDate}`
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
      }
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
    const platformMappings = context.platformTargetMappings || [];

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
    const version = getReleaseVersion(release, platformMappings);

    // Create test run for EACH platform and store result in mapping
    for (const mapping of platformMappings) {
      const platformName = mapping.platform;
      
      // Call service with specific platform filter to avoid creating duplicate runs
      const results = await this.testRunService.createTestRuns({
        testManagementConfigId: testConfigId,
        runName: `Release ${version} - ${platformName} Test Suite`,
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
      }
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
    const platformMappings = context.platformTargetMappings ?? [];
    if (platformMappings.length === 0) {
      return '';
    }
    
    const platforms = platformMappings.map(m => m.platform as PlatformName);

    // ========================================================================
    // MANUAL MODE: Check release_uploads table for builds
    // ========================================================================
    if (release.hasManualBuildUpload) {
      console.log(`[TaskExecutor] Manual mode for KICK_OFF: checking uploads for platforms [${platforms.join(', ')}]`);
      
      if (!this.releaseUploadsRepo) {
        throw new Error(RELEASE_ERROR_MESSAGES.RELEASE_UPLOADS_REPO_NOT_AVAILABLE);
      }

      // Check if all platforms have uploads ready
      const readiness = await this.releaseUploadsRepo.checkAllPlatformsReady(
        context.releaseId,
        'KICK_OFF',
        platforms
      );

      console.log(`[TaskExecutor] Manual mode check for KICK_OFF: allReady=${readiness.allReady}, uploaded=[${readiness.uploadedPlatforms.join(',')}], missing=[${readiness.missingPlatforms.join(',')}]`);

      if (!readiness.allReady) {
        // Set task to AWAITING_MANUAL_BUILD - waiting for user to upload builds
        await this.releaseTaskRepo.update(task.id, {
          taskStatus: TaskStatus.AWAITING_MANUAL_BUILD
        });
        console.log(`[TaskExecutor] Task ${task.id} set to AWAITING_MANUAL_BUILD - waiting for manual builds`);
        return 'AWAITING_MANUAL_BUILD';
      }

      // All platforms ready - consume uploads and create build records
      const uploads = await this.releaseUploadsRepo.findUnused(context.releaseId, 'KICK_OFF');
      const BuildModel = this.sequelize.models.Build;
      const buildNumbers: string[] = [];

      for (const mapping of platformMappings) {
        const platformName = mapping.platform as PlatformName;
        const targetName = mapping.target;
        const upload = uploads.find(u => u.platform === platformName);

        if (upload) {
          // Mark upload as used
          await this.releaseUploadsRepo.markAsUsed(upload.id, task.id, null);
          
          // Extract filename from artifactPath for display
          const uploadFileName = upload.artifactPath.split('/').pop() ?? upload.artifactPath;

          // Create build record from manual upload
          const buildId = uuidv4();
          const versionName = mapping.version ?? getReleaseVersion(release, platformMappings);
          if (BuildModel) {
            await BuildModel.create({
              id: buildId,
              tenantId: tenantId,
              buildNumber: uploadFileName,
              artifactVersionName: versionName,
              artifactPath: upload.artifactPath,
              releaseId: context.releaseId,
              platform: platformName,
              storeType: targetName,
              regressionId: null,
              ciRunId: null,
              buildUploadStatus: 'UPLOADED',
              buildType: 'MANUAL',
              buildStage: 'KICK_OFF',
              queueLocation: null,
              workflowStatus: null,
              taskId: task.id
            });
          }

          buildNumbers.push(uploadFileName);
          console.log(`[TaskExecutor] Consumed manual upload for ${platformName}: ${uploadFileName}`);
        }
      }

      console.log(`[TaskExecutor] Manual mode KICK_OFF completed: ${buildNumbers.join(',')}`);
      return buildNumbers.join(',');
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

    const buildNumbers: string[] = [];

    for (const mapping of platformMappings) {
      const platformName = mapping.platform;
      const targetName = mapping.target;

      const result = await this.triggerWorkflowByConfigId(
        ciConfigId,
        tenantId,
        platformName,
        WorkflowType.PRE_REGRESSION_BUILD,
        {
          platform: platformName,
          version: mapping.version ?? getReleaseVersion(release, platformMappings),
          branch: release.branch ?? `release/v${getReleaseVersion(release, platformMappings)}`,
          buildType: CICD_JOB_BUILD_TYPE.PRE_REGRESSION
        }
      );

      // Validate queueLocation - if missing, workflow trigger failed
      const queueLocationMissing = !result.queueLocation;
      if (queueLocationMissing) {
        throw new Error(`CI/CD workflow trigger failed for ${platformName} - no queueLocation returned`);
      }

      // DB operations - let errors propagate naturally (not integration failures)
      const buildNumber = result.queueLocation;
      const buildId = uuidv4();
      const versionName = mapping.version ?? getReleaseVersion(release, platformMappings);

      await BuildModel.create({
        id: buildId,
        tenantId: tenantId,
        buildNumber: buildNumber,
        artifactVersionName: versionName,
        artifactPath: result.queueLocation,
        releaseId: context.releaseId,
        platform: platformName,
        storeType: targetName,
        regressionId: null,
        ciRunId: null, // CI/CD system will populate this via callback
        buildUploadStatus: 'PENDING',
        buildType: 'CI_CD',
        buildStage: 'KICK_OFF',
        queueLocation: result.queueLocation,
        workflowStatus: 'PENDING',
        taskId: task.id
      });

      buildNumbers.push(buildNumber);
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

    const version = getReleaseVersion(release, platformTargetMappings);
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
    let previousTag: string | undefined;
    const { createRegressionCycleModel } = await import('../../../models/release/regression-cycle.sequelize.model');
    const { RegressionCycleRepository } = await import('../../../models/release/regression-cycle.repository');
    const regressionCycleModel = createRegressionCycleModel(this.sequelize);
    const regressionCycleRepo = new RegressionCycleRepository(regressionCycleModel);
    const previousCycle = await regressionCycleRepo.findPrevious(context.releaseId);
    if (previousCycle && previousCycle.length > 0) {
      previousTag = previousCycle[0].cycleTag || undefined;
    }

    // Create release notes - integration returns notes content (string)
    const notes = await this.scmService.createReleaseNotes(
      tenantId,
      currentTag,
      previousTag,
      getReleaseVersion(release, platformTargetMappings),
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

    const platformMappings = context.platformTargetMappings ?? [];
    if (platformMappings.length === 0) {
      return '';
    }
    
    const platforms = platformMappings.map(m => m.platform as PlatformName);

    // ========================================================================
    // MANUAL MODE: Check release_uploads table for builds
    // ========================================================================
    if (release.hasManualBuildUpload) {
      console.log(`[TaskExecutor] Manual mode for REGRESSION (cycle ${task.regressionId}): checking uploads for platforms [${platforms.join(', ')}]`);
      
      if (!this.releaseUploadsRepo) {
        throw new Error(RELEASE_ERROR_MESSAGES.RELEASE_UPLOADS_REPO_NOT_AVAILABLE);
      }

      // Check if all platforms have uploads ready
      const readiness = await this.releaseUploadsRepo.checkAllPlatformsReady(
        context.releaseId,
        'REGRESSION',
        platforms
      );

      console.log(`[TaskExecutor] Manual mode check for REGRESSION: allReady=${readiness.allReady}, uploaded=[${readiness.uploadedPlatforms.join(',')}], missing=[${readiness.missingPlatforms.join(',')}]`);

      if (!readiness.allReady) {
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
      const buildNumbers: string[] = [];

      for (const mapping of platformMappings) {
        const platformName = mapping.platform as PlatformName;
        const targetName = mapping.target;
        const upload = uploads.find(u => u.platform === platformName);

        if (upload) {
          // Mark upload as used (with cycle ID for regression)
          await this.releaseUploadsRepo.markAsUsed(upload.id, task.id, task.regressionId);
          
          // Extract filename from artifactPath for display
          const uploadFileName = upload.artifactPath.split('/').pop() ?? upload.artifactPath;

          // Create build record from manual upload
          const buildId = uuidv4();
          const versionName = mapping.version ?? getReleaseVersion(release, platformMappings);
          if (BuildModel) {
            await BuildModel.create({
              id: buildId,
              tenantId: tenantId,
              buildNumber: uploadFileName,
              artifactVersionName: versionName,
              artifactPath: upload.artifactPath,
              releaseId: context.releaseId,
              platform: platformName,
              storeType: targetName,
              regressionId: task.regressionId,
              ciRunId: null,
              buildUploadStatus: 'UPLOADED',
              buildType: 'MANUAL',
              buildStage: 'REGRESSION',
              queueLocation: null,
              workflowStatus: null,
              taskId: task.id
            });
          }

          buildNumbers.push(uploadFileName);
          console.log(`[TaskExecutor] Consumed manual upload for ${platformName} (cycle ${task.regressionId}): ${uploadFileName}`);
        }
      }

      console.log(`[TaskExecutor] Manual mode REGRESSION completed: ${buildNumbers.join(',')}`);
      return buildNumbers.join(',');
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

    const buildNumbers: string[] = [];

    for (const mapping of platformMappings) {
      const platformName = mapping.platform;
      const targetName = mapping.target;

      const result = await this.triggerWorkflowByConfigId(
        ciConfigId,
        tenantId,
        platformName,
        WorkflowType.REGRESSION_BUILD,
        {
          platform: platformName,
          version: mapping.version ?? getReleaseVersion(release, platformMappings),
          branch: release.branch ?? `release/v${getReleaseVersion(release, platformMappings)}`,
          buildType: CICD_JOB_BUILD_TYPE.REGRESSION,
          regressionId: task.regressionId
        }
      );

      // Validate queueLocation - if missing, workflow trigger failed
      const queueLocationMissing = !result.queueLocation;
      if (queueLocationMissing) {
        throw new Error(`CI/CD workflow trigger failed for ${platformName} - no queueLocation returned`);
      }

      // DB operations - let errors propagate naturally (not integration failures)
      const buildNumber = result.queueLocation;
      const buildId = uuidv4();
      const versionName = mapping.version ?? getReleaseVersion(release, platformMappings);

      await BuildModel.create({
        id: buildId,
        tenantId: tenantId,
        buildNumber: buildNumber,
        artifactVersionName: versionName,
        artifactPath: result.queueLocation,
        releaseId: context.releaseId,
        platform: platformName,
        storeType: targetName,
        regressionId: task.regressionId,
        ciRunId: null, // CI/CD system will populate this via callback
        buildUploadStatus: 'PENDING',
        buildType: 'CI_CD',
        buildStage: 'REGRESSION',
        queueLocation: result.queueLocation,
        workflowStatus: 'PENDING',
        taskId: task.id
      });

      buildNumbers.push(buildNumber);
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
    const platformMappings = context.platformTargetMappings || [];
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

      const result = await this.triggerWorkflowByConfigId(
        ciConfigId,
        tenantId,
        platformName,
        WorkflowType.AUTOMATION_BUILD,
        {
          platform: platformName,
          version: mapping.version ?? getReleaseVersion(release, platformMappings),
          branch: release.branch ?? `release/v${getReleaseVersion(release, platformMappings)}`,
          regressionId: task.regressionId,
          buildType: CICD_JOB_BUILD_TYPE.AUTOMATION
        }
      );

      // Validate queueLocation - if missing, workflow trigger failed
      const queueLocationMissing = !result.queueLocation;
      if (queueLocationMissing) {
        throw new Error(`CI/CD automation workflow trigger failed for ${platformName} - no queueLocation returned`);
      }
      runIds.push(result.queueLocation);
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
    const { release, tenantId: _tenantId, task } = context;

    if (!this.testRunService) {
      throw new Error(RELEASE_ERROR_MESSAGES.TEST_PLATFORM_NOT_AVAILABLE);
    }

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
      testManagementConfigId: testConfigId
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
    const version = getReleaseVersion(release, platformMappings);
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
      version: getReleaseVersion(release, platformTargetMappings),
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
    const platformMappings = context.platformTargetMappings || [];
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
      
      if (!this.releaseUploadsRepo) {
        throw new Error(RELEASE_ERROR_MESSAGES.RELEASE_UPLOADS_REPO_NOT_AVAILABLE);
      }

      // Check if IOS has upload ready
      const readiness = await this.releaseUploadsRepo.checkAllPlatformsReady(
        context.releaseId,
        'PRE_RELEASE',
        [PlatformName.IOS]
      );

      console.log(`[TaskExecutor] Manual mode check for PRE_RELEASE (TestFlight): allReady=${readiness.allReady}`);

      if (!readiness.allReady) {
        // Set task to AWAITING_CALLBACK and return special marker
        await this.releaseTaskRepo.update(task.id, {
          taskStatus: TaskStatus.AWAITING_CALLBACK
        });
        console.log(`[TaskExecutor] Task ${task.id} set to AWAITING_CALLBACK - waiting for manual TestFlight build`);
        return 'AWAITING_MANUAL_BUILD';
      }

      // IOS ready - consume upload and create build record
      const uploads = await this.releaseUploadsRepo.findUnused(context.releaseId, 'PRE_RELEASE');
      const BuildModel = this.sequelize.models.Build;
      
      const iosUpload = uploads.find(u => u.platform === BUILD_PLATFORM.IOS);
      if (iosUpload && BuildModel) {
        // Mark upload as used
        await this.releaseUploadsRepo.markAsUsed(iosUpload.id, task.id, null);
        
        // Extract filename from artifactPath for display
        const uploadFileName = iosUpload.artifactPath.split('/').pop() ?? iosUpload.artifactPath;

        // Create build record from manual upload
        const buildId = uuidv4();
        const versionName = iosMapping?.version ?? getReleaseVersion(release, platformMappings);
        await BuildModel.create({
          id: buildId,
          tenantId: tenantId,
          buildNumber: uploadFileName,
          artifactVersionName: versionName,
          artifactPath: iosUpload.artifactPath,
          releaseId: context.releaseId,
          platform: BUILD_PLATFORM.IOS,
          storeType: STORE_TYPE.TESTFLIGHT,
          regressionId: null,
          buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED,
          buildType: BUILD_TYPE.MANUAL,
          buildStage: BUILD_STAGE.PRE_RELEASE,
          queueLocation: null,
          workflowStatus: null,
          taskId: task.id,
          testflightNumber: iosUpload.testflightNumber ?? null
        });

        console.log(`[TaskExecutor] Consumed manual upload for IOS (TestFlight): ${uploadFileName}`);
        return uploadFileName;
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

    // Create TestFlight build for iOS platform
    const result = await this.triggerWorkflowByConfigId(
      ciConfigId,
      tenantId,
      BUILD_PLATFORM.IOS,
      WorkflowType.TEST_FLIGHT_BUILD,
      {
        platform: BUILD_PLATFORM.IOS,
        version: iosMapping?.version ?? getReleaseVersion(release, platformMappings),
        branch: release.branch ?? `release/v${getReleaseVersion(release, platformMappings)}`,
        buildType: CICD_JOB_BUILD_TYPE.TESTFLIGHT
      }
    );

    // Validate queueLocation - if missing, workflow trigger failed
    const queueLocationMissing = !result.queueLocation;
    if (queueLocationMissing) {
      throw new Error('CI/CD TestFlight workflow trigger failed - no queueLocation returned');
    }

    // Category A: Return raw string
    return result.queueLocation;
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
    const platformMappings = context.platformTargetMappings || [];
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
      
      if (!this.releaseUploadsRepo) {
        throw new Error(RELEASE_ERROR_MESSAGES.RELEASE_UPLOADS_REPO_NOT_AVAILABLE);
      }

      // Check if ANDROID has upload ready
      const readiness = await this.releaseUploadsRepo.checkAllPlatformsReady(
        context.releaseId,
        'PRE_RELEASE',
        [PlatformName.ANDROID]
      );

      console.log(`[TaskExecutor] Manual mode check for PRE_RELEASE (AAB): allReady=${readiness.allReady}`);

      if (!readiness.allReady) {
        // Set task to AWAITING_CALLBACK and return special marker
        await this.releaseTaskRepo.update(task.id, {
          taskStatus: TaskStatus.AWAITING_CALLBACK
        });
        console.log(`[TaskExecutor] Task ${task.id} set to AWAITING_CALLBACK - waiting for manual AAB build`);
        return 'AWAITING_MANUAL_BUILD';
      }

      // ANDROID ready - consume upload and create build record
      const uploads = await this.releaseUploadsRepo.findUnused(context.releaseId, 'PRE_RELEASE');
      const BuildModel = this.sequelize.models.Build;
      
      const androidUpload = uploads.find(u => u.platform === BUILD_PLATFORM.ANDROID);
      if (androidUpload && BuildModel) {
        // Mark upload as used
        await this.releaseUploadsRepo.markAsUsed(androidUpload.id, task.id, null);
        
        // Extract filename from artifactPath for display
        const uploadFileName = androidUpload.artifactPath.split('/').pop() ?? androidUpload.artifactPath;

        // Create build record from manual upload
        const buildId = uuidv4();
        const versionName = androidMapping?.version ?? getReleaseVersion(release, platformMappings);
        await BuildModel.create({
          id: buildId,
          tenantId: tenantId,
          buildNumber: uploadFileName,
          artifactVersionName: versionName,
          artifactPath: androidUpload.artifactPath,
          releaseId: context.releaseId,
          platform: BUILD_PLATFORM.ANDROID,
          storeType: STORE_TYPE.PLAY_STORE,
          regressionId: null,
          buildUploadStatus: BUILD_UPLOAD_STATUS.UPLOADED,
          buildType: BUILD_TYPE.MANUAL,
          buildStage: BUILD_STAGE.PRE_RELEASE,
          queueLocation: null,
          workflowStatus: null,
          taskId: task.id,
          internalTrackLink: androidUpload.internalTrackLink ?? null
        });

        console.log(`[TaskExecutor] Consumed manual upload for ANDROID (AAB): ${uploadFileName}`);
        return uploadFileName;
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

    // Create AAB build for Android platform
    const result = await this.triggerWorkflowByConfigId(
      ciConfigId,
      tenantId,
      BUILD_PLATFORM.ANDROID,
      WorkflowType.AAB_BUILD,
      {
        platform: BUILD_PLATFORM.ANDROID,
        version: androidMapping?.version ?? getReleaseVersion(release, platformMappings),
        branch: release.branch ?? `release/v${getReleaseVersion(release, platformMappings)}`,
        buildType: CICD_JOB_BUILD_TYPE.AAB
      }
    );

    // Validate queueLocation - if missing, workflow trigger failed
    const queueLocationMissing = !result.queueLocation;
    if (queueLocationMissing) {
      throw new Error('CI/CD AAB workflow trigger failed - no queueLocation returned');
    }

    // Category A: Return raw string
    return result.queueLocation;
  }

  // Note: executeSendPreReleaseMessage method removed - notifications handled by event system
  // Note: executeCheckProjectReleaseApproval method removed - no longer needed
}


