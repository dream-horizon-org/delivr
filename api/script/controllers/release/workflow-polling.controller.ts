/**
 * Workflow Polling Controller
 * 
 * Handles HTTP requests from Cronicle for workflow status polling.
 * Two endpoints:
 * 1. Poll PENDING workflows → detect when jobs start
 * 2. Poll RUNNING workflows → detect when jobs complete/fail
 */

import { Request, Response } from 'express';
import type { WorkflowPollingService } from '~services/release/workflow-polling';
import { HTTP_STATUS } from '../../constants/http';
import {
  WORKFLOW_POLLING_ERROR_MESSAGES,
  WORKFLOW_POLLING_SUCCESS_MESSAGES
} from '~services/release/workflow-polling';

// ============================================================================
// TYPES
// ============================================================================

type WorkflowPollingController = {
  pollPendingWorkflows: (req: Request, res: Response) => Promise<Response>;
  pollRunningWorkflows: (req: Request, res: Response) => Promise<Response>;
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

type ValidationResult = {
  valid: boolean;
  releaseId?: string;
  tenantId?: string;
  error?: string;
};

const validateRequestBody = (body: unknown): ValidationResult => {
  const bodyIsObject = typeof body === 'object' && body !== null;
  if (!bodyIsObject) {
    return { valid: false, error: 'Request body must be an object' };
  }

  const { releaseId, tenantId } = body as Record<string, unknown>;

  const releaseIdMissing = !releaseId;
  if (releaseIdMissing) {
    return { valid: false, error: WORKFLOW_POLLING_ERROR_MESSAGES.RELEASE_ID_REQUIRED };
  }

  const releaseIdNotString = typeof releaseId !== 'string';
  if (releaseIdNotString) {
    return { valid: false, error: 'releaseId must be a string' };
  }

  const tenantIdMissing = !tenantId;
  if (tenantIdMissing) {
    return { valid: false, error: WORKFLOW_POLLING_ERROR_MESSAGES.TENANT_ID_REQUIRED };
  }

  const tenantIdNotString = typeof tenantId !== 'string';
  if (tenantIdNotString) {
    return { valid: false, error: 'tenantId must be a string' };
  }

  return {
    valid: true,
    releaseId: releaseId as string,
    tenantId: tenantId as string
  };
};

// ============================================================================
// HANDLER FACTORIES
// ============================================================================

/**
 * Handler for polling PENDING workflows
 * POST /internal/cron/builds/poll-pending-workflows
 */
const createPollPendingHandler = (service: WorkflowPollingService) =>
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const validation = validateRequestBody(req.body);
      const validationFailed = !validation.valid;
      if (validationFailed) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: validation.error
        });
      }

      // Safe to access after validation (validation.valid ensures these are defined)
      const releaseId = validation.releaseId as string;
      const tenantId = validation.tenantId as string;
      const result = await service.pollPendingWorkflows(releaseId, tenantId);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: WORKFLOW_POLLING_SUCCESS_MESSAGES.PENDING_POLL_COMPLETED,
        data: result
      });
    } catch (error: unknown) {
      console.error('[WorkflowPollingController] pollPendingWorkflows error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to poll pending workflows',
        message: errorMessage
      });
    }
  };

/**
 * Handler for polling RUNNING workflows
 * POST /internal/cron/builds/poll-running-workflows
 */
const createPollRunningHandler = (service: WorkflowPollingService) =>
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const validation = validateRequestBody(req.body);
      const validationFailed = !validation.valid;
      if (validationFailed) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: validation.error
        });
      }

      // Safe to access after validation (validation.valid ensures these are defined)
      const releaseId = validation.releaseId as string;
      const tenantId = validation.tenantId as string;
      const result = await service.pollRunningWorkflows(releaseId, tenantId);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: WORKFLOW_POLLING_SUCCESS_MESSAGES.RUNNING_POLL_COMPLETED,
        data: result
      });
    } catch (error: unknown) {
      console.error('[WorkflowPollingController] pollRunningWorkflows error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to poll running workflows',
        message: errorMessage
      });
    }
  };

// ============================================================================
// CONTROLLER FACTORY
// ============================================================================

/**
 * Create workflow polling controller
 * 
 * @param service - WorkflowPollingService instance
 * @returns Controller with polling handlers
 */
export const createWorkflowPollingController = (
  service: WorkflowPollingService
): WorkflowPollingController => ({
  pollPendingWorkflows: createPollPendingHandler(service),
  pollRunningWorkflows: createPollRunningHandler(service)
});

