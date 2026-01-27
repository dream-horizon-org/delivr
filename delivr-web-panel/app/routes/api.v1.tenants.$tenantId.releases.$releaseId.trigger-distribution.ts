/**
 * Remix API Route: Trigger Distribution (Approve Pre-Release Stage)
 * POST /api/v1/apps/:appId/releases/:releaseId/trigger-distribution
 * 
 * BFF route that calls the ReleaseProcessService to approve pre-release and trigger distribution
 * Backend contract: POST /api/v1/tenants/{appId}/releases/{releaseId}/trigger-distribution
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
import type { TriggerDistributionResponse } from '~/types/release-process.types';

const triggerDistribution: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { appId, releaseId } = params;

  if (!validateRequired(appId, 'app id is required')) {
    return createValidationError('app id is required');
  }

  if (!validateRequired(releaseId, 'Release ID is required')) {
    return createValidationError('Release ID is required');
  }

  try {
    // Parse request body (optional comments and forceApprove)
    const body = await request.json().catch(() => ({})) as { comments?: string; forceApprove?: boolean };
    
    console.log('[BFF] Triggering distribution for release:', releaseId, body);
    const response = await ReleaseProcessService.triggerDistributionStage(
      appId, 
      releaseId, 
      user.user.id,
      body
    );
    
    console.log('[BFF] Trigger distribution response:', response.data);
    return json(response.data as TriggerDistributionResponse);
  } catch (error) {
    logApiError('[Trigger Distribution API]', error);
    return handleAxiosError(error, 'Failed to trigger distribution');
  }
};

export const action = authenticateActionRequest({ POST: triggerDistribution });

