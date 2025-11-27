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
export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org: tenantId } = params;

  if (!tenantId) {
    throw new Response('Organization not found', { status: 404 });
  }

  try {
    const userId = user.user.id;
    const result = await listReleases(tenantId, userId, { includeTasks: false });

    if (!result.success) {
      console.error('[ReleasesList] Loader error:', result.error);
      // Return empty array on error - React Query will handle retry
      // This allows page to render with empty state, React Query will refetch
      return json({
        org: tenantId,
        initialReleases: [],
        error: result.error || 'Failed to load releases',
      });
    }

    return json({
      org: tenantId,
      initialReleases: result.releases || [],
    });
  } catch (error: any) {
    console.error('[ReleasesList] Loader error:', error.message);
    // Return empty array on error - React Query will handle retry
    // This allows page to render with empty state, React Query will refetch
    return json({
      org: tenantId,
      initialReleases: [],
      error: error.message || 'Failed to load releases',
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
  const activeTab = searchParams.get('tab') || RELEASE_TABS.UPCOMING;

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
