/**
 * BFF API Route: List/Create releases for an app
 * GET  /api/v1/apps/:appId/releases
 * POST /api/v1/apps/:appId/releases
 *
 * Same behaviour as /api/v1/apps/:tenantId/releases for app-centric URLs.
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import {
  authenticateLoaderRequest,
  authenticateActionRequest,
} from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/auth.interface';
import { listReleases, createRelease } from '~/.server/services/ReleaseManagement';
import type { CreateReleaseBackendRequest } from '~/types/release-creation-backend';
import { logApiError } from '~/utils/api-route-helpers';

export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const appId = params.appId;

    if (!appId) {
      return json({ success: false, error: 'App id required' }, { status: 400 });
    }

    try {
      const userId = user.user.id;
      const url = new URL(request.url);
      const includeTasks = url.searchParams.get('includeTasks') === 'true';

      const result = await listReleases(appId, userId, { includeTasks });

      if (!result.success) {
        return json(
          { success: false, error: result.error || 'Failed to fetch releases' },
          { status: 400 }
        );
      }

      return json({
        success: true,
        data: { releases: result.releases ?? [] },
      });
    } catch (error: unknown) {
      logApiError('[BFF-AppReleases-List]', error);
      return json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 }
      );
    }
  }
);

export const action = authenticateActionRequest({
  POST: async ({ request, params, user }: ActionFunctionArgs & { user: User }) => {
    const appId = params.appId;

    if (!appId) {
      return json({ success: false, error: 'App id required' }, { status: 400 });
    }

    try {
      const userId = user.user.id;
      const backendRequest = (await request.json()) as CreateReleaseBackendRequest;

      const result = await createRelease(backendRequest, appId, userId);

      if (!result.success) {
        return json(
          { success: false, error: result.error ?? 'Failed to create release' },
          { status: 400 }
        );
      }

      return json(
        { success: true, release: result.release },
        { status: 201 }
      );
    } catch (error: unknown) {
      logApiError('[BFF-AppReleases-Create]', error);
      return json(
        {
          success: false,
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
});
