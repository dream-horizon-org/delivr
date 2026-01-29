/**
 * Single Release API Route
 * 
 * BFF route that calls the release retrieval service to fetch a single release
 * Follows the same pattern as releases list and release-config routes
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { authenticateLoaderRequest, authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/auth.interface';
import { getReleaseById, updateRelease } from '~/.server/services/ReleaseManagement';
import { logApiError } from '~/utils/api-route-helpers';

/**
 * GET /api/v1/apps/:appId/releases/:releaseId
 * Fetch a single release by ID from backend API
 * 
 * BFF route that calls the release retrieval service
 */
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const appId = params.appId;
    const releaseId = params.releaseId;

    if (!appId) {
      return json({ success: false, error: 'app id required' }, { status: 400 });
    }

    if (!releaseId) {
      return json({ success: false, error: 'Release ID required' }, { status: 400 });
    }

    try {
      const userId = user.user.id;

    console.log('[BFF] Fetching release:', { appId, releaseId });

    const result = await getReleaseById(releaseId, appId, userId);

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
    logApiError('[BFF-Release-Get]', error);
    return json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
  }
);

/**
 * PATCH/PUT /api/v1/apps/:appId/releases/:releaseId - Update a release
 * 
 * BFF route that calls the release retrieval service for update operations
 */
export const action = authenticateActionRequest({
  PUT: async ({ params, request, user }: ActionFunctionArgs & { user: User }) => {
    const appId = params.appId;
    const releaseId = params.releaseId;

    if (!appId) {
      return json({ success: false, error: 'app id required' }, { status: 400 });
    }

    if (!releaseId) {
      return json({ success: false, error: 'Release ID required' }, { status: 400 });
    }

    try {
      const userId = user.user.id;
      const updates = await request.json();

      console.log('[BFF] Updating release:', { appId, releaseId, updates: Object.keys(updates) });

      const result = await updateRelease(releaseId, appId, userId, updates);

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
    } catch (error: any) {
      logApiError('[BFF-Release-Update-PUT]', error);
      return json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  },
  PATCH: async ({ params, request, user }: ActionFunctionArgs & { user: User }) => {
    const appId = params.appId;
    const releaseId = params.releaseId;

    if (!appId) {
      return json({ success: false, error: 'app id required' }, { status: 400 });
    }

    if (!releaseId) {
      return json({ success: false, error: 'Release ID required' }, { status: 400 });
    }

    try {
      const userId = user.user.id;
      const updates = await request.json();

      console.log('[BFF] Updating release:', { appId, releaseId, updates: Object.keys(updates) });

      const result = await updateRelease(releaseId, appId, userId, updates);

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
    } catch (error: any) {
      logApiError('[BFF-Release-Update-PATCH]', error);
      return json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  },
});

