/**
 * Remix API Route: Delete Build Artifact
 * DELETE /api/v1/tenants/:tenantId/releases/:releaseId/builds/artifacts/:uploadId
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend contract: DELETE /tenants/:tenantId/releases/:releaseId/builds/artifacts/:uploadId
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

const deleteArtifact: AuthenticatedActionFunction = async ({ params, user }) => {
  const { tenantId, releaseId, uploadId } = params;

  if (!validateRequired(tenantId, 'Tenant ID is required')) {
    return createValidationError('Tenant ID is required');
  }

  if (!validateRequired(releaseId, 'Release ID is required')) {
    return createValidationError('Release ID is required');
  }

  if (!validateRequired(uploadId, 'Upload ID is required')) {
    return createValidationError('Upload ID is required');
  }

  try {
    console.log('[BFF] Deleting build artifact:', { tenantId, releaseId, uploadId });
    const response = await ReleaseProcessService.deleteBuildArtifact(tenantId, releaseId, uploadId);
    console.log('[BFF] Delete artifact response:', response.data);
    
    return json(response.data || { success: true, message: 'Artifact deleted successfully' });
  } catch (error) {
    logApiError('DELETE_BUILD_ARTIFACT_API', error);
    return handleAxiosError(error, 'Failed to delete artifact');
  }
};

export const action = authenticateActionRequest({ DELETE: deleteArtifact });

