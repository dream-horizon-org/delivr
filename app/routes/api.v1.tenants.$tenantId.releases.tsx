/**
 * Releases API Route
 * 
 * Forwards release creation requests directly to backend API.
 * No transformation - UI sends backend-compatible format.
 * 
 * This route is kept for backward compatibility but should be deprecated
 * in favor of direct backend calls from the service layer.
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import {
  getAllReleases,
  getRelease,
  updateRelease,
  deleteRelease,
  getReleaseStats,
  getUpcomingReleases,
  getReleaseAnalytics,
  seedMockReleases,
} from '~/.server/stores/release-store';
import type { UpdateReleaseInput, ReleaseFilters } from '~/types/release';

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
    const limit = parseInt(recentParam, 10);
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
    filters.status = statusParam.split(',') as string[];
  }

  const releaseTypeParam = url.searchParams.get('releaseType');
  if (releaseTypeParam) {
    filters.releaseType = releaseTypeParam.split(',') as string[];
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
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
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
 * 
 * DEPRECATED: This route is kept for backward compatibility.
 * New code should use the release-creation.service.ts which calls backend directly.
 * 
 * This route now just returns an error directing to use the service layer.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const { tenantId } = params;

  if (!tenantId) {
    return json({ error: 'Tenant ID required' }, { status: 400 });
  }

  try {
    const method = request.method;

    // CREATE - Deprecated, use service layer instead
    if (method === 'POST') {
      return json(
        {
          error:
            'This endpoint is deprecated. Please use the release-creation.service.ts service layer which calls the backend API directly.',
          message:
            'Release creation should be done through the service layer, not this BFF route.',
        },
        { status: 410 } // 410 Gone - indicates resource is no longer available
      );
    }

    // UPDATE
    if (method === 'PUT') {
      const body = await request.json();
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
      const body = await request.json();
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
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
