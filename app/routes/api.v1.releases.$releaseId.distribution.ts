/**
 * BFF API Route: Get Distribution by Release ID
 * GET /api/v1/releases/:releaseId/distribution
 * 
 * Returns complete distribution object with all submissions and artifacts
 * Reference: DISTRIBUTION_API_SPEC.md - Get Distribution by Release ID
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import {
    ERROR_MESSAGES,
    LOG_CONTEXT,
} from '~/constants/distribution/distribution-api.constants';
import {
    createValidationError,
    handleAxiosError,
    logApiError,
    validateRequired,
} from '~/utils/api-route-helpers';
import { authenticateLoaderRequest } from '~/utils/authenticate';

/**
 * GET - Get complete distribution details for release
 * Returns full distribution object with all submissions and artifacts
 * 
 * Used by:
 * - Distribution stage in release process
 * - Initial fetch to check if distribution exists
 */
export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { releaseId } = params;

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }

    try {
      const response = await DistributionService.getReleaseDistribution(releaseId, user.user.id);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.DISTRIBUTION_STATUS_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_DISTRIBUTION);
    }
  }
);

