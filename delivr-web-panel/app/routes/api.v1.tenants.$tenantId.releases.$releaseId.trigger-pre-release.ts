/**
 * Remix API Route: Approve Regression Stage (Trigger Pre-Release)
 * POST /api/v1/apps/:appId/releases/:releaseId/trigger-pre-release
 * 
 * BFF route that calls the ReleaseProcessService to approve regression stage and trigger pre-release
 * Backend contract: POST /api/v1/tenants/{appId}/releases/{releaseId}/trigger-pre-release
 * Matches backend contract API #11
 */

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import {
  authenticateActionRequest,
  type AuthenticatedActionFunction,
} from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import type { ApproveRegressionStageRequest, ApproveRegressionStageResponse } from '~/types/release-process.types';

const approveRegressionStage: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { appId, releaseId } = params;

  // Validate required path parameters
  if (!validateRequired(appId, 'app id is required')) {
    return createValidationError('app id is required');
  }

  if (!validateRequired(releaseId, 'Release ID is required')) {
    return createValidationError('Release ID is required');
  }

  try {
    // Parse request body
    const body = await request.json() as ApproveRegressionStageRequest;

    console.log('[BFF] Approving regression stage for release:', releaseId, body);
    const response = await ReleaseProcessService.approveRegressionStage(appId, releaseId, body, user.user.id);
    
    // Axios response structure: response.data contains the actual response body
    console.log('[BFF] Regression stage approval response:', response.data);
    return json(response.data as ApproveRegressionStageResponse);
  } catch (error) {
    logApiError('[Approve Regression Stage API]', error);
    return handleAxiosError(error, 'Failed to approve regression stage');
  }
};

export const action = authenticateActionRequest({ POST: approveRegressionStage });

