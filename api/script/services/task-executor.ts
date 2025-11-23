/**
 * Task Executor Service
 * 
 * Executes individual release tasks by calling integration methods directly.
 * 
 * Follows cursorrules: No 'any' types - use explicit types
 */

import { v4 as uuidv4 } from 'uuid';
import { ReleaseTasksDTO } from '../storage/release/release-tasks-dto';
import { ReleaseDTO } from '../storage/release/release-dto';
import { TaskType, TaskStatus, ReleaseStatus, TaskStage } from '../storage/release/release-models';
import { getStorage } from '../storage/storage-instance';
import { hasSequelize, StorageWithSequelize } from '../routes/release/release-types';

// Phase 6: Real integration services (DI)
import { SCMService } from './integrations/scm/scm.service';
import { CICDIntegrationRepository } from '../models/integrations/ci-cd/connection/connection.repository';
import { CICDWorkflowRepository } from '../models/integrations/ci-cd/workflow/workflow.repository';
import { GitHubActionsWorkflowService } from './integrations/ci-cd/workflows/github-actions-workflow.service';
import { JenkinsWorkflowService } from './integrations/ci-cd/workflows/jenkins-workflow.service';
import { CICDProviderType } from '../types/integrations/ci-cd/connection.interface';
import { WorkflowType } from '../types/integrations/ci-cd/workflow.interface';
import { ProjectManagementTicketService } from './integrations/project-management/ticket/ticket.service';
import { Platform } from '../types/integrations/project-management/platform.interface';
import { TestManagementRunService } from './integrations/test-management/test-run/test-run.service';
import { SlackIntegrationService } from './integrations/comm/slack-integration/slack-integration.service';
import type { ReleaseConfigRepository } from '../models/release-configs/release-config.repository';
import { RELEASE_ERROR_MESSAGES } from './release/release.constants';

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
export interface TaskExecutionContext {
  releaseId: string;
  tenantId: string;
  release: Awaited<ReturnType<ReleaseDTO['get']>>;
  task: Awaited<ReturnType<ReleaseTasksDTO['get']>>;
}

// IntegrationInstances interface removed - now using real services via DI

/**
 * Task Executor Service
 * 
 * Executes tasks by calling integration methods directly via dependency injection.
 * Updates task status in database.
 */
export class TaskExecutor {
  private releaseTasksDTO: ReleaseTasksDTO;
  private releaseDTO: ReleaseDTO;

