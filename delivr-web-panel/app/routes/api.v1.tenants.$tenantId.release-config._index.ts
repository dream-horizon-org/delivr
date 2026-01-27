/**
 * BFF Route: Create & List Release Configurations
 * POST   /api/v1/apps/:appId/release-config  - Create new config
 * GET    /api/v1/apps/:appId/release-config  - List all configs
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/.server/services/Auth';
import { ReleaseConfigService } from '~/.server/services/ReleaseConfig';
import type { ReleaseConfiguration } from '~/types/release-config';
import { logApiError } from '~/utils/api-route-helpers';

/**
 * POST - Create release configuration
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { appId } = params;
  console.log('[BFF] action:', request, params, userId, appId); 

  if (!appId) {
    return json({ success: false, error: 'app id is required' }, { status: 400 });
  }

  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const config: ReleaseConfiguration = await request.json();

    console.log('[BFF] Creating release config:', {
      appId,
      name: config.name,
      releaseType: config.releaseType,
      platformTargets: config.platformTargets?.length || 0,
    });

    // Pass frontend format directly to service - transformation happens in service layer
    const result = await ReleaseConfigService.create(config, appId, userId);

    if (!result.success) {
      console.error('[BFF] Create failed:', result.error);
      return json({ success: false, error: result.error }, { status: 400 });
    }

    console.log('[BFF] Create successful:', result.data?.id);
    return json({ success: true, data: result.data }, { status: 201 });
  } catch (error: any) {
    logApiError('[BFF-ReleaseConfig-Create]', error);
    return json(
      { success: false, error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - List all release configurations for tenant
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { appId } = params;

  if (!appId) {
    return json({ success: false, error: 'app id is required' }, { status: 400 });
  }

  try {
    // console.log('[BFF] Listing release configs for tenant:', appId);

    const result = await ReleaseConfigService.list(appId, userId);

    if (!result.success) {
      console.error('[BFF] List failed:', result.error);
      return json({ success: false, error: result.error }, { status: 400 });
    }

    // Backend already returns platformTargets in correct format - no transformation needed
    // UI components should read directly from platformTargets array
    const configs = result.data ?? [];

    console.log('[BFF] List successful:', configs.length, 'configs (active:', configs.filter((c: any) => c.isActive).length + ', archived:', configs.filter((c: any) => !c.isActive).length + ')');
    
    return json({ success: true, data: configs }, { status: 200 });
  } catch (error: any) {
    logApiError('[BFF-ReleaseConfig-List]', error);
    return json(
      { success: false, error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

