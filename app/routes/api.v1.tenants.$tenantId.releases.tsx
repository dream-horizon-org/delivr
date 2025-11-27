/**
 * Releases API Route
 * 
 * Forwards release creation requests directly to backend API.
 * No transformation - UI sends backend-compatible format.
 * 
 * This route is kept for backward compatibility but should be deprecated
 * in favor of direct backend calls from the service layer.
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/.server/services/Auth';
import { listReleases, createRelease } from '~/.server/services/ReleaseManagement';
import type { CreateReleaseBackendRequest } from '~/types/release-creation-backend';

/**
 * GET /api/v1/tenants/:tenantId/releases
 * Fetch releases from backend API
 * 
 * BFF route that calls the release retrieval service
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const userId = await requireUserId(request);
    const url = new URL(request.url);
    const includeTasks = url.searchParams.get('includeTasks') === 'true';

    console.log('[BFF] Fetching releases for tenant:', tenantId);

    const result = await listReleases(tenantId, userId, { includeTasks });
    console.log('[BFF] Result:', result);

    if (!result.success) {
      console.error('[BFF] List failed:', result.error);
      return json(
        { success: false, error: result.error || 'Failed to fetch releases' },
        { status: 400 }
      );
    }

    console.log('[BFF] List successful:', result.releases?.length || 0, 'releases');
    return json({
      success: true,
      data: {
        releases: result.releases || [],
      },
    });
  } catch (error: any) {
    console.error('[BFF] List error:', error);
    return json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/tenants/:tenantId/releases
 * Create a new release
 * 
 * BFF route that calls the release-creation service to create releases.
 * Follows the same pattern as release-config and integrations.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const method = request.method;
    const userId = await requireUserId(request);

    // CREATE - Use service layer to call backend
    if (method === 'POST') {
      const backendRequest = (await request.json()) as CreateReleaseBackendRequest;

      console.log('[BFF] Creating release:', {
        tenantId,
        releaseType: backendRequest.type,
        releaseConfigId: backendRequest.releaseConfigId,
      });

      // Call server-side service which calls backend API
      const result = await createRelease(backendRequest, tenantId, userId);

      if (!result.success) {
        console.error('[BFF] Create failed:', result.error);
        return json(
          {
            success: false,
            error: result.error || 'Failed to create release',
          },
          { status: 400 }
        );
      }

      console.log('[BFF] Create successful:', result.release?.id);
      return json(
        {
          success: true,
          release: result.release,
        },
        { status: 201 }
      );
    }

    // UPDATE - TODO: Implement when backend supports it
    if (method === 'PUT') {
      return json(
        { success: false, error: 'Update not implemented yet' },
        { status: 501 }
      );
    }

    // DELETE - TODO: Implement when backend supports it
    if (method === 'DELETE') {
      return json(
        { success: false, error: 'Delete not implemented yet' },
        { status: 501 }
      );
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('[Releases API] Error:', error);
    return json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