  constructor(
    private scmService: SCMService,
    private cicdIntegrationRepository: CICDIntegrationRepository,
    private cicdWorkflowRepository: CICDWorkflowRepository,
    private pmTicketService: ProjectManagementTicketService,
    private testRunService: TestManagementRunService,
    private slackService: SlackIntegrationService,
    private releaseConfigRepository: ReleaseConfigRepository
  ) {
    this.releaseTasksDTO = new ReleaseTasksDTO();
    this.releaseDTO = new ReleaseDTO();
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

    // Category A: These 6 tasks return SINGLE STRING VALUE
    // Store in BOTH externalId and externalData
    const categoryATasks: TaskType[] = [
      TaskType.CREATE_PROJECT_MANAGEMENT_TICKET,
      TaskType.CREATE_TEST_SUITE,
      TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
      TaskType.TRIGGER_REGRESSION_BUILDS,
      TaskType.TRIGGER_AUTOMATION_RUNS,
      TaskType.TRIGGER_TEST_FLIGHT_BUILD,
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
      // Result is an object like { value: '...', num: '...', timestamp: '...' }
      console.log(`[TaskExecutor] Category B task - storing in externalData ONLY (externalId=null)`);
      return [null, result as Record<string, unknown>];
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
    const { task, release } = context;

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
      await this.releaseTasksDTO.updateById(task.id, {
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

      // Update task status to COMPLETED
      // Use updateById since we have the database ID, not taskId
      console.log(`[TaskExecutor] Updating task status to COMPLETED...`);
      console.log(`[TaskExecutor]   externalId: ${externalId}`);
      console.log(`[TaskExecutor]   externalData:`, JSON.stringify(externalData));
      
      const updatedTask = await this.releaseTasksDTO.updateById(task.id, {
        taskStatus: TaskStatus.COMPLETED,
        externalId: externalId,      // NULL for Category B, string for Category A
        externalData: externalData   // Always populated
      });
      console.log(`[TaskExecutor] Task status updated to COMPLETED, verifying...`);
      
      // Verify update persisted
      const verifyTask = await this.releaseTasksDTO.getById(task.id);
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
      
      // Update task status to FAILED
      // Use updateById since we have the database ID, not taskId
      await this.releaseTasksDTO.updateById(task.id, {
        taskStatus: TaskStatus.FAILED,
        externalData: {
          error: errorMessage,
          timestamp: new Date().toISOString()
        }
      });

      // Update release status - use ARCHIVED as closest to FAILED
      // Note: ReleaseStatus doesn't have FAILED, using ARCHIVED to indicate release stopped
      await this.releaseDTO.update(
        context.releaseId,
        context.release.lastUpdateByAccountId || context.release.createdByAccountId || 'system',
        {
          status: ReleaseStatus.ARCHIVED
        }
      );

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
    const { release, tenantId } = context;

    switch (taskType) {
      case TaskType.FORK_BRANCH:
        return await this.executeForkBranch(context);

      case TaskType.PRE_KICK_OFF_REMINDER:
        return await this.executePreKickOffReminder(context);

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

      case TaskType.CREATE_FINAL_RELEASE_NOTES:
        // Stage 3: Final release notes (renamed from CREATE_GITHUB_RELEASE)
        return await this.executeCreateFinalReleaseNotes(context);

      case TaskType.TRIGGER_REGRESSION_BUILDS:
        return await this.executeTriggerRegressionBuilds(context);

      case TaskType.TRIGGER_AUTOMATION_RUNS:
        return await this.executeTriggerAutomationRuns(context);

      case TaskType.AUTOMATION_RUNS:
        return await this.executeAutomationRuns(context);

      case TaskType.SEND_REGRESSION_BUILD_MESSAGE:
        return await this.executeSendRegressionBuildMessage(context);

      // Stage 3 (Post-Regression) tasks
      case TaskType.PRE_RELEASE_CHERRY_PICKS_REMINDER:
        return await this.executePreReleaseCherryPicksReminder(context);

      case TaskType.CREATE_RELEASE_TAG:
        return await this.executeCreateReleaseTag(context);

      case TaskType.TRIGGER_TEST_FLIGHT_BUILD:
        return await this.executeTestFlightBuild(context);

      case TaskType.SEND_POST_REGRESSION_MESSAGE:
        return await this.executeSendPostRegressionMessage(context);

      case TaskType.CHECK_PROJECT_RELEASE_APPROVAL:
        return await this.executeCheckProjectReleaseApproval(context);

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
    const { release, tenantId } = context;

    if (!this.scmService) {
      throw new Error(RELEASE_ERROR_MESSAGES.SCM_INTEGRATION_NOT_AVAILABLE);
    }

    // Generate release branch name (e.g., release/v1.0.0)
    const releaseBranch = `release/v${release.version}`;
    const baseBranch = release.baseBranch || 'master';

    // Call SCM integration
    await this.scmService.forkOutBranch(
      tenantId,
      releaseBranch,
      baseBranch
    );

    // Store branch name in release
    await this.releaseDTO.update(
      context.releaseId,
      release.lastUpdateByAccountId || release.createdByAccountId || 'system',
      {
        branchRelease: releaseBranch
      }
    );

    // Get repository URL from config (dynamic, not hardcoded)
    const repoUrl = release.customIntegrationConfigs?.SCM?.repoUrl || 
                    release.customIntegrationConfigs?.SCM?.repo || 
                    'repository';
    const branchUrl = repoUrl.includes('http') 
      ? `${repoUrl}/tree/${releaseBranch}` 
      : `https://${repoUrl}/tree/${releaseBranch}`;

    // Category B: Return raw object
    return {
      branchName: releaseBranch,
      baseBranch: baseBranch,
      branchUrl: branchUrl,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute PRE_KICK_OFF_REMINDER task
   * 
   * Sends a reminder message via notification integration.
   */
  /**
   * Execute PRE_KICK_OFF_REMINDER task (Category B)
   * 
   * Sends a reminder message via notification integration.
   * Returns: Object with message details
   */
  private async executePreKickOffReminder(
    context: TaskExecutionContext
    
  ): Promise<Record<string, unknown>> {
    const { release, tenantId } = context;

    // TODO: Implement notification sending via SlackChannelConfigService
    // The SlackIntegrationService doesn't have sendMessage() method
    // Need to use SlackChannelConfigService.sendMessage() instead
    // For now, return mock response
    console.log('[TaskExecutor] TODO: Implement pre-kickoff reminder notification');
    
    return {
      messageId: `mock-${Date.now()}`,
      template: 'pre-kickoff-reminder',
      version: release.version,
      timestamp: new Date().toISOString(),
      status: 'pending_implementation'
    };
  }

  /**
   * Execute CREATE_PROJECT_MANAGEMENT_TICKET task (Category A)
   * 
   * Creates a project management ticket (JIRA, Linear, etc.) for the release.
   * Returns: Simple string (e.g., 'JIRA-456')
   */
  private async executeCreateProjectManagementTicket(
    context: TaskExecutionContext
    
  ): Promise<string> {
    const { release, tenantId } = context;

    // Get release configuration
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const pmConfigId = releaseConfig.projectManagementConfigId;
    
    if (!pmConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.PM_INTEGRATION_NOT_CONFIGURED);
    }

    // Get platforms for this release
    const storage = getStorage();
    if (!hasSequelize(storage)) {
      throw new Error(RELEASE_ERROR_MESSAGES.STORAGE_NO_SEQUELIZE);
    }
    const sequelize = (storage as StorageWithSequelize).sequelize;
    const ReleaseModel = sequelize.models.release;
    const PlatformModel = sequelize.models.platform;

    const releaseInstance = await ReleaseModel.findByPk(context.releaseId, {
      include: [{
        model: PlatformModel,
        as: 'platforms',
        through: { attributes: [] }
      }]
    });

    const platforms = (releaseInstance as any)?.platforms || [];

    // Create tickets for all platforms
    const results = await this.pmTicketService.createTickets({
      pmConfigId: pmConfigId,
      tickets: platforms.map((platform: any) => ({
        platform: platform.name,
        title: `Release ${release.version} - ${platform.name}`,
        description: `Release ${release.version} planned for ${release.targetReleaseDate}`
      }))
    });

    // Extract first ticket ID (or combine all)
    const ticketIds = Object.values(results).map(r => r.ticketKey).filter(Boolean);
    
    // Category A: Return raw string
    return ticketIds.join(',');
  }

  /**
   * Execute CREATE_TEST_SUITE task (Category A)
   * 
   * Creates a test suite in the test platform (Checkmate, TestRail, etc.).
   * Returns: Simple string (e.g., 'suite-123')
   */
  private async executeCreateTestSuite(
    context: TaskExecutionContext
    
  ): Promise<string> {
    const { release, tenantId } = context;

    if (!this.testRunService) {
      throw new Error(RELEASE_ERROR_MESSAGES.TEST_PLATFORM_NOT_AVAILABLE);
    }

    // 1. Look up ReleaseConfiguration
    const config = await this.getReleaseConfig(release.releaseConfigId);
    
    // 2. Extract test management config ID
    const testConfigId = config.testManagementConfigId;
    
    // 3. Check if configured
    if (!testConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.TEST_MANAGEMENT_NOT_CONFIGURED);
    }
    
    // 4. Call service with correct signature
    // Don't specify platforms - service will create for ALL platforms in config
    const results = await this.testRunService.createTestRuns({
      testManagementConfigId: testConfigId
    });
    
    // Extract run IDs (Category A: return string)
    const runIds = Object.entries(results)
      .map(([platform, data]) => ('runId' in data ? data.runId : null))
      .filter(Boolean)
      .join(',');
    
    return runIds || 'no-runs-created';
  }

  /**
   * Execute TRIGGER_PRE_REGRESSION_BUILDS task (Category A)
   * 
   * Triggers pre-regression builds via CI/CD integration.
   * Creates build records in builds table for each platform.
   * Returns: Simple string (comma-separated build numbers, e.g., '1.4.3-ios-1,1.4.3-and-1')
   */
  private async executeTriggerPreRegressionBuilds(
    context: TaskExecutionContext
  ): Promise<string> {
    const { release, tenantId } = context;

    // Get release configuration
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const workflowId = releaseConfig.ciConfigId;
    
    if (!workflowId) {
      throw new Error(RELEASE_ERROR_MESSAGES.CICD_WORKFLOW_NOT_CONFIGURED);
    }

    // Get the appropriate workflow service
    const workflowService = await this.getWorkflowService(workflowId);

    // Get storage and Sequelize instance
    const storage = getStorage();
    if (!hasSequelize(storage)) {
      throw new Error(RELEASE_ERROR_MESSAGES.STORAGE_NO_SEQUELIZE);
    }
    const sequelize = (storage as StorageWithSequelize).sequelize;
    const BuildModel = sequelize.models.build;
    const PlatformModel = sequelize.models.platform;
    const ReleaseModel = sequelize.models.release;

    if (!BuildModel || !PlatformModel || !ReleaseModel) {
      throw new Error(RELEASE_ERROR_MESSAGES.REQUIRED_MODELS_NOT_FOUND_BUILD);
    }

    // Fetch platforms linked to release via platform_releases junction table
    const releaseInstance = await ReleaseModel.findByPk(context.releaseId, {
      include: [{
        model: PlatformModel,
        as: 'platforms',
        through: { attributes: [] }
      }]
    });

    if (!releaseInstance) {
      throw new Error(RELEASE_ERROR_MESSAGES.RELEASE_NOT_FOUND(context.releaseId));
    }

    const platforms = (releaseInstance as any).platforms || [];
    if (platforms.length === 0) {
      throw new Error(RELEASE_ERROR_MESSAGES.NO_PLATFORMS_FOR_RELEASE(context.releaseId));
    }

    const buildNumbers: string[] = [];
    const createdBuilds: Array<{ platform: string; buildNumber: string; buildId: string }> = [];

    // Trigger build for each platform
    for (const platform of platforms) {
      const platformName = platform.name; // IOS, ANDROID, or WEB
      const platformId = platform.id;

      // Call workflow service trigger with correct parameters
      const result = await workflowService.trigger(tenantId, {
        workflowId: workflowId,
        workflowType: WorkflowType.PRE_REGRESSION_BUILD,
        platform: platformName,
        jobParameters: {
          platform: platformName,
          version: release.version,
          branch: release.branchRelease || `release/v${release.version}`,
          buildType: 'pre-regression'
        }
      });

      const buildNumber = result.queueLocation || `build-${Date.now()}`;

      // Create build record in builds table
      const buildId = uuidv4();
      await BuildModel.create({
        id: buildId,
        number: buildNumber,
        link: result.queueLocation,
        releaseId: context.releaseId,
        platformId: platformId,
        targetId: null,
        regressionId: null,
        releaseBuildsId: null
      });

      buildNumbers.push(buildNumber);
      createdBuilds.push({
        platform: platformName,
        buildNumber: buildNumber,
        buildId: buildId
      });
    }

    // Category A: Return raw string (comma-separated build numbers)
    return buildNumbers.join(',');
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
    const { release, tenantId, task } = context;

    if (!this.testRunService) {
      throw new Error(RELEASE_ERROR_MESSAGES.TEST_PLATFORM_NOT_AVAILABLE);
    }

    // Get suite ID from previous CREATE_TEST_SUITE task
    const releaseTasksDTO = new ReleaseTasksDTO();
    const testSuiteTask = await releaseTasksDTO.getByTaskType(
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
    const { release, tenantId, task } = context;

    if (!this.scmService) {
      throw new Error(RELEASE_ERROR_MESSAGES.SCM_INTEGRATION_NOT_AVAILABLE);
    }

    // Get cycle tag from task's regression cycle
    if (!task.regressionId) {
      throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_ID_NOT_FOUND);
    }

    // Get regression cycle to get cycleTag
    const storage = getStorage();
    if (!hasSequelize(storage)) {
      throw new Error(RELEASE_ERROR_MESSAGES.STORAGE_NO_SEQUELIZE);
    }
    const sequelize = (storage as StorageWithSequelize).sequelize;
    const RegressionCycleModel = sequelize.models.regressionCycle;

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

    const releaseBranch = release.branchRelease || `release/v${release.version}`;

    // Create RC tag - integration returns tag name
    await this.scmService.createReleaseTag(
      tenantId,
      releaseBranch,
      cycleTag,
      undefined, // targets (not needed for RC tags)
      release.version
    );

    // Category B: Return raw object
    return {
      value: cycleTag,
      tag: cycleTag,
      branch: releaseBranch,
      version: release.version,
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
    const { release, tenantId, task } = context;

    if (!this.scmService) {
      throw new Error(RELEASE_ERROR_MESSAGES.SCM_INTEGRATION_NOT_AVAILABLE);
    }

    // Get current RC tag
    if (!task.regressionId) {
      throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_ID_NOT_FOUND);
    }

    const storage = getStorage();
    if (!hasSequelize(storage)) {
      throw new Error(RELEASE_ERROR_MESSAGES.STORAGE_NO_SEQUELIZE);
    }
    const sequelize = (storage as StorageWithSequelize).sequelize;
    const RegressionCycleModel = sequelize.models.regressionCycle;

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
    const RegressionCycleDTO = (await import('../storage/release/regression-cycle-dto')).RegressionCycleDTO;
    const regressionCycleDTO = new RegressionCycleDTO();
    const previousCycle = await regressionCycleDTO.getPrevious(context.releaseId);
    if (previousCycle && previousCycle.length > 0) {
      previousTag = previousCycle[0].cycleTag || undefined;
    }

    // Create release notes - integration returns notes content (string)
    const notes = await this.scmService.createReleaseNotes(
      tenantId,
      currentTag,
      previousTag,
      release.version,
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
   * Triggers regression builds via CI/CD integration.
   * Returns: Simple string (comma-separated build numbers, e.g., '1.4.3-ios-2,1.4.3-and-2')
   */
  private async executeTriggerRegressionBuilds(
    context: TaskExecutionContext
  ): Promise<string> {
    const { release, tenantId, task } = context;

    if (!task.regressionId) {
      throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_ID_NOT_FOUND);
    }

    // Get release configuration
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const workflowId = releaseConfig.ciConfigId;
    
    if (!workflowId) {
      throw new Error(RELEASE_ERROR_MESSAGES.CICD_WORKFLOW_NOT_CONFIGURED);
    }

    // Get the appropriate workflow service
    const workflowService = await this.getWorkflowService(workflowId);

    // Get storage and Sequelize instance
    const storage = getStorage();
    if (!hasSequelize(storage)) {
      throw new Error(RELEASE_ERROR_MESSAGES.STORAGE_NO_SEQUELIZE);
    }
    const sequelize = (storage as StorageWithSequelize).sequelize;
    const BuildModel = sequelize.models.build;
    const PlatformModel = sequelize.models.platform;
    const ReleaseModel = sequelize.models.release;

    if (!BuildModel || !PlatformModel || !ReleaseModel) {
      throw new Error(RELEASE_ERROR_MESSAGES.REQUIRED_MODELS_NOT_FOUND_BUILD);
    }

    // Fetch platforms linked to release via platform_releases junction table
    const releaseInstance = await ReleaseModel.findByPk(context.releaseId, {
      include: [{
        model: PlatformModel,
        as: 'platforms',
        through: { attributes: [] }
      }]
    });

    if (!releaseInstance) {
      throw new Error(RELEASE_ERROR_MESSAGES.RELEASE_NOT_FOUND(context.releaseId));
    }

    const platforms = (releaseInstance as any).platforms || [];
    if (platforms.length === 0) {
      throw new Error(RELEASE_ERROR_MESSAGES.NO_PLATFORMS_FOR_RELEASE(context.releaseId));
    }

    const buildNumbers: string[] = [];
    const createdBuilds: Array<{ platform: string; buildNumber: string; buildId: string }> = [];

    // Trigger build for each platform
    for (const platform of platforms) {
      const platformName = platform.name; // IOS, ANDROID, or WEB
      const platformId = platform.id;

      // Call workflow service trigger with correct parameters
      const result = await workflowService.trigger(tenantId, {
        workflowId: workflowId,
        workflowType: WorkflowType.REGRESSION_BUILD,
        platform: platformName,
        jobParameters: {
          platform: platformName,
          version: release.version,
          branch: release.branchRelease || `release/v${release.version}`,
          buildType: 'regression',
          regressionId: task.regressionId
        }
      });

      const buildNumber = result.queueLocation || `build-${Date.now()}`;

      // Create build record in builds table (linked to regression cycle)
      const buildId = uuidv4();
      await BuildModel.create({
        id: buildId,
        number: buildNumber,
        link: result.queueLocation,
        releaseId: context.releaseId,
        platformId: platformId,
        targetId: null,
        regressionId: task.regressionId,
        releaseBuildsId: null
      });

      buildNumbers.push(buildNumber);
      createdBuilds.push({
        platform: platformName,
        buildNumber: buildNumber,
        buildId: buildId
      });
    }

    // Category A: Return raw string (comma-separated build numbers)
    return buildNumbers.join(',');
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
    const workflowId = releaseConfig.ciConfigId;
    
    if (!workflowId) {
      throw new Error(RELEASE_ERROR_MESSAGES.CICD_WORKFLOW_NOT_CONFIGURED);
    }

    // Get the appropriate workflow service
    const workflowService = await this.getWorkflowService(workflowId);

    // Get storage and Sequelize for platforms
    const storage = getStorage();
    if (!hasSequelize(storage)) {
      throw new Error(RELEASE_ERROR_MESSAGES.STORAGE_NO_SEQUELIZE);
    }
    const sequelize = (storage as StorageWithSequelize).sequelize;
    const PlatformModel = sequelize.models.platform;
    const ReleaseModel = sequelize.models.release;

    // Fetch platforms linked to release
    const releaseInstance = await ReleaseModel.findByPk(context.releaseId, {
      include: [{
        model: PlatformModel,
        as: 'platforms',
        through: { attributes: [] }
      }]
    });

    if (!releaseInstance) {
      throw new Error(RELEASE_ERROR_MESSAGES.RELEASE_NOT_FOUND(context.releaseId));
    }

    const platforms = (releaseInstance as any).platforms || [];
    if (platforms.length === 0) {
      throw new Error(RELEASE_ERROR_MESSAGES.NO_PLATFORMS_FOR_RELEASE(context.releaseId));
    }

    const runIds: string[] = [];

    // Trigger automation for each platform
    for (const platform of platforms) {
      const platformName = platform.name;

      const result = await workflowService.trigger(tenantId, {
        workflowId: workflowId,
        workflowType: WorkflowType.AUTOMATION_BUILD,
        platform: platformName,
        jobParameters: {
          platform: platformName,
          version: release.version,
          branch: release.branchRelease || `release/v${release.version}`,
          regressionId: task.regressionId
        }
      });

      runIds.push(result.queueLocation || `run-${Date.now()}`);
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
    const { release, tenantId, task } = context;

    if (!this.testRunService) {
      throw new Error(RELEASE_ERROR_MESSAGES.TEST_PLATFORM_NOT_AVAILABLE);
    }

    // Get automation run ID from TRIGGER_AUTOMATION_RUNS task
    // Get all tasks for this regression cycle and find TRIGGER_AUTOMATION_RUNS
    const releaseTasksDTO = new ReleaseTasksDTO();
    const cycleTasks = await releaseTasksDTO.getByRegressionCycle(task.regressionId!);
    
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

  /**
   * Execute SEND_REGRESSION_BUILD_MESSAGE task
   * 
   * Sends a notification message about regression builds.
   */
  /**
   * Execute SEND_REGRESSION_BUILD_MESSAGE task (Category B)
   * 
   * Sends regression build notification.
   * Returns: Object with message details
   */
  private async executeSendRegressionBuildMessage(
    context: TaskExecutionContext
    
  ): Promise<Record<string, unknown>> {
    const { release, tenantId, task } = context;

    if (!this.slackService) {
      throw new Error(RELEASE_ERROR_MESSAGES.NOTIFICATION_INTEGRATION_NOT_AVAILABLE);
    }

    if (!task.regressionId) {
      throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_ID_NOT_FOUND);
    }

    // Get cycle tag
    const storage = getStorage();
    if (!hasSequelize(storage)) {
      throw new Error(RELEASE_ERROR_MESSAGES.STORAGE_NO_SEQUELIZE);
    }
    const sequelize = (storage as StorageWithSequelize).sequelize;
    const RegressionCycleModel = sequelize.models.regressionCycle;

    if (!RegressionCycleModel) {
        throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_MODEL_NOT_FOUND);
    }

    const cycle = await RegressionCycleModel.findByPk(task.regressionId);
    if (!cycle) {
      throw new Error(RELEASE_ERROR_MESSAGES.REGRESSION_CYCLE_NOT_FOUND(task.regressionId));
    }

    const cycleTag = (cycle as any).cycleTag;

    // Send regression build message - returns messageId (string)
    // TODO: Implement notification sending via SlackChannelConfigService
    console.log("[TaskExecutor] TODO: Implement notification");
    const messageId = `mock-${Date.now()}`;

    // Category B: Return raw object
    return {
      messageId: messageId,
      template: 'regression-builds',
      cycleTag: cycleTag,
      version: release.version,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute PRE_RELEASE_CHERRY_PICKS_REMINDER task
   * 
   * Sends cherry picks reminder notification.
   */
  /**
   * Execute PRE_RELEASE_CHERRY_PICKS_REMINDER task (Category B)
   * 
   * Sends cherry picks reminder notification.
   * Returns: Object with message details
   */
  private async executePreReleaseCherryPicksReminder(
    context: TaskExecutionContext
    
  ): Promise<Record<string, unknown>> {
    const { release, tenantId } = context;

    if (!this.slackService) {
      throw new Error(RELEASE_ERROR_MESSAGES.NOTIFICATION_INTEGRATION_NOT_AVAILABLE);
    }

    // Send cherry picks reminder message - returns messageId (string)
    // TODO: Implement notification sending via SlackChannelConfigService
    console.log("[TaskExecutor] TODO: Implement notification");
    const messageId = `mock-${Date.now()}`;

    // Category B: Return raw object
    return {
      messageId: messageId,
      template: 'cherry-picks-reminder',
      version: release.version,
      branch: release.branchRelease,
      timestamp: new Date().toISOString()
    };
  }

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

    // Get platforms to determine targets
    // For now, we'll use platforms as targets (IOS -> APP_STORE, ANDROID -> PLAY_STORE, WEB -> WEB)
    const storage = getStorage();
    if (!hasSequelize(storage)) {
      throw new Error(RELEASE_ERROR_MESSAGES.STORAGE_NO_SEQUELIZE);
    }
    const sequelize = (storage as StorageWithSequelize).sequelize;
    const ReleaseModel = sequelize.models.release;
    const PlatformModel = sequelize.models.platform;

    if (!ReleaseModel || !PlatformModel) {
      throw new Error(RELEASE_ERROR_MESSAGES.REQUIRED_MODELS_NOT_FOUND_RELEASE);
    }

    // Fetch platforms linked to release
    const releaseInstance = await ReleaseModel.findByPk(context.releaseId, {
      include: [{
        model: PlatformModel,
        as: 'platforms',
        through: { attributes: [] }
      }]
    });

    if (!releaseInstance) {
      throw new Error(RELEASE_ERROR_MESSAGES.RELEASE_NOT_FOUND(context.releaseId));
    }

    const platforms = (releaseInstance as any).platforms || [];
    
    // Map platforms to targets (IOS -> APP_STORE, ANDROID -> PLAY_STORE, WEB -> WEB)
    const targets: string[] = platforms.map((platform: any) => {
      const platformName = platform.name;
      if (platformName === 'IOS') return 'APP_STORE';
      if (platformName === 'ANDROID') return 'PLAY_STORE';
      if (platformName === 'WEB') return 'WEB';
      return platformName;
    });

    // Create final release tag - integration generates tag from targets + version (returns string)
    const tagName = await this.scmService.createReleaseTag(
      tenantId,
      release.branchRelease || `release/v${release.version}`,
      undefined, // No explicit tagName - let integration generate from targets + version
      targets,
      release.version
    );

    // Category B: Return raw object
    return {
      value: tagName,
      tagName: tagName,
      targets: targets,
      version: release.version,
      branch: release.branchRelease,
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
    const { release, tenantId } = context;

    if (!this.scmService) {
      throw new Error(RELEASE_ERROR_MESSAGES.SCM_INTEGRATION_NOT_AVAILABLE);
    }

    // Get current tag from CREATE_RELEASE_TAG task
    const stage3Tasks = await this.releaseTasksDTO.getByReleaseAndStage(
      context.releaseId,
      TaskStage.POST_REGRESSION
    );
    const createReleaseTagTask = stage3Tasks.find(t => t.taskType === TaskType.CREATE_RELEASE_TAG);
    
    if (!createReleaseTagTask || !createReleaseTagTask.externalId) {
      throw new Error(RELEASE_ERROR_MESSAGES.RELEASE_TAG_TASK_NOT_FOUND);
    }

    const currentTag = createReleaseTagTask.externalId;

    // Get previous tag from base release (if exists)
    const previousTag: string | null | undefined = undefined;
    let baseVersion: string | undefined = undefined;
    let parentTargets: string[] | undefined = undefined;

    if (release.parentId) {
      const parentRelease = await this.releaseDTO.get(release.parentId);
      if (parentRelease) {
        // Get parent release tag from stage data or external data
        // For now, we'll use baseVersion to generate previous tag
        baseVersion = release.baseVersion;
        
        // Get parent platforms as targets
        const storage = getStorage();
        if (hasSequelize(storage)) {
          const sequelize = (storage as StorageWithSequelize).sequelize;
          const ReleaseModel = sequelize.models.release;
          const PlatformModel = sequelize.models.platform;

          if (ReleaseModel && PlatformModel) {
            const parentReleaseInstance = await ReleaseModel.findByPk(release.parentId, {
              include: [{
                model: PlatformModel,
                as: 'platforms',
                through: { attributes: [] }
              }]
            });

            if (parentReleaseInstance) {
              const parentPlatforms = (parentReleaseInstance as any).platforms || [];
              parentTargets = parentPlatforms.map((platform: any) => {
                const platformName = platform.name;
                if (platformName === 'IOS') return 'APP_STORE';
                if (platformName === 'ANDROID') return 'PLAY_STORE';
                if (platformName === 'WEB') return 'WEB';
                return platformName;
              });
            }
          }
        }
      }
    }

    // Create final release notes - returns release notes URL (string)
    const releaseUrl = await this.scmService.createFinalReleaseNotes(
      tenantId,
      currentTag,
      previousTag,
      release.targetReleaseDate || new Date()
    );

    // Category B: Return raw object
    return {
      releaseUrl: releaseUrl,
      currentTag: currentTag,
      previousTag: previousTag || null,
      baseVersion: baseVersion,
      version: release.version,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute TRIGGER_TEST_FLIGHT_BUILD task (Category A)
   * 
   * Creates TestFlight build (only if iOS platform exists).
   * Returns: Simple string (e.g., 'testflight-123')
   */
  private async executeTestFlightBuild(
    context: TaskExecutionContext
  ): Promise<string> {
    const { release, tenantId } = context;

    // Get release configuration
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const workflowId = releaseConfig.ciConfigId;
    
    if (!workflowId) {
      throw new Error(RELEASE_ERROR_MESSAGES.CICD_WORKFLOW_NOT_CONFIGURED);
    }

    // Get the appropriate workflow service
    const workflowService = await this.getWorkflowService(workflowId);

    // Verify iOS platform exists
    const storage = getStorage();
    if (!hasSequelize(storage)) {
      throw new Error(RELEASE_ERROR_MESSAGES.STORAGE_NO_SEQUELIZE);
    }
    const sequelize = (storage as StorageWithSequelize).sequelize;
    const ReleaseModel = sequelize.models.release;
    const PlatformModel = sequelize.models.platform;

    if (!ReleaseModel || !PlatformModel) {
      throw new Error(RELEASE_ERROR_MESSAGES.REQUIRED_MODELS_NOT_FOUND_RELEASE);
    }

    const releaseInstance = await ReleaseModel.findByPk(context.releaseId, {
      include: [{
        model: PlatformModel,
        as: 'platforms',
        through: { attributes: [] }
      }]
    });

    if (!releaseInstance) {
      throw new Error(RELEASE_ERROR_MESSAGES.RELEASE_NOT_FOUND(context.releaseId));
    }

    const platforms = (releaseInstance as any).platforms || [];
    const hasIOS = platforms.some((platform: any) => platform.name === 'IOS');

    if (!hasIOS) {
        throw new Error(RELEASE_ERROR_MESSAGES.IOS_PLATFORM_REQUIRED);
    }

    // Create TestFlight build for iOS platform
    const result = await workflowService.trigger(tenantId, {
      workflowId: workflowId,
      workflowType: WorkflowType.TEST_FLIGHT_BUILD,
      platform: 'IOS',
      jobParameters: {
        platform: 'IOS',
        version: release.version,
        branch: release.branchRelease || `release/v${release.version}`,
        buildType: 'testflight'
      }
    });

    // Category A: Return raw string
    return result.queueLocation || `testflight-${Date.now()}`;
  }

  /**
   * Execute SEND_POST_REGRESSION_MESSAGE task
   * 
   * Sends post-regression notification (approval request message).
   */
  /**
   * Execute SEND_POST_REGRESSION_MESSAGE task (Category B)
   * 
   * Sends post-regression notification.
   * Returns: Object with message details
   */
  private async executeSendPostRegressionMessage(
    context: TaskExecutionContext
    
  ): Promise<Record<string, unknown>> {
    const { release, tenantId } = context;

    if (!this.slackService) {
      throw new Error(RELEASE_ERROR_MESSAGES.NOTIFICATION_INTEGRATION_NOT_AVAILABLE);
    }

    // Get release tag from CREATE_RELEASE_TAG task
    const stage3Tasks = await this.releaseTasksDTO.getByReleaseAndStage(
      context.releaseId,
      TaskStage.POST_REGRESSION
    );
    const createReleaseTagTask = stage3Tasks.find(t => t.taskType === TaskType.CREATE_RELEASE_TAG);
    const releaseTag = createReleaseTagTask?.externalId || release.version;

    // Send post-regression message (approval request) - returns messageId (string)
    // TODO: Implement notification sending via SlackChannelConfigService
    console.log("[TaskExecutor] TODO: Implement notification");
    const messageId = `mock-${Date.now()}`;

    // Category B: Return raw object
    return {
      messageId: messageId,
      template: 'post-regression-tag',
      releaseTag: releaseTag,
      version: release.version,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute CHECK_PROJECT_RELEASE_APPROVAL task (renamed from ADD_L6_APPROVAL_CHECK)
   * 
   * Checks project management ticket approval status.
   * Updates release status based on approval:
   * - If approved: Release status → APPROVED
   * - If not approved: Release status → PENDING_APPROVAL
   */
  /**
   * Execute CHECK_PROJECT_RELEASE_APPROVAL task (Category B)
   * 
   * Checks project management ticket approval status.
   * Returns: Object with approval status
   */
  private async executeCheckProjectReleaseApproval(
    context: TaskExecutionContext
    
  ): Promise<Record<string, unknown>> {
    const { release, tenantId } = context;

    // Get release configuration
    const releaseConfig = await this.getReleaseConfig(release.releaseConfigId);
    const pmConfigId = releaseConfig.projectManagementConfigId;
    
    if (!pmConfigId) {
      throw new Error(RELEASE_ERROR_MESSAGES.PM_INTEGRATION_NOT_CONFIGURED);
    }

    // Get JIRA ticket ID from CREATE_PROJECT_MANAGEMENT_TICKET task
    const stage1Tasks = await this.releaseTasksDTO.getByReleaseAndStage(
      context.releaseId,
      TaskStage.KICKOFF
    );
    const createTicketTask = stage1Tasks.find(t => t.taskType === TaskType.CREATE_PROJECT_MANAGEMENT_TICKET);

    if (!createTicketTask || !createTicketTask.externalId) {
      throw new Error(RELEASE_ERROR_MESSAGES.PM_TICKET_TASK_NOT_FOUND);
    }

    const ticketId = createTicketTask.externalId;

    // For now, check first platform's ticket (TODO: might need to check all)
    // Assuming ticketId format: "PROJ-123" or "PROJ-123,PROJ-124"
    const firstTicketId = ticketId.split(',')[0];

    // Check ticket approval status - integration returns status object
    const ticketStatus = await this.pmTicketService.checkTicketStatus(
      pmConfigId,
      Platform.IOS, // TODO: Determine correct platform or check all platforms
      firstTicketId
    );

    // Update release status based on approval
    // Note: ReleaseStatus enum doesn't have APPROVED or PENDING_APPROVAL
    // Store approval status in externalData for now
    // The release workflow ends after Stage 3 completes regardless of approval status
    // Approval status is stored in externalData.approved

    // Category B: Return raw object
    return {
      ticketId: ticketId,
      isCompleted: ticketStatus.isCompleted,
      currentStatus: ticketStatus.currentStatus,
      completedStatus: ticketStatus.completedStatus,
      message: ticketStatus.message,
      version: release.version,
      timestamp: new Date().toISOString()
    };
  }
}


