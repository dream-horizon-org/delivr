/**
 * BFF Route: Create & List Release Configurations
 * POST   /api/v1/tenants/:tenantId/release-config  - Create new config
 * GET    /api/v1/tenants/:tenantId/release-config  - List all configs
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/.server/services/Auth';
import { ReleaseConfigService } from '~/.server/services/ReleaseConfig';
import type { ReleaseConfiguration } from '~/types/release-config';
import { 
  transformToPlatformTargetsArray,
  transformFromPlatformTargetsArray,
  type PlatformTarget,
} from '~/utils/platform-mapper';

/**
 * POST - Create release configuration
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;
  console.log('[BFF] action:', request, params, userId, tenantId); 

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const config: ReleaseConfiguration = await request.json();

    console.log('[BFF] Creating release config:', {
      tenantId,
      name: config.name,
      releaseType: config.releaseType,
      targets: config.targets,
    });

    // Transform UI format (targets array) to backend format (platformTargets array)
    const platformTargets = transformToPlatformTargetsArray(config.targets);
    
    // Create backend payload with platformTargets
    const backendConfig = {
      ...config,
      platformTargets,
      // Remove old fields that are replaced by platformTargets
      platforms: undefined,
      targets: undefined,
    };

    console.log('[BFF] Transformed platformTargets:', platformTargets);

    const result = await ReleaseConfigService.create(backendConfig as any, tenantId, userId);

    if (!result.success) {
      console.error('[BFF] Create failed:', result.error);
      return json({ success: false, error: result.error }, { status: 400 });
    }

    console.log('[BFF] Create successful:', result.data?.id);
    return json({ success: true, data: result.data }, { status: 201 });
  } catch (error: any) {
    console.error('[BFF] Create error:', error);
    return json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - List all release configurations for tenant
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  try {
    console.log('[BFF] Listing release configs for tenant:', tenantId);

    const result = await ReleaseConfigService.list(tenantId, userId);

    if (!result.success) {
      console.error('[BFF] List failed:', result.error);
      return json({ success: false, error: result.error }, { status: 400 });
    }

    // Transform backend format (platformTargets) to UI format (targets array)
    const transformedConfigs = result.data?.map((config: any) => {
      if (config.platformTargets && Array.isArray(config.platformTargets)) {
        const targets = transformFromPlatformTargetsArray(config.platformTargets);
        const platforms = [...new Set(config.platformTargets.map((pt: PlatformTarget) => pt.platform))];
        
        return {
          ...config,
          targets,
          platforms,
          // Keep platformTargets for backward compatibility if needed
        };
      }
      return config;
    }) || [];

    console.log('[BFF] List successful:', transformedConfigs.length, 'configs (active:', transformedConfigs.filter((c: any) => c.isActive).length + ', archived:', transformedConfigs.filter((c: any) => !c.isActive).length + ')');
    
    return json({ success: true, data: transformedConfigs }, { status: 200 });
  } catch (error: any) {
    console.error('[BFF] List error:', error.message || error);
    return json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

