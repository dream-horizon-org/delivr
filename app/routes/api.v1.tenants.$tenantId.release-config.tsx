/**
 * Release Configuration API Route (BFF Layer)
 * CRUD operations for release configurations
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import type { ReleaseConfiguration } from '~/types/release-config';

/**
 * GET: Fetch release configurations for an organization
 * Query params:
 *   - configId: Get specific configuration
 *   - status: Filter by status (ACTIVE, DRAFT, ARCHIVED)
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const { tenantId } = params;
  
  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }
  
  const url = new URL(request.url);
  const configId = url.searchParams.get('configId');
  const status = url.searchParams.get('status');
  
  try {
    // TODO: Call server-ota API
    // const response = await fetch(`${SERVER_OTA_URL}/tenants/${tenantId}/release-config`, {
    //   method: 'GET',
    //   headers: {
    //     'Authorization': `Bearer ${token}`,
    //   },
    // });
    
    console.log(`[API] GET /api/v1/tenants/${tenantId}/release-config`, {
      configId,
      status,
    });
    
    // For now, return empty array (backend not implemented)
    return json({
      success: true,
      configurations: [],
      message: 'Backend API not yet implemented',
    });
  } catch (error: any) {
    console.error('[API] Failed to fetch configurations:', error);
    return json(
      { success: false, error: error.message || 'Failed to fetch configurations' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create new release configuration
 * PUT: Update existing release configuration
 * DELETE: Delete/archive release configuration
 */
export async function action({ params, request }: ActionFunctionArgs) {
  const { tenantId } = params;
  
  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }
  
  const method = request.method;
  
  try {
    if (method === 'POST') {
      // Create new configuration
      const body = await request.json();
      const config: ReleaseConfiguration = body.config;
      
      // TODO: Call server-ota API
      // const response = await fetch(`${SERVER_OTA_URL}/tenants/${tenantId}/release-config`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`,
      //   },
      //   body: JSON.stringify(config),
      // });
      
      console.log(`[API] POST /api/v1/tenants/${tenantId}/release-config`, {
        configName: config.name,
        configId: config.id,
      });
      
      return json({
        success: true,
        configId: config.id,
        message: 'Configuration saved (locally, backend not implemented)',
      });
    } else if (method === 'PUT') {
      // Update existing configuration
      const body = await request.json();
      const config: ReleaseConfiguration = body.config;
      
      // TODO: Call server-ota API
      console.log(`[API] PUT /api/v1/tenants/${tenantId}/release-config`, {
        configId: config.id,
      });
      
      return json({
        success: true,
        configId: config.id,
        message: 'Configuration updated (locally, backend not implemented)',
      });
    } else if (method === 'DELETE') {
      // Delete/archive configuration
      const body = await request.json();
      const configId = body.configId;
      
      // TODO: Call server-ota API
      console.log(`[API] DELETE /api/v1/tenants/${tenantId}/release-config`, {
        configId,
      });
      
      return json({
        success: true,
        message: 'Configuration archived (locally, backend not implemented)',
      });
    }
    
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error(`[API] ${method} /api/v1/tenants/${tenantId}/release-config failed:`, error);
    return json(
      { success: false, error: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}

