/**
 * Remix API Route: Submission History
 * GET /api/v1/submissions/:submissionId/history - Get submission event history
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { DistributionService } from '~/.server/services/Distribution';
import type { User } from '~/.server/services/Auth/Auth.interface';
import {
  createValidationError,
  extractPaginationParams,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import {
  ERROR_MESSAGES,
  LOG_CONTEXT,
} from '~/constants/distribution-api.constants';

export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { submissionId } = params;

    if (!validateRequired(submissionId, ERROR_MESSAGES.SUBMISSION_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
    }

    try {
      const { limit, offset } = extractPaginationParams(request);
      const response = await DistributionService.getSubmissionHistory(
        submissionId,
        limit,
        offset
      );

      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.SUBMISSION_HISTORY_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_SUBMISSION_HISTORY);
    }
  }
);
