/**
 * Remix API Route: Trigger Distribution (Complete Post-Regression Stage)
 * POST /api/v1/tenants/:tenantId/releases/:releaseId/trigger-distribution
 * 
 * BFF route that calls the ReleaseProcessService to complete post-regression stage and trigger distribution
 * Backend contract: POST /api/v1/tenants/{tenantId}/releases/{releaseId}/trigger-distribution
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
import type { CompletePreReleaseRequest, CompletePreReleaseResponse } from '~/types/release-process.types';

const triggerDistribution: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { tenantId, releaseId } = params;

  if (!validateRequired(tenantId, 'Tenant ID is required')) {
    return createValidationError('Tenant ID is required');
  }

  if (!validateRequired(releaseId, 'Release ID is required')) {
    return createValidationError('Release ID is required');
  }

  try {
    let body: Partial<CompletePreReleaseRequest> = {};
    try {
      body = await request.json() as Partial<CompletePreReleaseRequest>;
    } catch {
      body = {};
    }
    
    const requestBody: CompletePreReleaseRequest = {
      approvedBy: user.user.id,
      notes: body.notes,
    };

    console.log('[BFF] Triggering distribution for release:', releaseId, requestBody);
    const response = await ReleaseProcessService.completePostRegressionStage(tenantId, releaseId, requestBody, user.user.id);
    
    console.log('[BFF] Trigger distribution response:', response.data);
    return json(response.data as CompletePreReleaseResponse);
  } catch (error) {
    logApiError('[Trigger Distribution API]', error);
    return handleAxiosError(error, 'Failed to trigger distribution');
  }
};

export const action = authenticateActionRequest({ POST: triggerDistribution });

