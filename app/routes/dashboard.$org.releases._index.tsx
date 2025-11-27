/**
 * Releases List Page
 * Displays all releases in tabs: Upcoming, Active, Completed
 * 
 * Data Flow:
 * - Uses useReleases hook (React Query) for cached data
 * - No refetching on navigation - uses cached data
 * - Filters releases by status for each tab
 * - Displays release cards with backend data
 */

import { useSearchParams, useParams } from '@remix-run/react';
import { Container } from '@mantine/core';
import { useReleases } from '~/hooks/useReleases';
import { PageLoader } from '~/components/Common/PageLoader';
import { PageError } from '~/components/Common/PageError';
import { ReleasesListHeader } from '~/components/Releases/ReleasesListHeader';
import { ReleasesTabs } from '~/components/Releases/ReleasesTabs';
import { RELEASE_TABS } from '~/constants/release-tabs';

export default function ReleasesListPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || RELEASE_TABS.UPCOMING;

  const org = params.org || '';
  const {
    upcoming,
    active,
    completed,
    isLoading,
    error,
    invalidateCache,
  } = useReleases(org);

  const handleTabChange = (value: string | null) => {
    if (value) {
      setSearchParams({ tab: value });
    }
  };

  return (
    <Container size="xl" className="py-8">
      <ReleasesListHeader org={org} />
      {isLoading && <PageLoader message="Loading releases..." withContainer={false} />}
      {error && !isLoading && (
        <PageError error={error} message="Failed to fetch releases" />
      )}

      {!isLoading && (
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
