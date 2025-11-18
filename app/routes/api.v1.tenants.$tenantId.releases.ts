/**
 * Release API Route (BFF Layer)
 * CRUD operations for releases
 * Uses in-memory store until server-ota backend is ready
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import {
  getAllReleases,
  getReleaseById,
  getReleasesByStatus,
  getActiveReleases,
  getRecentReleases,
  createRelease,
  updateRelease,
  deleteRelease,
  startRelease,
  completeRelease,
  cancelRelease,
  updateReleaseProgress,
  getReleaseStats,
  getReleaseAnalytics,
} from '~/.server/stores/release-store';
import { getConfigById } from '~/.server/stores/release-config-store';
import type { Release } from '~/.server/stores/release-store';

/**
 * GET: Fetch releases for an organization
 * Query params:
 *   - releaseId: Get specific release
 *   - status: Filter by status
 *   - recent: Get recent N releases (e.g., ?recent=10)
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const { tenantId } = params;
  
  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }
  
  const url = new URL(request.url);
  const releaseId = url.searchParams.get('releaseId');
  const status = url.searchParams.get('status');
  const recent = url.searchParams.get('recent');
  const analytics = url.searchParams.get('analytics') === 'true';
  
  try {
    // Get specific release
    if (releaseId) {
      const release = getReleaseById(tenantId, releaseId);
      
      if (!release) {
        return json({ success: false, error: 'Release not found' }, { status: 404 });
      }
      
      return json({
        success: true,
        release,
      });
    }
    
    // Get analytics only
    if (analytics) {
      const analyticsData = getReleaseAnalytics(tenantId);
      const stats = getReleaseStats(tenantId);
      
      return json({
        success: true,
        analytics: analyticsData,
        stats,
      });
    }
    
    // Get filtered releases
    let releases: Release[];
    
    if (status) {
      releases = getReleasesByStatus(tenantId, status as any);
    } else if (recent) {
      const limit = parseInt(recent, 10) || 10;
      releases = getRecentReleases(tenantId, limit);
    } else {
      releases = getAllReleases(tenantId);
    }
    
    // Get stats
    const stats = getReleaseStats(tenantId);
    
    console.log(`[API] GET /api/v1/tenants/${tenantId}/releases - Found ${releases.length} releases`);
    
    return json({
      success: true,
      releases,
      stats,
      count: releases.length,
    });
  } catch (error: any) {
    console.error('[API] Failed to fetch releases:', error);
    return json(
      { success: false, error: error.message || 'Failed to fetch releases' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create new release
 * PUT: Update existing release
 * PATCH: Update release status/progress
 * DELETE: Cancel/delete release
 */
export async function action({ params, request }: ActionFunctionArgs) {
  const { tenantId } = params;
  
  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }
  
  const method = request.method;
  
  try {
    if (method === 'POST') {
      // Create new release
      const body = await request.json();
      const releaseData = body.release || body;
      
      // Validate required fields
      if (!releaseData.version || !releaseData.kickoffDate || !releaseData.releaseDate) {
        return json(
          { success: false, error: 'Missing required fields (version, kickoffDate, releaseDate)' },
          { status: 400 }
        );
      }
      
      // Ensure tenant ID matches
      releaseData.tenantId = tenantId;
      
      // If using a configuration, load and merge it
      if (releaseData.configId) {
        const config = getConfigById(tenantId, releaseData.configId);
        if (config) {
          // Store config snapshot
          releaseData.configSnapshot = {
            name: config.name,
            buildPipelines: config.buildPipelines,
            scheduling: config.scheduling,
            testManagement: config.testManagement,
            communication: config.communication,
          };
          
          // Apply config defaults if not overridden
          if (!releaseData.platforms && config.defaultTargets) {
            releaseData.platforms = {
              web: config.defaultTargets.includes('WEB'),
              playStore: config.defaultTargets.includes('PLAY_STORE'),
              appStore: config.defaultTargets.includes('APP_STORE'),
            };
          }
        }
      }
      
      // Ensure platforms are set
      if (!releaseData.platforms) {
        releaseData.platforms = { web: false, playStore: false, appStore: false };
      }
      
      const created = createRelease(tenantId, releaseData);
      
      console.log(`[API] POST /api/v1/tenants/${tenantId}/releases - Created ${created.id}`);
      
      return json({
        success: true,
        releaseId: created.id,
        release: created,
        message: 'Release created successfully',
      }, { status: 201 });
      
    } else if (method === 'PUT') {
      // Update entire release
      const body = await request.json();
      const { releaseId, ...updates } = body;
      
      if (!releaseId) {
        return json(
          { success: false, error: 'Release ID is required for updates' },
          { status: 400 }
        );
      }
      
      const updated = updateRelease(tenantId, releaseId, updates);
      
      if (!updated) {
        return json({ success: false, error: 'Release not found' }, { status: 404 });
      }
      
      console.log(`[API] PUT /api/v1/tenants/${tenantId}/releases - Updated ${releaseId}`);
      
      return json({
        success: true,
        releaseId,
        release: updated,
        message: 'Release updated successfully',
      });
      
    } else if (method === 'PATCH') {
      // Update release status or progress
      const body = await request.json();
      const { releaseId, action: actionType, progress } = body;
      
      if (!releaseId) {
        return json(
          { success: false, error: 'Release ID is required' },
          { status: 400 }
        );
      }
      
      let updated: Release | null = null;
      
      // Handle specific actions
      if (actionType === 'start') {
        updated = startRelease(tenantId, releaseId);
      } else if (actionType === 'complete') {
        updated = completeRelease(tenantId, releaseId);
      } else if (actionType === 'cancel') {
        updated = cancelRelease(tenantId, releaseId);
      } else if (progress) {
        updated = updateReleaseProgress(tenantId, releaseId, progress);
      } else {
        // Generic update
        const { releaseId: _, action: __, ...updates } = body;
        updated = updateRelease(tenantId, releaseId, updates);
      }
      
      if (!updated) {
        return json({ success: false, error: 'Release not found' }, { status: 404 });
      }
      
      console.log(`[API] PATCH /api/v1/tenants/${tenantId}/releases - ${actionType || 'Updated'} ${releaseId}`);
      
      return json({
        success: true,
        releaseId,
        release: updated,
        message: `Release ${actionType || 'updated'} successfully`,
      });
      
    } else if (method === 'DELETE') {
      // Delete release
      const body = await request.json();
      const { releaseId, cancel = false } = body;
      
      if (!releaseId) {
        return json(
          { success: false, error: 'Release ID is required' },
          { status: 400 }
        );
      }
      
      if (cancel) {
        // Soft delete (cancel)
        const cancelled = cancelRelease(tenantId, releaseId);
        
        if (!cancelled) {
          return json({ success: false, error: 'Release not found' }, { status: 404 });
        }
        
        console.log(`[API] DELETE /api/v1/tenants/${tenantId}/releases - Cancelled ${releaseId}`);
        
        return json({
          success: true,
          release: cancelled,
          message: 'Release cancelled successfully',
        });
      } else {
        // Hard delete
        const deleted = deleteRelease(tenantId, releaseId);
        
        if (!deleted) {
          return json({ success: false, error: 'Release not found' }, { status: 404 });
        }
        
        console.log(`[API] DELETE /api/v1/tenants/${tenantId}/releases - Deleted ${releaseId}`);
        
        return json({
          success: true,
          message: 'Release deleted successfully',
        });
      }
    }
    
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error(`[API] ${method} /api/v1/tenants/${tenantId}/releases failed:`, error);
    return json(
      { success: false, error: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}

