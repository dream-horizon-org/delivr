/**
 * Remix API Route: PM Approval Status & Manual Approval
 * GET  /api/v1/releases/:releaseId/pm-status - Get PM approval status
 * POST /api/v1/releases/:releaseId/approve     - Manual approval (when no PM integration)
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import {
  authenticateLoaderRequest,
  authenticateActionRequest,
  AuthenticatedActionFunction,
} from '~/utils/authenticate';
import { DistributionService } from '~/.server/services/Distribution';
import type { User } from '~/.server/services/Auth/Auth.interface';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import {
  ERROR_MESSAGES,
  LOG_CONTEXT,
} from '~/constants/distribution/distribution-api.constants';

export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { releaseId } = params;

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }

    try {
      const response = await DistributionService.getPMStatus(releaseId);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.PM_STATUS_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_PM_STATUS);
    }
  }
);

const manualApprove: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { releaseId } = params;

  if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
  }

  try {
    const body = await request.json();
    const { approverComments } = body;

    const requestData = { releaseId, approverComments };
    const response = await DistributionService.manualApprove(releaseId, requestData);

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.MANUAL_APPROVE_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_APPROVE_RELEASE);
  }
};

export const action = authenticateActionRequest({ POST: manualApprove });

