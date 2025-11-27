/**
 * Release Details Page
 * Shows detailed information about a specific release
 * 
 * Data Flow:
 * - Uses useRelease hook (React Query) for cached data
 * - No refetching on navigation - uses cached data
 * - Displays release details with backend data
 */

import { useParams } from '@remix-run/react';
import { Container } from '@mantine/core';
import { useRelease } from '~/hooks/useRelease';
import { ReleaseDetailsHeader } from '~/components/Releases/ReleaseDetailsHeader';
import { ReleaseDetailsOverview } from '~/components/Releases/ReleaseDetailsOverview';
import { ReleaseTasksList } from '~/components/Releases/ReleaseTasksList';
import { ReleaseBuildsSection } from '~/components/Releases/ReleaseBuildsSection';
import { ReleaseCherryPicksSection } from '~/components/Releases/ReleaseCherryPicksSection';
import { ReleaseNotFound } from '~/components/Releases/ReleaseNotFound';
import { PageLoader } from '~/components/Common/PageLoader';

export default function ReleaseDetailsPage() {
  const params = useParams();
  const org = params.org || '';
  const releaseId = params.releaseId || '';

  // Use cached hook - no refetching on navigation if data is fresh
  const {
    release,
    isLoading,
    error,
  } = useRelease(org, releaseId);

  // Loading State
  if (isLoading) {
    return <PageLoader message="Loading release..." />;
  }

  // Error State
  if (error || !release) {
    return <ReleaseNotFound org={org} error={error} />;
  }

  const tasks = release.tasks || [];
  const builds: any[] = []; // Backend doesn't return builds yet
  const cherryPicks: any[] = []; // Backend doesn't return cherry picks yet

  return (
    <Container size="xl" className="py-8">
      <ReleaseDetailsHeader release={release} org={org} />
      <ReleaseDetailsOverview release={release} />
      <ReleaseTasksList tasks={tasks} />
      <ReleaseBuildsSection builds={builds} />
      <ReleaseCherryPicksSection cherryPicks={cherryPicks} />
    </Container>
  );
}

