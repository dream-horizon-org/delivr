/**
 * Remix API Route: Extra Commits Detection
 * GET /api/v1/releases/:releaseId/extra-commits - Check for commits after last regression
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
} from '~/constants/distribution/distribution-api.constants';

export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { releaseId } = params;

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }

    try {
      const response = await DistributionService.checkExtraCommits(releaseId);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.EXTRA_COMMITS_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_CHECK_EXTRA_COMMITS);
    }
  }
);

