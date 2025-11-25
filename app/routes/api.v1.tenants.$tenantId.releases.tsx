/**
 * Releases API Route
 * Handle CRUD operations for releases
 * Accepts UI format and transforms to new backend API contract
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import {
  getAllReleases,
  getRelease,
  createRelease,
  updateRelease,
  deleteRelease,
  getReleaseStats,
  getUpcomingReleases,
  getReleaseAnalytics,
  seedMockReleases,
} from '~/.server/stores/release-store';
import type { CreateReleaseInput, UpdateReleaseInput, ReleaseFilters } from '~/types/release';
import { transformToReleaseCreationFormat, extractPlatformVersions, type PlatformTargetWithVersion } from '~/utils/platform-mapper';
import type { TargetPlatform, Platform } from '~/types/release-config';

/**
 * GET /api/v1/tenants/:tenantId/releases
 * Fetch releases with optional filters
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const { tenantId } = params;
  
  if (!tenantId) {
    return json({ error: 'Tenant ID required' }, { status: 400 });
  }
  
  const url = new URL(request.url);
  
  // Check if requesting specific release
  const releaseId = url.searchParams.get('releaseId');
  if (releaseId) {
    const release = getRelease(releaseId);
    
    if (!release) {
      return json({ error: 'Release not found' }, { status: 404 });
    }
    
    if (release.tenantId !== tenantId) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    return json({ release });
  }
  
  // Check if requesting stats
  const statsOnly = url.searchParams.get('stats') === 'true';
  if (statsOnly) {
    const stats = getReleaseStats(tenantId);
    return json({ stats });
  }
  
  // Check if requesting analytics (for dashboard)
  const analyticsOnly = url.searchParams.get('analytics') === 'true';
  if (analyticsOnly) {
    const analytics = getReleaseAnalytics(tenantId);
    return json({ analytics });
  }
  
  // Check if requesting upcoming only
  const upcomingOnly = url.searchParams.get('upcoming') === 'true';
  if (upcomingOnly) {
    const upcoming = getUpcomingReleases(tenantId);
    return json({ releases: upcoming, total: upcoming.length });
  }
  
  // Check if requesting recent releases
  const recentParam = url.searchParams.get('recent');
  if (recentParam) {
    const limit = parseInt(recentParam);
    const allReleases = getAllReleases(tenantId);
    const recent = allReleases.slice(0, limit);
    return json({ releases: recent, total: allReleases.length });
  }
  
  // Check if seeding mock data (development only)
  const seedMock = url.searchParams.get('seed') === 'true';
  if (seedMock && process.env.NODE_ENV === 'development') {
    seedMockReleases(tenantId);
    const releases = getAllReleases(tenantId);
    return json({ releases, total: releases.length, seeded: true });
  }
  
  // Parse filters
  const filters: ReleaseFilters = {};
  
  const statusParam = url.searchParams.get('status');
  if (statusParam) {
    filters.status = statusParam.split(',') as any[];
  }
  
  const releaseTypeParam = url.searchParams.get('releaseType');
  if (releaseTypeParam) {
    filters.releaseType = releaseTypeParam.split(',') as any[];
  }
  
  const fromDate = url.searchParams.get('fromDate');
  if (fromDate) {
    filters.fromDate = fromDate;
  }
  
  const toDate = url.searchParams.get('toDate');
  if (toDate) {
    filters.toDate = toDate;
  }
  
  const searchQuery = url.searchParams.get('q');
  if (searchQuery) {
    filters.searchQuery = searchQuery;
  }
  
  // Fetch releases
  const releases = getAllReleases(tenantId, filters);
  
  // Pagination
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedReleases = releases.slice(startIndex, endIndex);
  
  return json({
    releases: paginatedReleases,
    total: releases.length,
    page,
    pageSize,
    hasMore: endIndex < releases.length,
  });
}

/**
 * POST /api/v1/tenants/:tenantId/releases
 * Create or update release
 * Accepts old UI format:
 * {
 *   configId?: string,
 *   version: string,
 *   releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR',
 *   baseVersion?: string,
 *   kickoffDate: string,
 *   releaseDate: string,
 *   description?: string,
 *   platforms: { web: boolean, playStore: boolean, appStore: boolean },
 *   customizations?: object,
 *   createdBy: string
 * }
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const { tenantId } = params;
  
  if (!tenantId) {
    return json({ error: 'Tenant ID required' }, { status: 400 });
  }
  
  try {
    const body = await request.json();
    const method = request.method;
    
    // CREATE
    if (method === 'POST') {
      const releaseData = body;
      
      if (!releaseData) {
        return json({ error: 'Release data required' }, { status: 400 });
      }
      
      console.log('[Releases API] Received release data:', JSON.stringify(releaseData, null, 2));
      
      // Extract basicDetails from new format
      const basicDetails = releaseData.basicDetails || {};
      
      // NEW FORMAT: Transform platformTargets with versions to backend format
      // Expected input: 
      // 1. releaseTargets: TargetPlatform[] (e.g., ['PLAY_STORE', 'APP_STORE'])
      // 2. platformVersions: Record<Platform, string> (e.g., { ANDROID: 'v6.5.0', IOS: 'v6.3.0' })
      //
      // OR OLD FORMAT (backward compatibility):
      // releaseTargets: { web: boolean, playStore: boolean, appStore: boolean }
      
      let platformTargets: PlatformTargetWithVersion[] = [];
      
      // Check if new format (array of TargetPlatform)
      if (Array.isArray(basicDetails.releaseTargets)) {
        const targets: TargetPlatform[] = basicDetails.releaseTargets;
        const versions: Record<Platform, string> = releaseData.platformVersions || {};
        
        // Transform to platformTargets array
        platformTargets = transformToReleaseCreationFormat(targets, versions);
      }
      // Check if old format (boolean object) - for backward compatibility
      else if (basicDetails.releaseTargets && typeof basicDetails.releaseTargets === 'object') {
        const oldTargets = basicDetails.releaseTargets;
        const targets: TargetPlatform[] = [];
        
        if (oldTargets.web) targets.push('WEB' as TargetPlatform);
        if (oldTargets.playStore) targets.push('PLAY_STORE' as TargetPlatform);
        if (oldTargets.appStore) targets.push('APP_STORE' as TargetPlatform);
        
        // Use version from basicDetails or default
        const version = basicDetails.version || 'v1.0.0';
        const versions: Record<Platform, string> = {
          ANDROID: version,
          IOS: version,
        };
        
        platformTargets = transformToReleaseCreationFormat(targets, versions);
      }
      
      console.log('[Releases API] Transformed platformTargets:', platformTargets);
      
      // Validation
      if (!basicDetails.version || !basicDetails.kickoffDate || !basicDetails.releaseDate) {
        return json(
          { error: 'Version, kickoffDate, and releaseDate are required' },
          { status: 400 }
        );
      }
      
      if (platformTargets.length === 0) {
        return json(
          { error: 'At least one platform target must be selected' },
          { status: 400 }
        );
      }
      
      // TODO: When integrating with real backend service, send this format:
      // {
      //   tenantId,
      //   configId,
      //   releaseType,
      //   baseVersion,
      //   baseBranch,
      //   targetReleaseDate,
      //   plannedDate,
      //   platformTargets: [
      //     { platform: 'ANDROID', target: 'PLAY_STORE', version: 'v6.5.0' },
      //     { platform: 'IOS', target: 'APP_STORE', version: 'v6.3.0' }
      //   ],
      //   cronConfig: {...},
      //   regressionBuildSlots: [...]
      // }
      
      // For now, keep using old format for in-memory store
      const input: CreateReleaseInput = {
        tenantId,
        configId: releaseData.configId,
        version: basicDetails.version,
        releaseType: basicDetails.releaseType || 'PLANNED',
        baseVersion: releaseData.baseVersion,
        kickoffDate: basicDetails.kickoffDate,
        releaseDate: basicDetails.releaseDate,
        description: basicDetails.description,
        platforms: basicDetails.releaseTargets || { web: false, playStore: false, appStore: false },
        customizations: releaseData.customizations,
        createdBy: releaseData.createdBy || 'system',
      };
      
      const release = createRelease(input);
      
      console.log(`[Releases API] Created release: ${release.id} - ${release.releaseKey} v${release.version}`);
      console.log(`[Releases API] PlatformTargets for backend: ${JSON.stringify(platformTargets)}`);
      
      return json({
        success: true,
        releaseId: release.id,
        release,
        // Include transformed data for debugging
        _transformedData: {
          platformTargets,
        },
      });
    }
    
    // UPDATE
    if (method === 'PUT') {
      const input: UpdateReleaseInput = body.release;
      
      if (!input.id) {
        return json({ error: 'Release ID required for update' }, { status: 400 });
      }
      
      const release = updateRelease(input);
      
      if (!release) {
        return json({ error: 'Release not found' }, { status: 404 });
      }
      
      console.log(`[Releases API] Updated release: ${release.id}`);
      
      return json({
        success: true,
        releaseId: release.id,
        release,
      });
    }
    
    // DELETE
    if (method === 'DELETE') {
      const releaseId = body.releaseId;
      
      if (!releaseId) {
        return json({ error: 'Release ID required' }, { status: 400 });
      }
      
      const deleted = deleteRelease(releaseId);
      
      if (!deleted) {
        return json({ error: 'Release not found' }, { status: 404 });
      }
      
      console.log(`[Releases API] Deleted release: ${releaseId}`);
      
      return json({ success: true, deleted: true });
    }
    
    return json({ error: 'Method not allowed' }, { status: 405 });
    
  } catch (error) {
    console.error('[Releases API] Error:', error);
    return json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
