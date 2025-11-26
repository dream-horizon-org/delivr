/**
 * Single Release API Route
 * 
 * BFF route that calls the release retrieval service to fetch a single release
 * Follows the same pattern as releases list and release-config routes
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/.server/services/Auth';
import { ReleaseRetrievalService } from '~/.server/services/ReleaseManagement/release-retrieval.service';

/**
 * GET /api/v1/tenants/:tenantId/releases/:releaseId
 * Fetch a single release by ID from backend API
 * 
 * BFF route that calls the release retrieval service
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const { tenantId, releaseId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
  }

  if (!releaseId) {
    return json({ success: false, error: 'Release ID required' }, { status: 400 });
  }

  try {
    const userId = await requireUserId(request);

    console.log('[BFF] Fetching release:', { tenantId, releaseId });

    const result = await ReleaseRetrievalService.getById(releaseId, tenantId, userId);

    if (!result.success) {
      console.error('[BFF] Get failed:', result.error);
      return json(
        { success: false, error: result.error || 'Release not found' },
        { status: 404 }
      );
    }

    console.log('[BFF] Get successful:', result.release?.id);
    return json({
      success: true,
      data: {
        release: result.release,
      },
    });
  } catch (error: any) {
    console.error('[BFF] Get error:', error);
    return json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

