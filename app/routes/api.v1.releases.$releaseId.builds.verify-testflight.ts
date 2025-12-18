/**
 * Remix API Route: Verify iOS TestFlight Build
 * POST /api/v1/releases/:releaseId/builds/verify-testflight - Verify TestFlight build exists
 */

import { json } from '@remix-run/node';
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
import { authenticateActionRequest, AuthenticatedActionFunction } from '~/utils/authenticate';

const verifyTestFlight: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { releaseId } = params;

  if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
  }

  try {
    const body = await request.json();
    const { testflightNumber, versionName } = body;

    if (!testflightNumber) {
      return createValidationError(ERROR_MESSAGES.TESTFLIGHT_BUILD_NUMBER_REQUIRED);
    }

    if (!versionName) {
      return createValidationError(ERROR_MESSAGES.VERSION_NAME_REQUIRED);
    }

    const requestData = {
      releaseId,
      testflightNumber,
      versionName,
    };

    const response = await DistributionService.verifyTestFlight(
      releaseId,
      requestData
    );

    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.VERIFY_TESTFLIGHT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_VERIFY_TESTFLIGHT);
  }
};

export const action = authenticateActionRequest({ POST: verifyTestFlight });
