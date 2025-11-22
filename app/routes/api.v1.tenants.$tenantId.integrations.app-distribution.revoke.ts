/**
 * BFF API Route: Revoke App Distribution Integration (Play Store / App Store)
 * Proxies to backend: PATCH /integrations/store/tenant/:tenantId/revoke?storeType=X&platform=Y
 * 
 * DELETE /api/v1/tenants/:tenantId/integrations/app-distribution/revoke?storeType=X&platform=Y
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/.server/services/Auth';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3010';

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
    const backendUrl = `${BACKEND_API_URL}/integrations/store/tenant/${tenantId}/revoke?storeType=${storeType}&platform=${platform}`;
    
    console.log(`[App Distribution Revoke] Revoking integration: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[App Distribution Revoke] Failed:', data);
      return json(
        { success: false, error: data.error || 'Failed to revoke integration' },
        { status: response.status }
      );
    }

    console.log('[App Distribution Revoke] Successfully revoked:', data);
    return json(data, { status: 200 });
  } catch (error: any) {
    console.error('[App Distribution Revoke] Error:', error);
    return json(
      { success: false, error: error.message || 'Failed to revoke integration' },
      { status: 500 }
    );
  }
}

