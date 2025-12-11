/**
 * Remix API Route: Single Submission Management
 * GET  /api/v1/submissions/:submissionId        - Get submission details
 * POST /api/v1/submissions/:submissionId/retry  - Retry failed submission
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
} from '~/constants/distribution-api.constants';

/**
 * GET - Get submission details
 */
export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { submissionId } = params;

    if (!validateRequired(submissionId, ERROR_MESSAGES.SUBMISSION_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
    }

    try {
      const response = await DistributionService.getSubmission(submissionId);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.SUBMISSION_DETAILS_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_SUBMISSION);
    }
  }
);

/**
 * POST - Retry failed submission
 */
const retrySubmission: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { submissionId } = params;

  if (!validateRequired(submissionId, ERROR_MESSAGES.SUBMISSION_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
  }

  try {
    const body = await request.json();
    const { updates, newBuildId } = body;

    const requestData = { submissionId, updates, newBuildId };
    const response = await DistributionService.retrySubmission(submissionId, requestData);

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.RETRY_SUBMISSION_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_RETRY_SUBMISSION);
  }
};

export const action = authenticateActionRequest({ POST: retrySubmission });

