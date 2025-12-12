/**
 * Remix API Route: Post-Regression Stage
 * GET /api/v1/tenants/:tenantId/releases/:releaseId/stages/post-regression
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend contract: GET /api/v1/tenants/:tenantId/releases/:releaseId/tasks?stage=POST_REGRESSION
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import {
  authenticateLoaderRequest,
} from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import type { User } from '~/.server/services/Auth/Auth.interface';
import {
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';

/**
 * GET - Get post-regression stage data
 * Calls backend API: GET /tasks?stage=POST_REGRESSION
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
      console.log('[BFF] Fetching post-regression stage for release:', releaseId);
      const response = await ReleaseProcessService.getPostRegressionStage(tenantId, releaseId);
      console.log('[BFF] Post-regression stage response:', response.data);
      
      // Backend returns { success: true, stage: 'POST_REGRESSION', releaseId, tasks, stageStatus }
      // Axios wraps it in response.data, so response.data = { success: true, ... }
      const responseData = response.data;
      
      // Return data wrapped in success envelope for consistency
      return json({ success: true, data: responseData });
    } catch (error) {
      logApiError('POST_REGRESSION_STAGE_API', error);
      return handleAxiosError(error, 'Failed to fetch post-regression stage');
    }
  }
);

