/**
 * Remix API Route: Get Activity Logs
 * GET /api/v1/tenants/:tenantId/releases/:releaseId/activity-logs
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend contract: GET /api/v1/tenants/:tenantId/releases/:releaseId/activity-logs
 * Matches API contract API #30: Fetch Activity Log
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { handleAxiosError, logApiError, validateRequired } from '~/utils/api-route-helpers';

/**
 * GET - Get activity logs
 * Calls backend API: GET /activity-logs
 */
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { tenantId, releaseId } = params;

    if (!validateRequired(tenantId, 'Tenant ID is required')) {
      return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
    }

    if (!validateRequired(releaseId, 'Release ID is required')) {
      return json({ success: false, error: 'Release ID is required' }, { status: 400 });
    }

    try {
      // Extract query parameters (optional)
      const url = new URL(request.url);
      const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined;
      const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : undefined;
      const stage = url.searchParams.get('stage') || undefined;
      const taskType = url.searchParams.get('taskType') || undefined;

      console.log('[BFF] Fetching activity logs for release:', releaseId, { limit, offset, stage, taskType });
      const response = await ReleaseProcessService.getActivityLogs(tenantId, releaseId);
      console.log('[BFF] Activity logs response:', response.data);
      
      return json(response.data);
    } catch (error) {
      logApiError('GET_ACTIVITY_LOGS_API', error);
      return handleAxiosError(error, 'Failed to fetch activity logs');
    }
  }
);

