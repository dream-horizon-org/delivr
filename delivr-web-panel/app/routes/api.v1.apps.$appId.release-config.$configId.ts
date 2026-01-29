/**
 * BFF Route: Get, Update & Delete Release Configuration
 * GET    /api/v1/apps/:appId/release-config/:configId  - Get specific config
 * PUT    /api/v1/apps/:appId/release-config/:configId  - Update config
 * DELETE /api/v1/apps/:appId/release-config/:configId  - Delete config
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/.server/services/Auth';
import { ReleaseConfigService } from '~/.server/services/ReleaseConfig';
import type { ReleaseConfiguration } from '~/types/release-config';
import { logApiError } from '~/utils/api-route-helpers';
import { RELEASE_CONFIG_OPERATION_TYPES } from '~/constants/release-config';

/**
 * GET - Get specific release configuration
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const appId = params.appId;
  const configId = params.configId;

  if (!appId) {
    return json({ success: false, error: 'app id is required' }, { status: 400 });
  }

  if (!configId) {
    return json({ success: false, error: 'Config ID is required' }, { status: 400 });
  }

  try {
    console.log('[BFF] Fetching release config:', configId);

    const result = await ReleaseConfigService.getById(configId, appId, userId);

    if (!result.success) {
      console.error('[BFF] Get failed:', result.error);
      return json({ success: false, error: result.error }, { status: 404 });
    }
    console.log('[BFF] Get successful after transformation:', JSON.stringify(result.data, null, 2));
    return json({ success: true, data: result.data }, { status: 200 });
  } catch (error: any) {
    logApiError('[BFF-ReleaseConfig-Get]', error);
    return json(
      { success: false, error: error.message ?? 'Internal server error' },
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
  const appId = params.appId;
  const configId = params.configId;

  if (!appId) {
    return json({ success: false, error: 'app id is required' }, { status: 400 });
  }

  if (!configId) {
    return json({ success: false, error: 'Config ID is required' }, { status: 400 });
  }

  // Handle UPDATE
  if (request.method === 'PUT') {
    try {
      const updates: Partial<ReleaseConfiguration> = await request.json();

      console.log('[BFF] Updating release config:', configId, Object.keys(updates));

      // Detect archive/unarchive operations based on type field
      const operationType = (updates as any).type;
      const isArchive = operationType === RELEASE_CONFIG_OPERATION_TYPES.ARCHIVE;
      const isUnarchive = operationType === RELEASE_CONFIG_OPERATION_TYPES.UNARCHIVE;

      let result;
      if (isArchive) {
        // Archive operation - send payload as-is without transformation
        // Remove type field before sending to backend
        const { type, ...archivePayload } = updates as any;
        console.log('[BFF] Detected archive operation, calling archive method');
        result = await ReleaseConfigService.archive(configId, archivePayload, appId, userId);
      } else if (isUnarchive) {
        // Unarchive operation - send payload as-is without transformation
        // Remove type field before sending to backend
        const { type, ...unarchivePayload } = updates as any;
        console.log('[BFF] Detected unarchive operation, calling unarchive method');
        result = await ReleaseConfigService.unarchive(configId, unarchivePayload, appId, userId);
      } else {
        // Regular update - use existing update method with transformation
        console.log('[BFF] Regular update operation, calling update method');
        result = await ReleaseConfigService.update(configId, updates, appId, userId);
      }

      if (!result.success) {
        console.error('[BFF] Update failed:', result.error);
        return json({ success: false, error: result.error }, { status: 400 });
      }

      console.log('[BFF] Update successful:', result.data?.name);
      return json({ success: true, data: result.data }, { status: 200 });
    } catch (error: any) {
      logApiError('[BFF-ReleaseConfig-Update]', error);
      return json(
        { success: false, error: error.message ?? 'Internal server error' },
        { status: 500 }
      );
    }
  }

  // Handle DELETE
  if (request.method === 'DELETE') {
    try {
      console.log('[BFF] Deleting release config:', configId);

      const result = await ReleaseConfigService.delete(configId, appId, userId);

      if (!result.success) {
        console.error('[BFF] Delete failed:', result.error);
        
        // Check if error is due to foreign key constraint (config in use by releases)
        const errorMessage = result.error || 'Unknown error';
        const isForeignKeyError = 
          errorMessage.includes('foreign key constraint') ||
          errorMessage.includes('releaseConfigId') ||
          errorMessage.includes('Cannot delete or update a parent row');
        
        // Return user-friendly error message
        if (isForeignKeyError) {
          return json({ 
            success: false, 
            error: 'This configuration is being used by one or more releases. Please archive it instead, or wait until all related releases are completed or deleted.' 
          }, { status: 400 });
        }
        
        return json({ success: false, error: result.error }, { status: 400 });
      }

      console.log('[BFF] Delete successful');
      return json({ success: true, message: 'Release configuration deleted' }, { status: 200 });
    } catch (error: any) {
      logApiError('[BFF-ReleaseConfig-Delete]', error);
      
      // Check if error is due to foreign key constraint
      const errorMessage = error.message ?? 'Internal server error';
      const isForeignKeyError = 
        errorMessage.includes('foreign key constraint') ||
        errorMessage.includes('releaseConfigId') ||
        errorMessage.includes('Cannot delete or update a parent row');
      
      if (isForeignKeyError) {
        return json({ 
          success: false, 
          error: 'This configuration is being used by one or more releases. Please archive it instead, or wait until all related releases are completed or deleted.' 
        }, { status: 400 });
      }
      
      return json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}

