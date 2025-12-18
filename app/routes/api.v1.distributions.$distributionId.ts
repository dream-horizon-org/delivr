/**
 * Remix API Route: Get Distribution Details by ID
 * GET /api/v1/distributions/:distributionId
 * 
 * Returns complete distribution object with all submissions and artifacts.
 * Used by Distribution Management Page to fetch full details.
 * 
 * Reference: DISTRIBUTION_API_SPEC.md lines 602-714
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
 * GET - Get complete distribution details by distributionId
 * 
 * Returns:
 * - Full distribution object
 * - ALL submissions (current + historical)
 * - Artifact details for each submission
 * - Platform-specific fields
 * 
 * Error Cases:
 * - 404: Distribution not found
 */
export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { distributionId } = params;

    if (!validateRequired(distributionId, ERROR_MESSAGES.DISTRIBUTION_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.DISTRIBUTION_ID_REQUIRED);
    }

    try {
      const response = await DistributionService.getDistribution(distributionId);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.DISTRIBUTION_MANAGEMENT_LOADER, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_DISTRIBUTION);
    }
  }
);

