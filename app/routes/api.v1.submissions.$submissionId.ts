/**
 * Remix API Route: Single Submission Management
 * GET  /api/v1/submissions/:submissionId        - Get submission details
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
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

// Note: Retry submission is now handled via POST /api/v1/distributions/:distributionId/submissions
// This route only handles GET requests for submission details

