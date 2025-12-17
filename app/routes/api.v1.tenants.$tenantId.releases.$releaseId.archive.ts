/**
 * Remix API Route: Archive Release
 * PUT /api/v1/tenants/:tenantId/releases/:releaseId/archive
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend implementation: PUT /api/v1/tenants/:tenantId/releases/:releaseId/archive
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

/**
 * PUT - Archive release
 * No request body required
 * Calls backend API: PUT /api/v1/tenants/:tenantId/releases/:releaseId/archive
 */
const archiveRelease: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { tenantId, releaseId } = params;

  if (!validateRequired(tenantId, 'Tenant ID is required')) {
    return createValidationError('Tenant ID is required');
  }

  if (!validateRequired(releaseId, 'Release ID is required')) {
    return createValidationError('Release ID is required');
  }

  // Only allow PUT method
  if (request.method !== 'PUT') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    console.log(`[BFF] Archiving release:`, releaseId);
    
    const response = await ReleaseProcessService.archiveRelease(tenantId, releaseId, user.user.id);
    
    console.log(`[BFF] Archive release response:`, response.data);
    
    return json(response.data);
  } catch (error) {
    logApiError('ARCHIVE_RELEASE_API', error);
    return handleAxiosError(error, 'Failed to archive release');
  }
};

export const action = authenticateActionRequest({ PUT: archiveRelease });

