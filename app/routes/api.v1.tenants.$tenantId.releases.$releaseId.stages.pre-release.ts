/**
 * Remix API Route: Pre-Release Stage
 * GET /api/v1/tenants/:tenantId/releases/:releaseId/stages/pre-release
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend contract: GET /api/v1/tenants/:tenantId/releases/:releaseId/tasks?stage=PRE_RELEASE
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import {
  authenticateLoaderRequest,
} from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import type { User } from '~/.server/services/Auth/auth.interface';
import {
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';

/**
 * GET - Get pre-release stage data
 * Calls backend API: GET /tasks?stage=PRE_RELEASE
 */
export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { tenantId, releaseId } = params;

    if (!validateRequired(tenantId, 'Tenant ID is required')) {
      return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
    }

    if (!validateRequired(releaseId, 'Release ID is required')) {
      return json({ success: false, error: 'Release ID is required' }, { status: 400 });
    }

    try {
      console.log('[BFF] Fetching pre-release stage for release:', releaseId);
      const response = await ReleaseProcessService.getPreReleaseStage(tenantId, releaseId, user.user.id);
      console.log('[BFF] Pre-release stage response:', response.data);
      
      // Backend returns { success: true, stage: 'PRE_RELEASE', releaseId, tasks, stageStatus }
      // Axios wraps it in response.data, so response.data = { success: true, ... }
      const responseData = response.data;
      
      // Return data wrapped in success envelope for consistency
      return json({ success: true, data: responseData });
    } catch (error) {
      logApiError('PRE_RELEASE_STAGE_API', error);
      return handleAxiosError(error, 'Failed to fetch pre-release stage');
    }
  }
);

