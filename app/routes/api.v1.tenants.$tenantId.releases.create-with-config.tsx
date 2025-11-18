/**
 * Create Release With Configuration API Route (BFF Layer)
 * Create a new release using a saved configuration
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import type { ReleaseCreationData } from '~/components/ReleaseManagement/InstantReleaseWithConfig';

/**
 * POST: Create new release using configuration
 */
export async function action({ params, request }: ActionFunctionArgs) {
  const { tenantId } = params;
  
  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }
  
  try {
    const body = await request.json();
    const releaseData: ReleaseCreationData = body;
    
    // TODO: Call server-ota API
    // const response = await fetch(`${SERVER_OTA_URL}/tenants/${tenantId}/releases/create-with-config`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`,
    //   },
    //   body: JSON.stringify(releaseData),
    // });
    
    console.log(`[API] POST /api/v1/tenants/${tenantId}/releases/create-with-config`, {
      configId: releaseData.configId,
      version: releaseData.version,
      releaseDate: releaseData.releaseDate,
      kickoffDate: releaseData.kickoffDate,
    });
    
    // For now, return mock success
    return json({
      success: true,
      releaseId: `release_${Date.now()}`,
      message: 'Release created successfully (mock, backend not implemented)',
    });
  } catch (error: any) {
    console.error('[API] Failed to create release:', error);
    return json(
      { success: false, error: error.message || 'Failed to create release' },
      { status: 500 }
    );
  }
}

