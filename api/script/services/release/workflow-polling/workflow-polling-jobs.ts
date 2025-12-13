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
import { createScopedLogger } from '~utils/logger.utils';
import { getEnvNumber, ENV_DEFAULTS } from '~constants/env';

const log = createScopedLogger('WorkflowPollingJobs');

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
  return getEnvNumber(
    'WORKFLOW_POLL_INTERVAL_MINUTES',
    ENV_DEFAULTS.WORKFLOW_POLL_INTERVAL_MINUTES
  );
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

    log.info('Created pending poller job', { jobId: pendingJobId, releaseId });

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

    log.info('Created running poller job', { jobId: runningJobId, releaseId });

    return {
      success: true,
      pendingJobId,
      runningJobId
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to create jobs for release', { releaseId, error: errorMessage });
    
    // Try to clean up any partially created jobs
    try {
      await cronicleService.deleteJob(pendingJobId);
    } catch (cleanupError) {
      const cleanupErrorMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown error';
      log.warn('Non-fatal: Could not cleanup pending job during rollback', { 
        jobId: pendingJobId, 
        error: cleanupErrorMessage 
      });
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
    log.info('Deleted pending poller job', { jobId: pendingJobId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Job might not exist - that's OK
    log.warn('Could not delete pending job', { jobId: pendingJobId, error: errorMessage });
    errors.push(`Pending job: ${errorMessage}`);
  }

  // Delete running poller job
  try {
    await cronicleService.deleteJob(runningJobId);
    runningDeleted = true;
    log.info('Deleted running poller job', { jobId: runningJobId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Job might not exist - that's OK
    log.warn('Could not delete running job', { jobId: runningJobId, error: errorMessage });
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

