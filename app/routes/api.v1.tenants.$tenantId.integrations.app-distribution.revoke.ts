/**
 * BFF API Route: Revoke App Distribution Integration (Play Store / App Store)
 * Proxies to backend: PATCH /integrations/store/tenant/:tenantId/revoke?storeType=X&platform=Y
 * 
 * DELETE /api/v1/tenants/:tenantId/integrations/app-distribution/revoke?storeType=X&platform=Y
 */

/**
 * BFF API Route: Revoke App Distribution Integration (Play Store / App Store)
 * DELETE /api/v1/tenants/:tenantId/integrations/app-distribution/revoke?storeType=X&platform=Y
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/.server/services/Auth';
import { AppDistributionService } from '~/.server/services/ReleaseManagement/integrations';
import type { StoreType, Platform } from '~/types/distribution/app-distribution';

/**
 * DELETE - Revoke app distribution integration
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { tenantId } = params;
  
  const url = new URL(request.url);
  const storeType = url.searchParams.get('storeType');
  const platform = url.searchParams.get('platform');

  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }

  if (!storeType) {
    return json({ success: false, error: 'Store type is required (e.g., play_store, app_store)' }, { status: 400 });
  }

  if (!platform) {
    return json({ success: false, error: 'Platform is required (e.g., ANDROID, IOS)' }, { status: 400 });
  }

  // Only allow DELETE method
  if (request.method !== 'DELETE') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const result = await AppDistributionService.revokeIntegration(
      tenantId,
      storeType as StoreType,
      platform as Platform,
      userId
    );

    if (!result.success) {
      return json(
        { success: false, error: result.error || 'Failed to revoke integration' },
        { status: 500 }
      );
    }

    return json(result, { status: 200 });
  } catch (error: any) {
    console.error('[App Distribution Revoke] Error:', error);
    return json(
      { success: false, error: error.message || 'Failed to revoke integration' },
      { status: 500 }
    );
  }
}

