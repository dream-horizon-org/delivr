/**
 * Remix API Route: Rollout Control
 * PATCH /api/v1/submissions/:submissionId/rollout        - Update rollout percentage
 * POST  /api/v1/submissions/:submissionId/rollout/pause  - Pause rollout
 * POST  /api/v1/submissions/:submissionId/rollout/resume - Resume rollout
 * POST  /api/v1/submissions/:submissionId/rollout/halt   - Emergency halt
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest, AuthenticatedActionFunction } from '~/utils/authenticate';
import { DistributionService } from '~/.server/services/Distribution';
import {
  createValidationError,
  handleAxiosError,
  isValidPercentage,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import {
  ERROR_MESSAGES,
  LOG_CONTEXT,
  VALIDATION,
} from '~/constants/distribution-api.constants';

/**
 * PATCH - Update rollout percentage
 */
const updateRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { submissionId } = params;

  if (!validateRequired(submissionId, ERROR_MESSAGES.SUBMISSION_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
  }

  try {
    const body = await request.json();
    const { percentage } = body;

    if (!isValidPercentage(percentage)) {
      return createValidationError(ERROR_MESSAGES.PERCENTAGE_REQUIRED);
    }

    const requestData = { submissionId, exposurePercent: percentage };
    const response = await DistributionService.updateRollout(submissionId, requestData);

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.UPDATE_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_UPDATE_ROLLOUT);
  }
};

/**
 * POST - Pause rollout
 */
const pauseRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { submissionId } = params;

  if (!validateRequired(submissionId, ERROR_MESSAGES.SUBMISSION_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
  }

  try {
    const body = await request.json();
    const { reason } = body;

    const requestData = { submissionId, reason };
    const response = await DistributionService.pauseRollout(submissionId, requestData);

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.PAUSE_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_PAUSE_ROLLOUT);
  }
};

/**
 * POST - Resume rollout
 */
const resumeRollout: AuthenticatedActionFunction = async ({ params, user }) => {
  const { submissionId } = params;

  if (!validateRequired(submissionId, ERROR_MESSAGES.SUBMISSION_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
  }

  try {
    const response = await DistributionService.resumeRollout(submissionId);
    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.RESUME_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_RESUME_ROLLOUT);
  }
};

/**
 * POST - Emergency halt
 */
const haltRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { submissionId } = params;

  if (!validateRequired(submissionId, ERROR_MESSAGES.SUBMISSION_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
  }

  try {
    const body = await request.json();
    const { reason, severity } = body;

    if (!reason) {
      return createValidationError(ERROR_MESSAGES.REASON_REQUIRED);
    }

    const requestData = { submissionId, reason, severity };
    const response = await DistributionService.haltRollout(submissionId, requestData);

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.HALT_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_HALT_ROLLOUT);
  }
};

/**
 * Route to sub-action based on URL path
 */
function routeRolloutAction(request: Request): 'pause' | 'resume' | 'halt' | null {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.endsWith('/pause')) return 'pause';
  if (pathname.endsWith('/resume')) return 'resume';
  if (pathname.endsWith('/halt')) return 'halt';

  return null;
}

export const action = authenticateActionRequest({
  PATCH: updateRollout,
  POST: (args: any) => {
    const actionType = routeRolloutAction(args.request);

    if (actionType === 'pause') return pauseRollout(args);
    if (actionType === 'resume') return resumeRollout(args);
    if (actionType === 'halt') return haltRollout(args);

    return createValidationError(ERROR_MESSAGES.INVALID_ENDPOINT);
  },
});
