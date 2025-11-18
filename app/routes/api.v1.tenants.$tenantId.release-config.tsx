/**
 * Release Configuration API Route (BFF Layer)
 * CRUD operations for release configurations
 * Uses in-memory store until server-ota backend is ready
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import type { ReleaseConfiguration } from '~/types/release-config';
import {
  getAllConfigs,
  getConfigById,
  getActiveConfigs,
  createConfig,
  updateConfig,
  deleteConfig,
  archiveConfig,
  getConfigStats,
} from '~/.server/stores/release-config-store';

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
    // Get specific configuration
    if (configId) {
      const config = getConfigById(tenantId, configId);
      
      if (!config) {
        return json({ success: false, error: 'Configuration not found' }, { status: 404 });
      }
      
      return json({
        success: true,
        configuration: config,
      });
    }
    
    // Get filtered configurations
    let configurations: ReleaseConfiguration[];
    
    if (status === 'ACTIVE') {
      configurations = getActiveConfigs(tenantId);
    } else if (status) {
      configurations = getAllConfigs(tenantId).filter(c => c.status === status);
    } else {
      configurations = getAllConfigs(tenantId);
    }
    
    // Get stats
    const stats = getConfigStats(tenantId);
    
    console.log(`[API] GET /api/v1/tenants/${tenantId}/release-config - Found ${configurations.length} configs`);
    
    return json({
      success: true,
      configurations,
      stats,
      count: configurations.length,
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
      
      // Validate required fields
      if (!config.name || !config.defaultTargets || !config.buildPipelines) {
        return json(
          { success: false, error: 'Missing required fields (name, defaultTargets, buildPipelines)' },
          { status: 400 }
        );
      }
      
      // Ensure tenant ID matches
      config.organizationId = tenantId;
      
      const created = createConfig(tenantId, config);
      
      console.log(`[API] POST /api/v1/tenants/${tenantId}/release-config - Created ${created.id}`);
      
      return json({
        success: true,
        configId: created.id,
        configuration: created,
        message: 'Configuration created successfully',
      }, { status: 201 });
    } else if (method === 'PUT') {
      // Update existing configuration
      const body = await request.json();
      const config: ReleaseConfiguration = body.config;
      
      if (!config.id) {
        return json(
          { success: false, error: 'Config ID is required for updates' },
          { status: 400 }
        );
      }
      
      const updated = updateConfig(tenantId, config.id, config);
      
      if (!updated) {
        return json({ success: false, error: 'Configuration not found' }, { status: 404 });
      }
      
      console.log(`[API] PUT /api/v1/tenants/${tenantId}/release-config - Updated ${config.id}`);
      
      return json({
        success: true,
        configId: config.id,
        configuration: updated,
        message: 'Configuration updated successfully',
      });
    } else if (method === 'DELETE') {
      // Delete/archive configuration
      const body = await request.json();
      const configId = body.configId;
      const archive = body.archive !== false; // Default to archive (soft delete)
      
      if (!configId) {
        return json(
          { success: false, error: 'Config ID is required' },
          { status: 400 }
        );
      }
      
      if (archive) {
        const archived = archiveConfig(tenantId, configId);
        
        if (!archived) {
          return json({ success: false, error: 'Configuration not found' }, { status: 404 });
        }
        
        console.log(`[API] DELETE /api/v1/tenants/${tenantId}/release-config - Archived ${configId}`);
        
        return json({
          success: true,
          configuration: archived,
          message: 'Configuration archived successfully',
        });
      } else {
        const deleted = deleteConfig(tenantId, configId);
        
        if (!deleted) {
          return json({ success: false, error: 'Configuration not found' }, { status: 404 });
        }
        
        console.log(`[API] DELETE /api/v1/tenants/${tenantId}/release-config - Deleted ${configId}`);
        
        return json({
          success: true,
          message: 'Configuration deleted successfully',
        });
      }
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

