/**
 * Workflow Polling Service
 * 
 * Polls CI/CD providers to check workflow status and updates the build table.
 * Called by Cronicle jobs on a configurable interval.
 * 
 * Two polling modes:
 * 1. Pending Poller: PENDING → RUNNING (gets ciRunId from queue)
 * 2. Running Poller: RUNNING → COMPLETED/FAILED (checks build status)
 */

import type { BuildRepository, Build } from '~models/release/build.repository';
import type { CIRunType } from '~models/release/build.sequelize.model';
import { JenkinsWorkflowService } from '~services/integrations/ci-cd/workflows/jenkins-workflow.service';
import { GitHubActionsWorkflowService } from '~services/integrations/ci-cd/workflows/github-actions-workflow.service';
import { BuildCallbackService } from '../build-callback.service';
import type {
  PollPendingResult,
  PollRunningResult,
  BuildPollResult,
  WorkflowStatusCheckResult
} from './workflow-polling.interface';
import { WORKFLOW_POLLING_ERROR_MESSAGES } from './workflow-polling.constants';

/**
 * Provider-specific status checker interface
 */
type ProviderStatusChecker = {
  checkQueueStatus: (tenantId: string, queueLocation: string) => Promise<WorkflowStatusCheckResult>;
  checkBuildStatus: (tenantId: string, ciRunId: string) => Promise<WorkflowStatusCheckResult>;
};

export class WorkflowPollingService {
  private readonly jenkinsService: JenkinsWorkflowService;
  private readonly ghaService: GitHubActionsWorkflowService;
  
  /**
   * Map of CI/CD provider type to status checker functions.
   * Add new providers here - no if-else needed!
   */
  private readonly providerCheckers: Record<CIRunType, ProviderStatusChecker>;

  constructor(
    private readonly buildRepo: BuildRepository,
    private readonly callbackService: BuildCallbackService
  ) {
    this.jenkinsService = new JenkinsWorkflowService();
    this.ghaService = new GitHubActionsWorkflowService();
    
    // Initialize provider checkers map
    this.providerCheckers = {
      JENKINS: {
        checkQueueStatus: this.checkJenkinsQueueStatus,
        checkBuildStatus: this.checkJenkinsBuildStatus
      },
      GITHUB_ACTIONS: {
        checkQueueStatus: this.checkGitHubActionsQueueStatus,
        checkBuildStatus: this.checkGitHubActionsBuildStatus
      },
      // Add new providers here:
      // CIRCLE_CI: { checkQueueStatus: ..., checkBuildStatus: ... },
      // GITLAB_CI: { checkQueueStatus: ..., checkBuildStatus: ... },
      CIRCLE_CI: {
        checkQueueStatus: this.unsupportedProviderChecker,
        checkBuildStatus: this.unsupportedProviderChecker
      },
      GITLAB_CI: {
        checkQueueStatus: this.unsupportedProviderChecker,
        checkBuildStatus: this.unsupportedProviderChecker
      }
    };
  }

  // ===========================================================================
  // PROVIDER-SPECIFIC STATUS CHECKERS
  // ===========================================================================

  /**
   * Jenkins: Check queue status
   */
  private checkJenkinsQueueStatus = async (
    tenantId: string,
    queueLocation: string
  ): Promise<WorkflowStatusCheckResult> => {
    const result = await this.jenkinsService.getQueueStatus(tenantId, queueLocation);
    return {
      status: result.status,
      ciRunId: result.executableUrl
    };
  };

  /**
   * Jenkins: Check build status
   */
  private checkJenkinsBuildStatus = async (
    tenantId: string,
    ciRunId: string
  ): Promise<WorkflowStatusCheckResult> => {
    const result = await this.jenkinsService.getBuildStatus(tenantId, ciRunId);
    return { status: result.status };
  };

  /**
   * GitHub Actions: Check queue status (queueLocation IS the run URL)
   */
  private checkGitHubActionsQueueStatus = async (
    tenantId: string,
    queueLocation: string
  ): Promise<WorkflowStatusCheckResult> => {
    const status = await this.ghaService.getRunStatus(tenantId, { runUrl: queueLocation });
    return {
      status,
      ciRunId: queueLocation // For GHA, ciRunId = queueLocation
    };
  };

  /**
   * GitHub Actions: Check build status
   * 
   * Returns 'pending' | 'running' | 'completed' | 'failed'
   * GHA conclusion is properly mapped to 'failed' for failure/cancelled/timed_out
   */
  private checkGitHubActionsBuildStatus = async (
    tenantId: string,
    ciRunId: string
  ): Promise<WorkflowStatusCheckResult> => {
    const status = await this.ghaService.getRunStatus(tenantId, { runUrl: ciRunId });
    return { status };
  };

