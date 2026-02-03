/**
 * BFF API Route: Get App by ID
 * GET /api/v1/apps/:appId
 *
 * Serves the same data as /api/v1/apps/:tenantId for app-centric URLs.
 * Dashboard and useAppConfig call this endpoint.
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { CodepushService } from '~/.server/services/Codepush';
import { AppDistributionService } from '~/.server/services/ReleaseManagement/integrations';
import {
  authenticateLoaderRequest,
  authenticateActionRequest,
  type AuthenticatedLoaderFunction,
} from '~/utils/authenticate';
import { logApiError } from '~/utils/api-route-helpers';

const getAppInfo: AuthenticatedLoaderFunction = async ({ params, user }) => {
  const appId = params.appId;

  if (!appId) {
    return json({ error: 'App id required' }, { status: 400 });
  }

  if (!user?.user?.id) {
    console.error('[BFF-AppInfo] Invalid user object:', user);
    return json({ error: 'User not authenticated' }, { status: 401 });
  }

  try {
    const response = await CodepushService.getAppInfo({
      userId: user.user.id,
      appId,
    });

    // Backend returns new shape: app, platformTargets, integrations, allowedReleaseTypes, setupStatus
    const body = response.data as Record<string, unknown> | null | undefined;
    const payload = (body?.data ?? body) as Record<string, unknown> ?? {};
    const rawApp = payload.app ?? payload.organisation;

    const platformTargets = (payload.platformTargets as Array<{ platform: string; target: string }>) ?? [];
    const integrations = (payload.integrations as Record<string, unknown>) ?? {};
    const allowedReleaseTypes = (payload.allowedReleaseTypes as string[]) ?? [];
    const setupStatus = (payload.setupStatus as Record<string, unknown> | null) ?? null;

    const appCore =
      rawApp && typeof rawApp === 'object'
        ? {
            id: (rawApp as { id?: string }).id,
            name: (rawApp as { name?: string }).name,
            displayName: (rawApp as { displayName?: string }).displayName,
            organizationId: (rawApp as { organizationId?: string | null }).organizationId,
            description: (rawApp as { description?: string }).description,
            isActive: (rawApp as { isActive?: boolean }).isActive,
            createdBy: (rawApp as { createdBy?: string }).createdBy,
            createdAt: (rawApp as { createdAt?: string }).createdAt,
            updatedAt: (rawApp as { updatedAt?: string }).updatedAt,
          }
        : null;

    const distributionsResponse = await AppDistributionService.listIntegrations(
      appId,
      user.user.id
    );
    const distributions =
      distributionsResponse.success && distributionsResponse.data
        ? [
            ...(distributionsResponse.data.IOS || []),
            ...(distributionsResponse.data.ANDROID || []),
          ]
        : [];

    const enrichedData = {
      app: appCore,
      organisation: appCore,
      platformTargets,
      integrations,
      allowedReleaseTypes,
      setupStatus,
      appDistributions: distributions,
    };

    return json(
      { success: true, data: enrichedData },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    logApiError('[BFF-AppInfo]', error);
    return json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch app info',
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
};

export const loader = authenticateLoaderRequest(getAppInfo);

async function updateAppAction({
  request,
  params,
  user,
}: ActionFunctionArgs & { user: { user: { id: string } } }) {
  if (request.method !== 'PUT') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  const appId = params.appId;
  if (!appId) {
    return json({ error: 'App id required' }, { status: 400 });
  }
  if (!user?.user?.id) {
    return json({ error: 'User not authenticated' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      displayName?: string;
      name?: string;
      description?: string;
    };
    const response = await CodepushService.updateApp({
      userId: user.user.id,
      appId,
      body: {
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
      },
    });
    const payload = response.data as Record<string, unknown> | null | undefined;
    const data = (payload?.data ?? payload) as Record<string, unknown> | undefined;
    const app = data?.app ?? data?.organisation;
    return json(
      { success: true, data: { app, organisation: app } },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    logApiError('[BFF-AppInfo-PUT]', error);
    return json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update app',
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
}

export const action = authenticateActionRequest({ PUT: updateAppAction });
