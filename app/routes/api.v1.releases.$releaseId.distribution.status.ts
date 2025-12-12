/**
 * API Route: Get Distribution Status
 * GET /api/v1/releases/:releaseId/distribution/status
 * 
 * Returns per-platform distribution status
 * Optional query param: ?platform=ANDROID or ?platform=IOS
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import { ERROR_MESSAGES, LOG_CONTEXT } from '~/constants/distribution-api.constants';
import {
  createValidationError,
  extractPlatformFromQuery,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import { authenticateLoaderRequest } from '~/utils/authenticate';

export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { releaseId } = params;
    // Note: tenantId would typically come from params or be extracted from release context
    // For Distribution APIs, releaseId is sufficient as identifier

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }

    try {
      const platform = extractPlatformFromQuery(request);
      const response = await DistributionService.getDistributionStatus(releaseId, platform);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.DISTRIBUTION_STATUS_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_DISTRIBUTION_STATUS);
    }
  }
);

