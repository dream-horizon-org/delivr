/**
 * Workflow Polling Cronicle Jobs
 * 
 * Helper functions to create/delete Cronicle jobs for workflow polling.
 * Jobs are created when a release starts and deleted when it completes/archives.
 */

import type { CronicleService } from '~services/cronicle';
import {
  WORKFLOW_POLLING_CONFIG,
  CRONICLE_JOB_ID_PATTERNS
} from './workflow-polling.constants';

// ============================================================================
// TYPES
// ============================================================================

type CreateJobsParams = {
  releaseId: string;
  tenantId: string;
  cronicleService: CronicleService;
};

type DeleteJobsParams = {
  releaseId: string;
  cronicleService: CronicleService;
};

type CreateJobsResult = {
  success: boolean;
  pendingJobId?: string;
  runningJobId?: string;
  error?: string;
};

type DeleteJobsResult = {
  success: boolean;
  pendingDeleted: boolean;
  runningDeleted: boolean;
  errors: string[];
};

// ============================================================================
// CONSTANTS
// ============================================================================

const WORKFLOW_POLLING_CATEGORY = 'Workflow Polling';

const getPollingIntervalMinutes = (): number => {
  const envValue = process.env[WORKFLOW_POLLING_CONFIG.POLL_INTERVAL_ENV_VAR];
  const hasEnvValue = envValue !== undefined && envValue !== '';
  if (hasEnvValue) {
    const parsed = parseInt(envValue, 10);
    const isValidNumber = !isNaN(parsed) && parsed > 0;
    if (isValidNumber) {
      return parsed;
    }
  }
  return WORKFLOW_POLLING_CONFIG.DEFAULT_POLL_INTERVAL_MINUTES;
};

// ============================================================================
// CREATE JOBS
// ============================================================================

/**
 * Create workflow polling Cronicle jobs for a release.
 * Creates two jobs:
 * - Pending poller: Checks PENDING builds every N minutes
 * - Running poller: Checks RUNNING builds every N minutes
 * 
 * @param params - Release and service info
 * @returns Result with job IDs or error
 */
export const createWorkflowPollingJobs = async (
  params: CreateJobsParams
): Promise<CreateJobsResult> => {
  const { releaseId, tenantId, cronicleService } = params;

  const pendingJobId = CRONICLE_JOB_ID_PATTERNS.PENDING_POLLER(releaseId);
  const runningJobId = CRONICLE_JOB_ID_PATTERNS.RUNNING_POLLER(releaseId);
  const intervalMinutes = getPollingIntervalMinutes();

  try {
    // Create pending poller job
    await cronicleService.createJob({
      id: pendingJobId,
      title: `Workflow Poll - Pending - ${releaseId}`,
      category: WORKFLOW_POLLING_CATEGORY,
      enabled: true,
      timing: {
        minutes: [intervalMinutes], // Every N minutes
        hours: Array.from({ length: 24 }, (_, i) => i) // Every hour
      },
      params: {
        method: 'POST',
        url: cronicleService.buildDirectUrl('/internal/cron/builds/poll-pending-workflows'),
        body: { releaseId, tenantId }
      },
      notes: `Polls PENDING CI/CD builds for release ${releaseId}`
    });

    console.log(`[WorkflowPollingJobs] Created pending poller job: ${pendingJobId}`);

    // Create running poller job
    await cronicleService.createJob({
      id: runningJobId,
      title: `Workflow Poll - Running - ${releaseId}`,
      category: WORKFLOW_POLLING_CATEGORY,
      enabled: true,
      timing: {
        minutes: [intervalMinutes], // Every N minutes
        hours: Array.from({ length: 24 }, (_, i) => i) // Every hour
      },
      params: {
        method: 'POST',
        url: cronicleService.buildDirectUrl('/internal/cron/builds/poll-running-workflows'),
        body: { releaseId, tenantId }
      },
      notes: `Polls RUNNING CI/CD builds for release ${releaseId}`
    });

    console.log(`[WorkflowPollingJobs] Created running poller job: ${runningJobId}`);

    return {
      success: true,
      pendingJobId,
      runningJobId
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[WorkflowPollingJobs] Failed to create jobs for release ${releaseId}:`, errorMessage);
    
    // Try to clean up any partially created jobs
    try {
      await cronicleService.deleteJob(pendingJobId);
    } catch {
      // Ignore cleanup errors
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// ============================================================================
// DELETE JOBS
// ============================================================================

/**
 * Delete workflow polling Cronicle jobs for a release.
 * Called when release is COMPLETED or ARCHIVED.
 * 
 * @param params - Release and service info
 * @returns Result with deletion status
 */
export const deleteWorkflowPollingJobs = async (
  params: DeleteJobsParams
): Promise<DeleteJobsResult> => {
  const { releaseId, cronicleService } = params;

  const pendingJobId = CRONICLE_JOB_ID_PATTERNS.PENDING_POLLER(releaseId);
  const runningJobId = CRONICLE_JOB_ID_PATTERNS.RUNNING_POLLER(releaseId);
  
  const errors: string[] = [];
  let pendingDeleted = false;
  let runningDeleted = false;

  // Delete pending poller job
  try {
    await cronicleService.deleteJob(pendingJobId);
    pendingDeleted = true;
    console.log(`[WorkflowPollingJobs] Deleted pending poller job: ${pendingJobId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Job might not exist - that's OK
    console.warn(`[WorkflowPollingJobs] Could not delete pending job ${pendingJobId}:`, errorMessage);
    errors.push(`Pending job: ${errorMessage}`);
  }

  // Delete running poller job
  try {
    await cronicleService.deleteJob(runningJobId);
    runningDeleted = true;
    console.log(`[WorkflowPollingJobs] Deleted running poller job: ${runningJobId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Job might not exist - that's OK
    console.warn(`[WorkflowPollingJobs] Could not delete running job ${runningJobId}:`, errorMessage);
    errors.push(`Running job: ${errorMessage}`);
  }

  const success = pendingDeleted || runningDeleted || errors.length === 0;

  return {
    success,
    pendingDeleted,
    runningDeleted,
    errors
  };
};

