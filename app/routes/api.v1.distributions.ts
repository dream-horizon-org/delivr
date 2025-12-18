/**
 * Remix API Route: List Distributions
 * GET /api/v1/distributions
 * 
 * Returns paginated list of distributions with only latest submission per platform.
 * Includes aggregate stats calculated from ALL distributions (not just current page).
 * 
 * Query Parameters:
 * - tenantId: Tenant/Organization ID (required)
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 10, max: 100)
 * - status: Filter by distribution status (optional)
 * - platform: Filter by platform (optional)
 * 
 * Reference: DISTRIBUTION_API_SPEC.md lines 344-466
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import {
  ERROR_MESSAGES,
  LOG_CONTEXT,
} from '~/constants/distribution/distribution-api.constants';
import {
  handleAxiosError,
  logApiError,
} from '~/utils/api-route-helpers';
import { authenticateLoaderRequest } from '~/utils/authenticate';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export const loader = authenticateLoaderRequest(
  async ({ request, user }: LoaderFunctionArgs & { user: User }) => {
    try {
      // Extract query parameters
      const url = new URL(request.url);
      const tenantId = url.searchParams.get('tenantId');
      
      // tenantId is required
      if (!tenantId) {
        return json(
          { success: false, error: { message: 'tenantId query parameter is required' } },
          { status: 400 }
        );
      }
      
      const page = Math.max(DEFAULT_PAGE, parseInt(url.searchParams.get('page') || String(DEFAULT_PAGE)));
      const pageSize = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(url.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE)))
      );
      const status = url.searchParams.get('status');
      const platform = url.searchParams.get('platform');

      // Call backend service
      const response = await DistributionService.listDistributions(
        tenantId,
        page,
        pageSize,
        status,
        platform
      );

      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.DISTRIBUTIONS_LIST_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_DISTRIBUTIONS);
    }
  }
);

