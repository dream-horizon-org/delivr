/**
 * BFF API Route: Get App by ID
 * GET /api/v1/apps/:appId
 *
 * Serves the same data as /api/v1/tenants/:tenantId for app-centric URLs.
 * Dashboard and useTenantConfig call this endpoint.
 */

import { json } from '@remix-run/node';
import { CodepushService } from '~/.server/services/Codepush';
import { AppDistributionService } from '~/.server/services/ReleaseManagement/integrations';
import {
  authenticateLoaderRequest,
  type AuthenticatedLoaderFunction,
} from '~/utils/authenticate';
import { logApiError } from '~/utils/api-route-helpers';

const getAppInfo: AuthenticatedLoaderFunction = async ({ params, user }) => {
  const appId = params.app;

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

    // Unwrap backend payload: backend returns { success, data: { app? | organisation? } }
    const body = response.data as Record<string, unknown> | null | undefined;
    const payload = (body?.data ?? body) as Record<string, unknown> ?? {};
    const appOrOrg = payload.app ?? payload.organisation;

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
      ...payload,
      app: appOrOrg,
      organisation: appOrOrg,
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
