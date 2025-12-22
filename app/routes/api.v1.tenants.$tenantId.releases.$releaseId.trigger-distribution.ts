/**
 * Remix API Route: Trigger Distribution (Approve Pre-Release Stage)
 * POST /api/v1/tenants/:tenantId/releases/:releaseId/trigger-distribution
 * 
 * BFF route that calls the ReleaseProcessService to approve pre-release and trigger distribution
 * Backend contract: POST /api/v1/tenants/{tenantId}/releases/{releaseId}/trigger-distribution
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

const triggerDistribution: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { tenantId, releaseId } = params;

  // Validate required path parameters
  if (!validateRequired(tenantId, 'Tenant ID is required')) {
    return createValidationError('Tenant ID is required');
  }

  if (!validateRequired(releaseId, 'Release ID is required')) {
    return createValidationError('Release ID is required');
  }

  try {
    // Parse request body (optional comments and forceApprove)
    const body = await request.json().catch(() => ({})) as { comments?: string; forceApprove?: boolean };
    
    console.log('[BFF] Triggering distribution for release:', releaseId, body);
    const response = await ReleaseProcessService.completePostRegressionStage(
      tenantId, 
      releaseId, 
      user.user.id,
      body
    );
    
    // Axios response structure: response.data contains the actual response body
    console.log('[BFF] Trigger distribution response:', response.data);
    return json(response.data as CompletePreReleaseResponse);
  } catch (error) {
    logApiError('[Trigger Distribution API]', error);
    return handleAxiosError(error, 'Failed to trigger distribution');
  }
};

export const action = authenticateActionRequest({ POST: triggerDistribution });

