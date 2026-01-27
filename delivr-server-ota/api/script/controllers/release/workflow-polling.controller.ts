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
import { createScopedLogger } from '~utils/logger.utils';

const log = createScopedLogger('WorkflowPollingController');

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

/** Validation failed - has error message */
type ValidationFailure = {
  readonly valid: false;
  readonly error: string;
};

/** Validation succeeded - has validated values */
type ValidationSuccess = {
  readonly valid: true;
  readonly releaseId: string;
  readonly appId: string;
};

/** Discriminated union - valid determines which fields are present */
type ValidationResult = ValidationFailure | ValidationSuccess;

/** Type guard for validation failure */
const isValidationFailure = (result: ValidationResult): result is ValidationFailure => {
  return !result.valid;
};

const validateRequestBody = (body: unknown): ValidationResult => {
  const bodyIsObject = typeof body === 'object' && body !== null;
  if (!bodyIsObject) {
    return { valid: false, error: 'Request body must be an object' };
  }

  const { releaseId, appId } = body as Record<string, unknown>;

  const releaseIdMissing = !releaseId;
  if (releaseIdMissing) {
    return { valid: false, error: WORKFLOW_POLLING_ERROR_MESSAGES.RELEASE_ID_REQUIRED };
  }

  const releaseIdNotString = typeof releaseId !== 'string';
  if (releaseIdNotString) {
    return { valid: false, error: 'releaseId must be a string' };
  }

  const tenantIdMissing = !appId;
  if (tenantIdMissing) {
    return { valid: false, error: WORKFLOW_POLLING_ERROR_MESSAGES.APP_ID_REQUIRED };
  }

  const tenantIdNotString = typeof appId !== 'string';
  if (tenantIdNotString) {
    return { valid: false, error: 'appId must be a string' };
  }

  // TypeScript knows releaseId and appId are strings here
  return {
    valid: true,
    releaseId,
    appId
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
      
      // Check validation result using type guard
      if (isValidationFailure(validation)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: validation.error
        });
      }

      // TypeScript knows validation is ValidationSuccess here
      const result = await service.pollPendingWorkflows(validation.releaseId, validation.appId);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: WORKFLOW_POLLING_SUCCESS_MESSAGES.PENDING_POLL_COMPLETED,
        data: result
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('pollPendingWorkflows failed', { error: errorMessage });
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
      
      // Check validation result using type guard
      if (isValidationFailure(validation)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: validation.error
        });
      }

      // TypeScript knows validation is ValidationSuccess here
      const result = await service.pollRunningWorkflows(validation.releaseId, validation.appId);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: WORKFLOW_POLLING_SUCCESS_MESSAGES.RUNNING_POLL_COMPLETED,
        data: result
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('pollRunningWorkflows failed', { error: errorMessage });
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

