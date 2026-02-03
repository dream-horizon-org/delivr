/**
 * Remix API Route: Check Cherry Pick Status
 * GET /api/v1/apps/:appId/releases/:releaseId/check-cherry-pick-status
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend contract: GET /api/v1/apps/:appId/releases/:releaseId/check-cherry-pick-status
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
 * GET - Get cherry pick status
 * Calls backend API: GET /check-cherry-pick-status
 */
export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }) => {
    const { appId, releaseId } = params;

    if (!validateRequired(appId, 'app id is required')) {
      return json({ success: false, error: 'app id is required' }, { status: 400 });
    }

    if (!validateRequired(releaseId, 'Release ID is required')) {
      return json({ success: false, error: 'Release ID is required' }, { status: 400 });
    }

    try {
      console.log('[BFF] Fetching cherry pick status for release:', releaseId);
      const response = await ReleaseProcessService.getCherryPickStatus(appId, releaseId, user.user.id);
      console.log('[BFF] Cherry pick status response:', response.data);
      
      // Backend returns { success: true, releaseId, latestReleaseTag, commitIdsMatch }
      // Axios wraps it in response.data, so response.data = { success: true, ... }
      const responseData = response.data;
      
      // Return data wrapped in success envelope for consistency
      return json({ success: true, data: responseData });
    } catch (error) {
      logApiError('CHERRY_PICK_STATUS_API', error);
      return handleAxiosError(error, 'Failed to fetch cherry pick status');
    }
  }
);


