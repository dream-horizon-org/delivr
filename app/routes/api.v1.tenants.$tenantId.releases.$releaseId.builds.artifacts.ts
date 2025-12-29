/**
 * Remix API Route: List Build Artifacts
 * GET /api/v1/tenants/:tenantId/releases/:releaseId/builds/artifacts
 * 
 * BFF route that proxies to ReleaseProcessService
 * Backend contract: GET /tenants/:tenantId/releases/:releaseId/builds/artifacts
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
import type { ListBuildArtifactsResponse } from '~/types/release-process.types';

/**
 * GET - List build artifacts
 * Calls backend API: GET /builds/artifacts
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
      const buildStage = url.searchParams.get('buildStage') || undefined;

      console.log('[BFF] Fetching build artifacts for release:', releaseId, { platform, buildStage });
      const response = await ReleaseProcessService.listBuildArtifacts(tenantId, releaseId, user.user.id, {
        platform: platform as any,
        buildStage,
      });
      console.log('[BFF] Build artifacts response:', response.data);
      
      // Backend returns { success: true, data: [...] }
      // Axios wraps it in response.data, so response.data = { success: true, data: [...] }
      // apiGet expects { success: true, data: T }, so we return response.data as-is
      // This avoids double-wrapping
      const backendResponse = response.data as ListBuildArtifactsResponse;
      
      // Verify the structure
      if (!backendResponse || typeof backendResponse !== 'object') {
        console.error('[BFF] Invalid response structure:', backendResponse);
        return json({ success: false, error: 'Invalid response from backend' }, { status: 500 });
      }
      
      // Return backend response as-is (it already has { success: true, data: [...] })
      return json(backendResponse);
    } catch (error) {
      logApiError('LIST_BUILD_ARTIFACTS_API', error);
      return handleAxiosError(error, 'Failed to fetch build artifacts');
    }
  }
);

