/**
 * Single Release API Route
 * 
 * BFF route that calls the release retrieval service to fetch a single release
 * Follows the same pattern as releases list and release-config routes
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
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

/**
 * PATCH/PUT /api/v1/tenants/:tenantId/releases/:releaseId - Update a release
 * DELETE /api/v1/tenants/:tenantId/releases/:releaseId - Delete a release
 * 
 * BFF route that calls the release retrieval service for update/delete operations
 */
export async function action({ params, request }: ActionFunctionArgs) {
  const { tenantId, releaseId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
  }

  if (!releaseId) {
    return json({ success: false, error: 'Release ID required' }, { status: 400 });
  }

  try {
    const userId = await requireUserId(request);
    const method = request.method;

    // Handle UPDATE (PATCH or PUT)
    if (method === 'PATCH' || method === 'PUT') {
      const updates = await request.json();

      console.log('[BFF] Updating release:', { tenantId, releaseId, updates: Object.keys(updates) });

      const result = await ReleaseRetrievalService.update(releaseId, tenantId, userId, updates);

      if (!result.success) {
        console.error('[BFF] Update failed:', result.error);
        return json(
          { success: false, error: result.error || 'Failed to update release' },
          { status: 400 }
        );
      }

      console.log('[BFF] Update successful:', result.release?.id);
      return json({
        success: true,
        release: result.release,
        message: 'Release updated successfully',
      });
    }

    // Handle DELETE
    if (method === 'DELETE') {
      console.log('[BFF] Deleting release:', { tenantId, releaseId });

      const result = await ReleaseRetrievalService.delete(releaseId, tenantId, userId);

      if (!result.success) {
        console.error('[BFF] Delete failed:', result.error);
        return json(
          { success: false, error: result.error || 'Failed to delete release' },
          { status: 400 }
        );
      }

      console.log('[BFF] Delete successful:', releaseId);
      return json({
        success: true,
        message: 'Release deleted successfully',
      });
    }

    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error('[BFF] Action error:', error);
    return json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

