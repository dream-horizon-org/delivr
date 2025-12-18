/**
 * Remix API Route: Builds Management (Pre-Release Stage)
 * GET /api/v1/releases/:releaseId/builds - Fetch all builds for release
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { DistributionService } from '~/.server/services/Distribution';
import type { User } from '~/.server/services/Auth/Auth.interface';
import {
  createValidationError,
  extractPlatformFromQuery,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import {
  ERROR_MESSAGES,
  LOG_CONTEXT,
} from '~/constants/distribution/distribution-api.constants';

export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { releaseId } = params;

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }

    try {
      const platform = extractPlatformFromQuery(request);
      const response = await DistributionService.getBuilds(releaseId, platform);

      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.BUILDS_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_BUILDS);
    }
  }
);
