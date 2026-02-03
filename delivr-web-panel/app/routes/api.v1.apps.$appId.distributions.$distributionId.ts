/**
 * Remix API Route: Get Distribution Details by ID
 * GET /api/v1/apps/:appId/distributions/:distributionId
 * 
 * Returns complete distribution object with all submissions and artifacts.
 * Used by Distribution Management Page to fetch full details.
 * 
 * Path Parameters:
 * - appId: Tenant/Organization ID (required)
 * - distributionId: Distribution ID (required)
 * 
 * Reference: DISTRIBUTION_API_SPEC.md lines 920-1050
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import type { User } from '~/.server/services/Auth/auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import {
    ERROR_MESSAGES,
    LOG_CONTEXT,
} from '~/constants/distribution/distribution-api.constants';
import {
    createValidationError,
    handleAxiosError,
    logApiError
} from '~/utils/api-route-helpers';
import { authenticateLoaderRequest } from '~/utils/authenticate';

/**
 * GET - Get complete distribution details by distributionId
 * 
 * Path Parameters:
 * - appId: Tenant/Organization ID (required)
 * - distributionId: Distribution ID (required)
 * 
 * Returns:
 * - Full distribution object
 * - ALL submissions (current + historical)
 * - Artifact details for each submission
 * - Platform-specific fields
 * 
 * Error Cases:
 * - 400: Missing appId or distributionId
 * - 403: Unauthorized (tenant validation failed)
 * - 404: Distribution not found
 */
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const appId = params.appId;
    const distributionId = params.distributionId;

    // Validate required parameters
    if (!appId) {
      return createValidationError(ERROR_MESSAGES.APP_ID_REQUIRED);
    }

    if (!distributionId) {
      return createValidationError(ERROR_MESSAGES.DISTRIBUTION_ID_REQUIRED);
    }

    try {
      const response = await DistributionService.getDistribution(appId, distributionId);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.DISTRIBUTION_MANAGEMENT_LOADER, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_DISTRIBUTION);
    }
  }
);

