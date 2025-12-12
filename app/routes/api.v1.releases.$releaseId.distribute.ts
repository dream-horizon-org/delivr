/**
 * Remix API Route: Submit to Stores (Main Distribution Entry Point)
 * POST /api/v1/releases/:releaseId/distribute - Submit release builds to Play Store and/or App Store
 * GET  /api/v1/releases/:releaseId/distribute - Get distribution status for release
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import {
  ERROR_MESSAGES,
  LOG_CONTEXT,
} from '~/constants/distribution-api.constants';
import { Platform } from '~/types/distribution.types';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import {
  authenticateActionRequest,
  AuthenticatedActionFunction,
  authenticateLoaderRequest,
} from '~/utils/authenticate';

/**
 * GET - Get distribution status for a release
 */
export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { releaseId } = params;

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }

    try {
      const response = await DistributionService.getDistributionStatus(releaseId);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.DISTRIBUTION_STATUS_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_DISTRIBUTION_STATUS);
    }
  }
);

/**
 * Validate platforms array
 */
function validatePlatforms(platforms: unknown): platforms is Platform[] {
  return (
    Array.isArray(platforms) &&
    platforms.length > 0 &&
    platforms.every((p) => p === Platform.ANDROID || p === Platform.IOS)
  );
}

/**
 * POST - Submit release builds to stores
 */
const submitToStores: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { releaseId } = params;

  if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
  }

  try {
    const body = await request.json();
    const { platforms, android, ios } = body;

    if (!validatePlatforms(platforms)) {
      return createValidationError(ERROR_MESSAGES.PLATFORMS_REQUIRED);
    }

    const requestData = {
      releaseId,
      platforms: platforms as Platform[],
      android,
      ios,
    };

    const response = await DistributionService.submitToStores(releaseId, requestData);

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.SUBMIT_TO_STORES_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_SUBMIT_TO_STORES);
  }
};

export const action = authenticateActionRequest({ POST: submitToStores });
