/**
 * Remix API Route: Retry Failed Build
 * POST /api/v1/releases/:releaseId/builds/:buildId/retry
 * 
 * Triggers CI/CD workflow to rebuild after a failed build
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticateActionRequest, AuthenticatedActionFunction } from '~/utils/authenticate';
import { DistributionService } from '~/.server/services/Distribution';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import {
  ERROR_MESSAGES,
  LOG_CONTEXT,
} from '~/constants/distribution/distribution-api.constants';

const retryBuild: AuthenticatedActionFunction = async ({ params, user }) => {
  const { releaseId, buildId } = params;

  if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
  }

  if (!validateRequired(buildId, ERROR_MESSAGES.BUILD_ID_REQUIRED)) {
    return createValidationError(ERROR_MESSAGES.BUILD_ID_REQUIRED);
  }

  try {
    const response = await DistributionService.retryBuild(releaseId, buildId);
    return json(response.data);
  } catch (error) {
    logApiError('[Retry Build API]', error);
    return handleAxiosError(error, 'Failed to retry build');
  }
};

export const action = authenticateActionRequest({ POST: retryBuild });
