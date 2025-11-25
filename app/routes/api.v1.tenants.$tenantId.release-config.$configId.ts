/**
 * BFF Route: Get, Update & Delete Release Configuration
 * GET    /api/v1/tenants/:tenantId/release-config/:configId  - Get specific config
 * PUT    /api/v1/tenants/:tenantId/release-config/:configId  - Update config
 * DELETE /api/v1/tenants/:tenantId/release-config/:configId  - Delete config
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
 * GET - Get specific release configuration
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId, configId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  if (!configId) {
    return json({ success: false, error: 'Config ID is required' }, { status: 400 });
  }

  try {
    console.log('[BFF] Fetching release config:', configId);

    const result = await ReleaseConfigService.getById(configId, tenantId, userId);

    if (!result.success) {
      console.error('[BFF] Get failed:', result.error);
      return json({ success: false, error: result.error }, { status: 404 });
    }

    // Transform backend format (platformTargets) to UI format (targets array)
    let transformedConfig = result.data;
    if (result.data && result.data.platformTargets && Array.isArray(result.data.platformTargets)) {
      const targets = transformFromPlatformTargetsArray(result.data.platformTargets);
      const platforms = [...new Set(result.data.platformTargets.map((pt: PlatformTarget) => pt.platform))];
      
      transformedConfig = {
        ...result.data,
        targets,
        platforms,
      };
    }

    console.log('[BFF] Get successful:', transformedConfig?.name);
    return json({ success: true, data: transformedConfig }, { status: 200 });
  } catch (error: any) {
    console.error('[BFF] Get error:', error);
    return json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update release configuration
 * DELETE - Delete release configuration
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId, configId } = params;

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  if (!configId) {
    return json({ success: false, error: 'Config ID is required' }, { status: 400 });
  }

  // Handle UPDATE
  if (request.method === 'PUT') {
    try {
      const updates: Partial<ReleaseConfiguration> = await request.json();

      console.log('[BFF] Updating release config:', configId, Object.keys(updates));

      // Transform UI format to backend format if targets are present
      let backendUpdates = { ...updates };
      if (updates.targets && Array.isArray(updates.targets)) {
        const platformTargets = transformToPlatformTargetsArray(updates.targets);
        backendUpdates = {
          ...updates,
          platformTargets,
          platforms: undefined,
          targets: undefined,
        };
        console.log('[BFF] Transformed platformTargets:', platformTargets);
      }

      const result = await ReleaseConfigService.update(configId, backendUpdates as any, tenantId, userId);

      if (!result.success) {
        console.error('[BFF] Update failed:', result.error);
        return json({ success: false, error: result.error }, { status: 400 });
      }

      // Transform backend response to UI format
      let transformedData = result.data;
      if (result.data && result.data.platformTargets && Array.isArray(result.data.platformTargets)) {
        const targets = transformFromPlatformTargetsArray(result.data.platformTargets);
        const platforms = [...new Set(result.data.platformTargets.map((pt: PlatformTarget) => pt.platform))];
        
        transformedData = {
          ...result.data,
          targets,
          platforms,
        };
      }

      console.log('[BFF] Update successful:', transformedData?.name);
      return json({ success: true, data: transformedData }, { status: 200 });
    } catch (error: any) {
      console.error('[BFF] Update error:', error);
      return json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }

  // Handle DELETE
  if (request.method === 'DELETE') {
    try {
      console.log('[BFF] Deleting release config:', configId);

      const result = await ReleaseConfigService.delete(configId, tenantId, userId);

      if (!result.success) {
        console.error('[BFF] Delete failed:', result.error);
        return json({ success: false, error: result.error }, { status: 400 });
      }

      console.log('[BFF] Delete successful');
      return json({ success: true, message: 'Release configuration deleted' }, { status: 200 });
    } catch (error: any) {
      console.error('[BFF] Delete error:', error);
      return json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}

