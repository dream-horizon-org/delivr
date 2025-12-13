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
import { useReleases } from '~/hooks/useReleases';
import { PageLoader } from '~/components/Common/PageLoader';
import { PageError } from '~/components/Common/PageError';
import { ReleasesListHeader } from '~/components/Releases/ReleasesListHeader';
import { ReleasesTabs } from '~/components/Releases/ReleasesTabs';
import { RELEASE_TABS } from '~/constants/release-tabs';
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

  // Smart default tab selection:
  // 1. If user has explicitly selected a tab via URL, use that
  // 2. If there are active releases, default to "active" tab
  // 3. Otherwise, default to "upcoming" tab
  const hasExplicitTab = searchParams.has('tab');
  const defaultTab = active.length > 0 ? RELEASE_TABS.ACTIVE : RELEASE_TABS.UPCOMING;
  const activeTab = hasExplicitTab ? (searchParams.get('tab') || defaultTab) : defaultTab;

  // Set the smart default tab in URL if no explicit tab is set
  // This ensures the URL reflects the actual tab being displayed
  useEffect(() => {
    if (!hasExplicitTab && !isLoading) {
      setSearchParams({ tab: defaultTab }, { replace: true });
    }
  }, [hasExplicitTab, defaultTab, isLoading, setSearchParams]);

  // Clean up refresh parameter from URL after data is loaded
  // This prevents the parameter from sticking around in the URL
  useEffect(() => {
    if (searchParams.has('refresh') && !isLoading) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('refresh');
      // Keep tab parameter if it exists
      if (activeTab) {
        newParams.set('tab', activeTab);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, isLoading, activeTab, setSearchParams]);

  const handleTabChange = (value: string | null) => {
    if (value) {
      setSearchParams({ tab: value });
    }
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
          upcoming={upcoming}
          active={active}
          completed={completed}
          org={org}
        />
      )}
    </Container>
  );
}
