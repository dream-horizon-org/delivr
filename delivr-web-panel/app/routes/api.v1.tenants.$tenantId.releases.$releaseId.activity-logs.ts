/**
 * Activity Logs API Route
 * 
 * BFF route that returns activity logs for a release
 * Calls backend API: GET /api/v1/tenants/:tenantId/releases/:releaseId/activity-logs
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/auth.interface';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import { getApiErrorMessage } from '~/utils/api-client';
import type { ActivityLogsResponse } from '~/types/release-process.types';
import { logApiError } from '~/utils/api-route-helpers';

/**
 * GET /api/v1/tenants/:tenantId/releases/:releaseId/activity-logs
 * Fetch activity logs for a release
 * 
 * Backend endpoint: GET /api/v1/tenants/:tenantId/releases/:releaseId/activity-logs
 */
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { tenantId, releaseId } = params;

    if (!tenantId) {
      return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
    }

    if (!releaseId) {
      return json({ success: false, error: 'Release ID required' }, { status: 400 });
    }

    try {
      console.log('[BFF] Fetching activity logs:', { tenantId, releaseId });

      const response = await ReleaseProcessService.getActivityLogs(
        tenantId,
        releaseId,
        user.user.id
      );

      const backendResponse = response.data;

      // Backend returns: { success: boolean; data: ActivityLog[] }
      // Transform to: { success: true; releaseId: string; activityLogs: ActivityLog[] }
      if (backendResponse && 'data' in backendResponse && Array.isArray(backendResponse.data)) {
        const transformedResponse: ActivityLogsResponse = {
          success: true,
          releaseId: releaseId,
          activityLogs: backendResponse.data,
        };
        console.log('[BFF] Activity logs fetched successfully:', transformedResponse.activityLogs.length);
        return json(transformedResponse);
      }

      // If backend already returns activityLogs format, use it directly
      if (backendResponse && 'activityLogs' in backendResponse) {
        console.log('[BFF] Activity logs fetched successfully:', backendResponse.activityLogs?.length || 0);
        return json(backendResponse);
      }

      // Fallback: empty response
      console.warn('[BFF] Unexpected backend response format:', backendResponse);
      return json({
        success: true,
        releaseId: releaseId,
        activityLogs: [],
      });
    } catch (error: any) {
      logApiError('[BFF-ActivityLogs]', error);
      const errorMessage = getApiErrorMessage(error, 'Failed to fetch activity logs');
      return json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  }
);

