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

import {
  Button,
  Center,
  Container,
  Stack,
  Text,
  ThemeIcon,
  useMantineTheme
} from '@mantine/core';
import { json } from '@remix-run/node';
import { useLoaderData, useSearchParams } from '@remix-run/react';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { useMemo, useCallback } from 'react';
import { listReleases } from '~/.server/services/ReleaseManagement';
import { PageLoader } from '~/components/Common/PageLoader';
import { ReleasesFilter } from '~/components/Releases/ReleasesFilter';
import { ReleasesListHeader } from '~/components/Releases/ReleasesListHeader';
import { ReleasesTabs } from '~/components/Releases/ReleasesTabs';
import {
  BUILD_MODE_FILTERS,
  STAGE_FILTERS,
  STAGE_FILTER_TO_PHASES,
  type BuildModeFilter,
  type StageFilter,
} from '~/constants/release-filters';
import { RELEASE_TABS } from '~/constants/release-tabs';
import { useReleases } from '~/hooks/useReleases';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { determineReleasePhase } from '~/utils/release-process-utils';

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

import type { BackendReleaseResponse as ServiceBackendReleaseResponse } from '~/.server/services/ReleaseManagement';

export type ReleasesListLoaderData = {
  org: string;
  initialReleases: ServiceBackendReleaseResponse[];
  error?: string;
};

export default function ReleasesListPage() {
  const theme = useMantineTheme();
  const { org, initialReleases, error: loaderError } = useLoaderData<ReleasesListLoaderData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || RELEASE_TABS.ACTIVE;
  
  // Get filter values from URL params
  // Handle 'null' string from URL (e.g., ?stage=null) - treat as ALL
  const rawBuildMode = searchParams.get('buildMode');
  const rawStage = searchParams.get('stage');
  const buildMode = (rawBuildMode && rawBuildMode !== 'null' ? rawBuildMode : BUILD_MODE_FILTERS.ALL) as BuildModeFilter;
  const stage = (rawStage && rawStage !== 'null' ? rawStage : STAGE_FILTERS.ALL) as StageFilter;

  // Use React Query with initialData from server-side loader
  // Cast service type to component type (service type is subset, component type has additional fields)
  const {
    upcoming,
    active,
    completed,
    archived,
    isLoading,
    error: queryError,
    invalidateCache,
  } = useReleases(org, {
    initialData: {
      success: true,
      releases: initialReleases as BackendReleaseResponse[],
    },
  });

  // Combine loader error and query error
  const error = loaderError || (queryError instanceof Error ? queryError.message : queryError);

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
          console.log('backend release:', release);
          const allowedPhases = STAGE_FILTER_TO_PHASES[stage];
          const releasePhase = release.releasePhase || determineReleasePhase(release);
          
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
  const filteredArchived = useMemo(() => filterReleases(archived), [archived, filterReleases]);

  const handleTabChange = (value: string | null) => {
    if (value) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', value);
      setSearchParams(newParams);
      invalidateCache();
    }
  };

  const handleBuildModeChange = useCallback((value: BuildModeFilter | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (!value || value === BUILD_MODE_FILTERS.ALL) {
      newParams.delete('buildMode');
    } else {
      newParams.set('buildMode', value);
    }
    
    // If both filters are now "ALL", switch to active tab
    const currentStage = newParams.get('stage') || STAGE_FILTERS.ALL;
    if ((!value || value === BUILD_MODE_FILTERS.ALL) && currentStage === STAGE_FILTERS.ALL) {
      newParams.set('tab', RELEASE_TABS.ACTIVE);
    }
    
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleStageChange = useCallback((value: StageFilter | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (!value || value === STAGE_FILTERS.ALL) {
      newParams.delete('stage');
    } else {
      newParams.set('stage', value);
    }
    
    // If both filters are now "ALL", switch to active tab
    const currentBuildMode = newParams.get('buildMode') || BUILD_MODE_FILTERS.ALL;
    if ((!value || value === STAGE_FILTERS.ALL) && currentBuildMode === BUILD_MODE_FILTERS.ALL) {
      newParams.set('tab', RELEASE_TABS.ACTIVE);
    }
    
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleClearFilters = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    // Keep tab param
    const currentTab = searchParams.get('tab');
    newParams.delete('buildMode');
    newParams.delete('stage');
    if (currentTab) {
      newParams.set('tab', currentTab);
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Only show loader if we don't have initialData and are actually loading
  // With initialData from server, isLoading will be false immediately
  const shouldShowLoader = isLoading && initialReleases.length === 0;

  // Error state - show error UI similar to release config page
  if (error && !shouldShowLoader) {
    return (
      <Container size="xl" py={16}>
        <ReleasesListHeader org={org} />
        
        <Center py={80}>
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" variant="light" color="red">
              <IconAlertCircle size={32} />
            </ThemeIcon>
            <Text size="lg" fw={500} c={theme.colors.slate[7]}>
              Failed to load releases
            </Text>
            <Text size="sm" c={theme.colors.slate[5]} maw={400} ta="center">
              {typeof error === 'string' ? error : 'An error occurred while loading releases. Please try again.'}
            </Text>
            <Button
              variant="light"
              color="brand"
              leftSection={<IconRefresh size={16} />}
              onClick={() => invalidateCache()}
            >
              Try Again
            </Button>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py={16}>
      <ReleasesListHeader org={org} />
      {shouldShowLoader && <PageLoader message="Loading releases..." withContainer={false} />}

      {!shouldShowLoader && (
        <>
          {/* Filters - moved above tabs */}
          <ReleasesFilter
            buildMode={buildMode}
            stage={stage}
            onBuildModeChange={handleBuildModeChange}
            onStageChange={handleStageChange}
            onClearFilters={handleClearFilters}
          />
          
          <ReleasesTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            upcoming={filteredUpcoming}
            active={filteredActive}
            completed={filteredCompleted}
            archived={filteredArchived}
            org={org}
          />
        </>
      )}
    </Container>
  );
}
