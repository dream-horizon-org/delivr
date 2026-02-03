/**
 * BFF API Route: Configure platform targets for an app
 * PUT /api/v1/apps/:appId/platform-targets
 *
 * Proxies to backend PUT /apps/:appId/platform-targets.
 * Used by onboarding flow when saving platform targets.
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { CodepushService } from '~/.server/services/Codepush';
import { authenticateActionRequest } from '~/utils/authenticate';
import { logApiError } from '~/utils/api-route-helpers';

async function putPlatformTargetsAction({
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
    const body = (await request.json()) as { platformTargets?: Array<{ platform: string; target: string }> };
    const platformTargets = body?.platformTargets;
    if (!platformTargets || !Array.isArray(platformTargets)) {
      return json(
        { error: 'platformTargets must be an array' },
        { status: 400 }
      );
    }
    const response = await CodepushService.putPlatformTargets({
      userId: user.user.id,
      appId,
      platformTargets,
    });
    const payload = response.data as Record<string, unknown> | null | undefined;
    const data = (payload?.data ?? payload) as Record<string, unknown> | undefined;
    const result = data?.platformTargets ?? platformTargets;
    return json(
      { success: true, platformTargets: result },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    logApiError('[BFF-PlatformTargets-PUT]', error);
    return json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to configure platform targets',
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
}

export const action = authenticateActionRequest({ PUT: putPlatformTargetsAction });
