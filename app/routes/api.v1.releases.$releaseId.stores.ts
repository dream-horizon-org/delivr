/**
 * API Route: Get Release Stores
 * GET /api/v1/releases/:releaseId/stores
 * 
 * Returns store integrations configured for this specific release
 * Release → ReleaseConfig → Store Integrations
 * 
 * This replaces the need to call /integrations/stores and filter manually
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { DistributionService } from '~/.server/services/Distribution';
import type { User } from '~/.server/services/Auth/Auth.interface';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import { ERROR_MESSAGES, LOG_CONTEXT } from '~/constants/distribution-api.constants';

export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { releaseId } = params;
    const tenantId = user.user.tenantId;

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }
    if (!validateRequired(tenantId, ERROR_MESSAGES.TENANT_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.TENANT_ID_REQUIRED);
    }

    try {
      const response = await DistributionService.getReleaseStores(releaseId);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.RELEASE_STORES_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_RELEASE_STORES);
    }
  }
);

