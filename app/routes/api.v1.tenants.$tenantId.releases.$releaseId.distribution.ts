/**
 * BFF API Route: Get Distribution by Release ID
 * GET /api/v1/tenants/:tenantId/releases/:releaseId/distribution
 * 
 * Returns complete distribution object with all submissions and artifacts
 * 
 * Path Parameters:
 * - tenantId: Tenant/Organization ID (required)
 * - releaseId: Release ID (required)
 * 
 * Reference: DISTRIBUTION_API_SPEC.md lines 378-609
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
 * GET - Get complete distribution details for release
 * Returns full distribution object with all submissions and artifacts
 * 
 * Path Parameters:
 * - tenantId: Tenant/Organization ID (required)
 * - releaseId: Release ID (required)
 * 
 * Used by:
 * - Distribution stage in release process
 * - Initial fetch to check if distribution exists
 * 
 * Error Cases:
 * - 400: Missing tenantId or releaseId
 * - 403: Unauthorized (tenant validation failed)
 * - 404: Distribution not found (pre-release not completed yet)
 */
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { tenantId, releaseId } = params;

    // Validate required parameters
    if (!tenantId) {
      return createValidationError(ERROR_MESSAGES.TENANT_ID_REQUIRED);
    }

    if (!releaseId) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }

    try {
      const response = await DistributionService.getReleaseDistribution(tenantId, releaseId);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.DISTRIBUTION_STATUS_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_DISTRIBUTION);
    }
  }
);

