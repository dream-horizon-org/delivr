/**
 * API Route: Get Pre-Release Build Details
 * GET /api/v1/releases/:releaseId/builds/:buildId
 * 
 * Returns details for a single pre-release build (PRODUCTION/TESTFLIGHT type only)
 * Includes internal testing links (Android) and TestFlight links (iOS)
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import { ERROR_MESSAGES, LOG_CONTEXT } from '~/constants/distribution/distribution-api.constants';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import { authenticateLoaderRequest } from '~/utils/authenticate';

export const loader = authenticateLoaderRequest(
  async ({ params }: LoaderFunctionArgs & { user: User }) => {
    const { releaseId, buildId } = params;

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }
    if (!validateRequired(buildId, ERROR_MESSAGES.BUILD_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.BUILD_ID_REQUIRED);
    }

    try {
      const response = await DistributionService.getBuild(releaseId, buildId);
      return json(response.data);
    } catch (error) {
      logApiError(LOG_CONTEXT.BUILD_DETAILS_API, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_BUILD_DETAILS);
    }
  }
);

