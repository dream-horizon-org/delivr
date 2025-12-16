/**
 * Releases List Page
 * Displays all releases in tabs: Upcoming, Active, Completed
 * 
 * Data Flow:
 * - Server-side loader fetches initial releases
 * - useReleases hook uses initialData from loader for fast first load
 * - React Query caches data for fast navigation
 * - Filters releases by status for each tab
 * - Displays release cards with backend data
 */

import { useEffect } from 'react';
import { json } from '@remix-run/node';
import { useLoaderData, useSearchParams, useParams } from '@remix-run/react';
import { Container } from '@mantine/core';
import { useMemo } from 'react';
import { useReleases } from '~/hooks/useReleases';
import { PageLoader } from '~/components/Common/PageLoader';
import { PageError } from '~/components/Common/PageError';
import { ReleasesListHeader } from '~/components/Releases/ReleasesListHeader';
import { ReleasesFilter } from '~/components/Releases/ReleasesFilter';
import { ReleasesTabs } from '~/components/Releases/ReleasesTabs';
import { RELEASE_TABS } from '~/constants/release-tabs';
import {
  BUILD_MODE_FILTERS,
  STAGE_FILTERS,
  STAGE_FILTER_TO_PHASES,
  type BuildModeFilter,
  type StageFilter,
} from '~/constants/release-filters';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { listReleases } from '~/.server/services/ReleaseManagement';
import type { BackendReleaseResponse } from '~/.server/services/ReleaseManagement';

/**
 * Server-side loader to fetch initial releases
 * Provides data for fast first load, React Query handles caching
 */
export const loader = authenticateLoaderRequest(async ({ params, user, request }) => {
  const { org: tenantId } = params;

  if (!tenantId) {
    throw new Response('Organization not found', { status: 404 });
  }

  try {
    const userId = user.user.id;
    
    // Check if this is a fresh request after creating/updating a release
    const url = new URL(request.url);
    const hasRefreshParam = url.searchParams.has('refresh');
    
    const result = await listReleases(tenantId, userId, { includeTasks: false });

    if (!result.success) {
      console.error('[ReleasesList] Loader error:', result.error);
      // Return empty array on error - React Query will handle retry
      // This allows page to render with empty state, React Query will refetch
      return json({
        org: tenantId,
        initialReleases: [],
        error: result.error || 'Failed to load releases',
      }, {
        headers: {
          'Cache-Control': 'no-cache', // Don't cache errors
        },
      });
    }

    return json({
      org: tenantId,
      initialReleases: result.releases || [],
    }, {
      headers: {
        // If refresh param is present (after create/update), don't cache
        // Otherwise, cache for 30 seconds (reduced from 2 minutes for fresher data)
        'Cache-Control': hasRefreshParam 
          ? 'no-cache, no-store, must-revalidate' 
          : 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('[ReleasesList] Loader error:', error.message);
    // Return empty array on error - React Query will handle retry
    // This allows page to render with empty state, React Query will refetch
    return json({
      org: tenantId,
      initialReleases: [],
      error: error.message || 'Failed to load releases',
    }, {
      headers: {
        'Cache-Control': 'no-cache', // Don't cache errors
      },
    });
  }
});

export type ReleasesListLoaderData = {
  org: string;
  initialReleases: BackendReleaseResponse[];
  error?: string;
};

export default function ReleasesListPage() {
  const { org, initialReleases } = useLoaderData<ReleasesListLoaderData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || RELEASE_TABS.ACTIVE;
  
  // Get filter values from URL params
  const buildMode = (searchParams.get('buildMode') || BUILD_MODE_FILTERS.ALL) as BuildModeFilter;
  const stage = (searchParams.get('stage') || STAGE_FILTERS.ALL) as StageFilter;

  // Use React Query with initialData from server-side loader
  const {
    upcoming,
    active,
    completed,
    isLoading,
    error,
    invalidateCache,
  } = useReleases(org, {
    initialData: {
      success: true,
      releases: initialReleases,
    },
  });

  // Filter function
  const filterReleases = useMemo(() => {
    return (releases: BackendReleaseResponse[]): BackendReleaseResponse[] => {
      return releases.filter((release) => {
        // Filter by build mode
        if (buildMode !== BUILD_MODE_FILTERS.ALL) {
          const isManual = release.hasManualBuildUpload;
          if (buildMode === BUILD_MODE_FILTERS.MANUAL && !isManual) {
            return false;
          }
          if (buildMode === BUILD_MODE_FILTERS.CI_CD && isManual) {
            return false;
          }
        }

        // Filter by stage
        if (stage !== STAGE_FILTERS.ALL) {
          const allowedPhases = STAGE_FILTER_TO_PHASES[stage];
          const releasePhase = release.releasePhase;
          
          if (!releasePhase) {
            return false; // No phase means not started, exclude unless ALL
          }
          
          if (allowedPhases.length > 0 && !allowedPhases.includes(releasePhase)) {
            return false;
          }
        }

        return true;
      });
    };
  }, [buildMode, stage]);

  // Apply filters to releases
  const filteredUpcoming = useMemo(() => filterReleases(upcoming), [upcoming, filterReleases]);
  const filteredActive = useMemo(() => filterReleases(active), [active, filterReleases]);
  const filteredCompleted = useMemo(() => filterReleases(completed), [completed, filterReleases]);

  const handleTabChange = (value: string | null) => {
    if (value) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', value);
      setSearchParams(newParams);
    }
  };

  const handleBuildModeChange = (value: BuildModeFilter) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === BUILD_MODE_FILTERS.ALL) {
      newParams.delete('buildMode');
    } else {
      newParams.set('buildMode', value);
    }
    
    // If both filters are now "ALL", switch to active tab
    const currentStage = newParams.get('stage') || STAGE_FILTERS.ALL;
    if (value === BUILD_MODE_FILTERS.ALL && currentStage === STAGE_FILTERS.ALL) {
      newParams.set('tab', RELEASE_TABS.ACTIVE);
    }
    
    setSearchParams(newParams);
  };

  const handleStageChange = (value: StageFilter) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === STAGE_FILTERS.ALL) {
      newParams.delete('stage');
    } else {
      newParams.set('stage', value);
    }
    
    // If both filters are now "ALL", switch to active tab
    const currentBuildMode = newParams.get('buildMode') || BUILD_MODE_FILTERS.ALL;
    if (value === STAGE_FILTERS.ALL && currentBuildMode === BUILD_MODE_FILTERS.ALL) {
      newParams.set('tab', RELEASE_TABS.ACTIVE);
    }
    
    setSearchParams(newParams);
  };

  // Only show loader if we don't have initialData and are actually loading
  // With initialData from server, isLoading will be false immediately
  const shouldShowLoader = isLoading && initialReleases.length === 0;

  return (
    <Container size="xl" className="py-8">
      <ReleasesListHeader org={org} />
      {shouldShowLoader && <PageLoader message="Loading releases..." withContainer={false} />}
      {error && !shouldShowLoader && (
        <PageError error={error} message="Failed to fetch releases" />
      )}

      {!shouldShowLoader && (
        <ReleasesTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          upcoming={filteredUpcoming}
          active={filteredActive}
          completed={filteredCompleted}
          org={org}
          leftSection={
            <ReleasesFilter
              buildMode={buildMode}
              stage={stage}
              onBuildModeChange={handleBuildModeChange}
              onStageChange={handleStageChange}
            />
          }
        />
      )}
    </Container>
  );
}
