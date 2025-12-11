/**
 * Remix API Route: Submissions Management
 * GET /api/v1/releases/:releaseId/submissions - List all submissions for release
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
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

export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { releaseId } = params;

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }

    try {
      const response = await DistributionService.getSubmissions(releaseId);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.SUBMISSIONS_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_SUBMISSIONS);
    }
  }
);