  /**
   * Placeholder for unsupported providers
   */
  private unsupportedProviderChecker = async (): Promise<WorkflowStatusCheckResult> => {
    throw new Error(WORKFLOW_POLLING_ERROR_MESSAGES.UNSUPPORTED_PROVIDER);
  };

  // ===========================================================================
  // GENERIC STATUS CHECK METHODS (use provider map)
  // ===========================================================================

  /**
   * Check queue status from the appropriate CI/CD provider.
   */
  private checkQueueStatus = async (
    ciRunType: CIRunType,
    tenantId: string,
    queueLocation: string
  ): Promise<WorkflowStatusCheckResult> => {
    const checker = this.providerCheckers[ciRunType];
    const checkerNotFound = !checker;
    if (checkerNotFound) {
      throw new Error(`${WORKFLOW_POLLING_ERROR_MESSAGES.UNSUPPORTED_PROVIDER}: ${ciRunType}`);
    }
    return checker.checkQueueStatus(tenantId, queueLocation);
  };

  /**
   * Check build status from the appropriate CI/CD provider.
   */
  private checkBuildStatus = async (
    ciRunType: CIRunType,
    tenantId: string,
    ciRunId: string
  ): Promise<WorkflowStatusCheckResult> => {
    const checker = this.providerCheckers[ciRunType];
    const checkerNotFound = !checker;
    if (checkerNotFound) {
      throw new Error(`${WORKFLOW_POLLING_ERROR_MESSAGES.UNSUPPORTED_PROVIDER}: ${ciRunType}`);
    }
    return checker.checkBuildStatus(tenantId, ciRunId);
  };

  // ===========================================================================
  // PUBLIC POLLING METHODS
  // ===========================================================================

  /**
   * Poll all PENDING CI/CD builds for a release.
   * Checks if queued jobs have started running.
   * Updates workflowStatus to RUNNING and sets ciRunId.
   */
  pollPendingWorkflows = async (
    releaseId: string,
    tenantId: string
  ): Promise<PollPendingResult> => {
    const pendingBuilds = await this.buildRepo.findCiCdBuildsByReleaseAndWorkflowStatus(
      releaseId,
      'PENDING'
    );

    const results: BuildPollResult[] = [];
    const taskIdsWithChanges = new Set<string>();
    let updated = 0;

    for (const build of pendingBuilds) {
      const result = await this.checkPendingBuild(build, tenantId);
      results.push(result);

      if (result.updated) {
        updated++;
        const hasTaskId = !!build.taskId;
        if (hasTaskId) {
          taskIdsWithChanges.add(build.taskId as string);
        }
      }
    }

    // Trigger ONE callback per task that had ANY status change
    let callbacks = 0;
    for (const taskId of taskIdsWithChanges) {
      await this.callbackService.processCallback(taskId);
      callbacks++;
    }

    console.log(
      `[WorkflowPolling] Pending poll for release ${releaseId}: ` +
      `processed=${pendingBuilds.length}, updated=${updated}, callbacks=${callbacks}`
    );

    return {
      releaseId,
      processed: pendingBuilds.length,
      updated,
      callbacks,
      results
    };
  };

  /**
   * Poll all RUNNING CI/CD builds for a release.
   * Checks if running jobs have completed or failed.
   * Updates workflowStatus to COMPLETED or FAILED.
   */
  pollRunningWorkflows = async (
    releaseId: string,
    tenantId: string
  ): Promise<PollRunningResult> => {
    const runningBuilds = await this.buildRepo.findCiCdBuildsByReleaseAndWorkflowStatus(
      releaseId,
      'RUNNING'
    );

    const results: BuildPollResult[] = [];
    const taskIdsWithChanges = new Set<string>();
    let updated = 0;

    for (const build of runningBuilds) {
      const result = await this.checkRunningBuild(build, tenantId);
      results.push(result);

      if (result.updated) {
        updated++;
        const hasTaskId = !!build.taskId;
        if (hasTaskId) {
          taskIdsWithChanges.add(build.taskId as string);
        }
      }
    }

    // Trigger ONE callback per task that had ANY status change
    let callbacks = 0;
    for (const taskId of taskIdsWithChanges) {
      await this.callbackService.processCallback(taskId);
      callbacks++;
    }

    console.log(
      `[WorkflowPolling] Running poll for release ${releaseId}: ` +
      `processed=${runningBuilds.length}, updated=${updated}, callbacks=${callbacks}`
    );

    return {
      releaseId,
      processed: runningBuilds.length,
      updated,
      callbacks,
      results
    };
  };

