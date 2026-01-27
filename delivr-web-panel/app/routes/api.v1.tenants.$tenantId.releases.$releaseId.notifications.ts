/**
 * Remix API Route: Get Release Notifications
 * GET /api/v1/apps/:appId/releases/:releaseId/notifications
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend contract: GET /api/v1/apps/:appId/releases/:releaseId/notifications
 * Matches API contract API #26: Get Release Notifications
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import type { User } from '~/.server/services/Auth/auth.interface';
import { handleAxiosError, logApiError, validateRequired } from '~/utils/api-route-helpers';

/**
 * GET - Get release notifications
 * Calls backend API: GET /notifications
 */
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { appId, releaseId } = params;

    if (!validateRequired(appId, 'app id is required')) {
      return json({ success: false, error: 'app id is required' }, { status: 400 });
    }

    if (!validateRequired(releaseId, 'Release ID is required')) {
      return json({ success: false, error: 'Release ID is required' }, { status: 400 });
    }

    try {
      console.log('[BFF] Fetching notifications for release:', releaseId);
      const response = await ReleaseProcessService.getNotifications(appId, releaseId, user.user.id);
      console.log('[BFF] Notifications response:', response.data);
      
      return json(response.data);
    } catch (error) {
      logApiError('GET_NOTIFICATIONS_API', error);
      return handleAxiosError(error, 'Failed to fetch notifications');
    }
  }
);


