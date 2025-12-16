/**
 * Remix API Route: Complete Pre-Release Stage
 * POST /api/v1/tenants/:tenantId/releases/:releaseId/stages/pre-release/complete
 * 
 * BFF route that calls the ReleaseProcessService to complete the pre-release stage
 * Backend contract: POST /api/v1/tenants/{tenantId}/releases/{releaseId}/stages/pre-release/complete
 * Matches backend contract API #12
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
import type { CompletePreReleaseResponse } from '~/types/release-process.types';

const completePreReleaseStage: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { tenantId, releaseId } = params;

  // Validate required path parameters
  if (!validateRequired(tenantId, 'Tenant ID is required')) {
    return createValidationError('Tenant ID is required');
  }

  if (!validateRequired(releaseId, 'Release ID is required')) {
    return createValidationError('Release ID is required');
  }

  try {
    console.log('[BFF] Completing pre-release stage for release:', releaseId);
    const response = await ReleaseProcessService.completePostRegressionStage(tenantId, releaseId);
    
    // Axios response structure: response.data contains the actual response body
    console.log('[BFF] Pre-release stage completion response:', response.data);
    return json(response.data as CompletePreReleaseResponse);
  } catch (error) {
    logApiError('[Complete Pre-Release Stage API]', error);
    return handleAxiosError(error, 'Failed to complete pre-release stage');
  }
};

export const action = authenticateActionRequest({ POST: completePreReleaseStage });