  /**
   * Check status of a PENDING build.
   * Uses queueLocation to check if job has started.
   */
  private checkPendingBuild = async (
    build: Build,
    tenantId: string
  ): Promise<BuildPollResult> => {
    const buildId = build.id;
    const previousStatus = build.workflowStatus ?? 'PENDING';

    // Validate required fields
    const missingQueueLocation = !build.queueLocation;
    if (missingQueueLocation) {
      return {
        buildId,
        previousStatus,
        newStatus: previousStatus,
        updated: false,
        error: WORKFLOW_POLLING_ERROR_MESSAGES.MISSING_QUEUE_LOCATION
      };
    }

    const missingCiRunType = !build.ciRunType;
    if (missingCiRunType) {
      return {
        buildId,
        previousStatus,
        newStatus: previousStatus,
        updated: false,
        error: WORKFLOW_POLLING_ERROR_MESSAGES.MISSING_CI_RUN_TYPE
      };
    }

    try {
      // Check queue status from CI/CD provider
      const statusResult = await this.checkQueueStatus(
        build.ciRunType as CIRunType,
        tenantId,
        build.queueLocation as string
      );

      // Handle status transitions
      const stillPending = statusResult.status === 'pending';
      if (stillPending) {
        return {
          buildId,
          previousStatus,
          newStatus: 'PENDING',
          updated: false
        };
      }

      const isRunning = statusResult.status === 'running';
      const isCompleted = statusResult.status === 'completed';
      const jobStarted = isRunning || isCompleted;

      if (jobStarted) {
        // Job has started - update with ciRunId
        await this.buildRepo.update(buildId, {
          ciRunId: statusResult.ciRunId,
          workflowStatus: 'RUNNING'
        });
        return {
          buildId,
          previousStatus,
          newStatus: 'RUNNING',
          updated: true,
          ciRunId: statusResult.ciRunId
        };
      }

      const isCancelled = statusResult.status === 'cancelled';
      if (isCancelled) {
        // Job was cancelled from queue
        await this.buildRepo.update(buildId, {
          workflowStatus: 'FAILED',
          buildUploadStatus: 'FAILED'
        });
        return {
          buildId,
          previousStatus,
          newStatus: 'FAILED',
          updated: true
        };
      }

      // Unknown status - no update
      return {
        buildId,
        previousStatus,
        newStatus: previousStatus,
        updated: false
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[WorkflowPolling] Error checking pending build ${buildId}:`, errorMessage);
      return {
        buildId,
        previousStatus,
        newStatus: previousStatus,
        updated: false,
        error: errorMessage
      };
    }
  };

  /**
   * Check status of a RUNNING build.
   * Uses ciRunId to check if job has completed or failed.
   */
  private checkRunningBuild = async (
    build: Build,
    tenantId: string
  ): Promise<BuildPollResult> => {
    const buildId = build.id;
    const previousStatus = build.workflowStatus ?? 'RUNNING';

    // Validate required fields
    const missingCiRunId = !build.ciRunId;
    if (missingCiRunId) {
      return {
        buildId,
        previousStatus,
        newStatus: previousStatus,
        updated: false,
        error: WORKFLOW_POLLING_ERROR_MESSAGES.MISSING_CI_RUN_ID
      };
    }

    const missingCiRunType = !build.ciRunType;
    if (missingCiRunType) {
      return {
        buildId,
        previousStatus,
        newStatus: previousStatus,
        updated: false,
        error: WORKFLOW_POLLING_ERROR_MESSAGES.MISSING_CI_RUN_TYPE
      };
    }

    try {
      // Check build status from CI/CD provider
      const statusResult = await this.checkBuildStatus(
        build.ciRunType as CIRunType,
        tenantId,
        build.ciRunId as string
      );

      // Handle status transitions
      const stillRunning = statusResult.status === 'running';
      if (stillRunning) {
        return {
          buildId,
          previousStatus,
          newStatus: 'RUNNING',
          updated: false
        };
      }

      const isCompleted = statusResult.status === 'completed';
      if (isCompleted) {
        await this.buildRepo.update(buildId, {
          workflowStatus: 'COMPLETED'
          // Note: buildUploadStatus is set by artifact upload API, not here
        });
        return {
          buildId,
          previousStatus,
          newStatus: 'COMPLETED',
          updated: true
        };
      }

      const isFailed = statusResult.status === 'failed';
      if (isFailed) {
        await this.buildRepo.update(buildId, {
          workflowStatus: 'FAILED',
          buildUploadStatus: 'FAILED'
        });
        return {
          buildId,
          previousStatus,
          newStatus: 'FAILED',
          updated: true
        };
      }

      // Unknown status - no update
      return {
        buildId,
        previousStatus,
        newStatus: previousStatus,
        updated: false
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[WorkflowPolling] Error checking running build ${buildId}:`, errorMessage);
      return {
        buildId,
        previousStatus,
        newStatus: previousStatus,
        updated: false,
        error: errorMessage
      };
    }
  };

}

