/**
 * Remix API Route: Test Management Run Status
 * GET /api/v1/apps/:appId/releases/:releaseId/test-management-run-status
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend contract: GET /api/v1/apps/:appId/releases/:releaseId/test-management-run-status?platform={platform}
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
import { Platform } from '~/types/release-process-enums';

/**
 * GET - Get test management run status
 * Calls backend API: GET /test-management-run-status?platform={platform}
 */
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const appId = params.appId;
    const releaseId = params.releaseId;

    if (!validateRequired(appId, 'app id is required')) {
      return json({ success: false, error: 'app id is required' }, { status: 400 });
    }

    if (!validateRequired(releaseId, 'Release ID is required')) {
      return json({ success: false, error: 'Release ID is required' }, { status: 400 });
    }

    // Extract platform query parameter if provided
    const url = new URL(request.url);
    const platformParam = url.searchParams.get('platform');
    const platform = platformParam && Object.values(Platform).includes(platformParam as Platform)
      ? (platformParam as Platform)
      : undefined;

    try {
      console.log('[BFF] Fetching test management status for release:', releaseId, platform ? `platform: ${platform}` : 'all platforms');
      const response = await ReleaseProcessService.getTestManagementStatus(appId, releaseId, user.user.id, platform);
      console.log('[BFF] Test management status response:', response.data);
      
      // Backend returns { success: true, ... } (single platform or all platforms)
      // Axios wraps it in response.data, so response.data = { success: true, ... }
      const responseData = response.data;
      
      // Return data wrapped in success envelope for consistency
      return json({ success: true, data: responseData });
    } catch (error) {
      logApiError('TEST_MANAGEMENT_STATUS_API', error);
      return handleAxiosError(error, 'Failed to fetch test management status');
    }
  }
);


