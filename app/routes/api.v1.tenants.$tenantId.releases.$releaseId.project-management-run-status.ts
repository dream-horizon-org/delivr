/**
 * Remix API Route: Get Project Management Status
 * GET /api/v1/tenants/:tenantId/releases/:releaseId/project-management-run-status
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend contract: GET /tenants/:tenantId/releases/:releaseId/project-management-run-status
 * Matches API contract API #24: Get Project Management Status
 */

import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { ReleaseProcessService } from '~/.server/services/ReleaseProcess';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { handleAxiosError, logApiError, validateRequired } from '~/utils/api-route-helpers';
import { Platform } from '~/types/release-process-enums';

/**
 * GET - Get project management status
 * Calls backend API: GET /project-management-run-status
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
      // Extract query parameters
      const url = new URL(request.url);
      const platform = url.searchParams.get('platform') || undefined;

      console.log('[BFF] Fetching project management status for release:', releaseId, { platform });
      const response = await ReleaseProcessService.getProjectManagementStatus(
        tenantId,
        releaseId,
        user.user.id,
        platform as Platform | undefined
      );
      console.log('[BFF] Project management status response:', response.data);
      
      return json(response.data);
    } catch (error) {
      logApiError('PROJECT_MANAGEMENT_STATUS_API', error);
      return handleAxiosError(error, 'Failed to fetch project management status');
    }
  }
);


