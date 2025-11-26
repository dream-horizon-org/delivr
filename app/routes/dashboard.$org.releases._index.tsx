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

import { Link, useSearchParams, useParams } from '@remix-run/react';
import { Tabs, Container, Title, Text, Paper, Badge, Group, Stack, Button, Loader } from '@mantine/core';
import { IconCalendar, IconRocket, IconCheck } from '@tabler/icons-react';
import { useReleases } from '~/hooks/useReleases';
import type { BackendReleaseResponse } from '~/.server/services/ReleaseManagement/release-retrieval.service';

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Get status badge color
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'green';
    case 'ARCHIVED':
      return 'gray';
    case 'IN_PROGRESS':
      return 'blue';
    default:
      return 'gray';
  }
}

/**
 * Get type badge color
 */
function getTypeColor(type: string): string {
  switch (type) {
    case 'HOTFIX':
      return 'red';
    case 'UNPLANNED':
      return 'purple';
    case 'PLANNED':
      return 'blue';
    default:
      return 'gray';
  }
}

/**
 * Release Card Component
 */
function ReleaseCard({ release, org }: { release: BackendReleaseResponse; org: string }) {
  return (
    <Link
      to={`/dashboard/${org}/releases/${release.id}`}
      className="block"
    >
      <Paper
        shadow="sm"
        p="md"
        radius="md"
        withBorder
        className="hover:shadow-md transition-shadow cursor-pointer h-full"
      >
        <Stack gap="sm">
          {/* Header */}
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={4} className="mb-1">
                {release.releaseId}
              </Title>
              {release.branch && (
                <Text size="sm" c="dimmed" className="font-mono">
                  {release.branch}
                </Text>
              )}
            </div>
            <Badge color={getStatusColor(release.status)} variant="light">
              {release.status.replace('_', ' ')}
            </Badge>
          </Group>

          {/* Type and Dates */}
          <Group gap="xs">
            <Badge color={getTypeColor(release.type)} size="sm" variant="outline">
              {release.type}
            </Badge>
            {release.targetReleaseDate && (
              <Text size="xs" c="dimmed">
                Target: {formatDate(release.targetReleaseDate)}
              </Text>
            )}
          </Group>

          {/* Platform Targets */}
          {release.platformTargetMappings && release.platformTargetMappings.length > 0 && (
            <Group gap="xs">
              <Text size="xs" c="dimmed">Platforms:</Text>
              {release.platformTargetMappings.map((mapping: any, idx: number) => (
                <Badge key={idx} size="xs" variant="dot">
                  {mapping.platform} → {mapping.target}
                </Badge>
              ))}
            </Group>
          )}

          {/* Dates */}
          <div className="space-y-1">
            {release.kickOffDate && (
              <Text size="xs" c="dimmed">
                Kickoff: {formatDate(release.kickOffDate)}
              </Text>
            )}
            {release.releaseDate && (
              <Text size="xs" c="dimmed">
                Released: {formatDate(release.releaseDate)}
              </Text>
            )}
          </div>

          {/* Footer */}
          <Group justify="space-between" className="mt-auto pt-2 border-t border-gray-200">
            <Text size="xs" c="dimmed">
              Created {formatDate(release.createdAt)}
            </Text>
            {release.tasks && release.tasks.length > 0 && (
              <Text size="xs" c="dimmed">
                {release.tasks.length} task{release.tasks.length !== 1 ? 's' : ''}
              </Text>
            )}
          </Group>
        </Stack>
      </Paper>
    </Link>
  );
}

export default function ReleasesListPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'upcoming';
  
  // Get org from route params
  const org = params.org || '';
  
  // Use cached hook - no refetching on navigation if data is fresh
  const {
    releases,
    upcoming,
    active,
    completed,
    isLoading,
    error,
  } = useReleases(org);
  

  const handleTabChange = (value: string | null) => {
    if (value) {
      setSearchParams({ tab: value });
    }
  };

  return (
    <Container size="xl" className="py-8">
      {/* Header */}
      <div className="mb-8">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1} className="mb-2">Releases</Title>
            <Text size="md" c="dimmed">
              Manage and track your release pipeline
            </Text>
          </div>
          {org && (
            <Link to={`/dashboard/${org}/releases/create`}>
              <Button leftSection={<IconRocket size={16} />}>
                Create Release
              </Button>
            </Link>
          )}
        </Group>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Paper p="xl" withBorder className="text-center">
          <Loader size="md" className="mx-auto" />
          <Text c="dimmed" mt="md">Loading releases...</Text>
        </Paper>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Paper p="md" mb="md" withBorder className="bg-red-50 border-red-200">
          <Text c="red" size="sm">
            Error: {error.message || 'Failed to fetch releases'}
          </Text>
        </Paper>
      )}

      {/* Tabs - Only show if not loading */}
      {!isLoading && (
        <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List className="mb-6">
          <Tabs.Tab
            value="upcoming"
            leftSection={<IconCalendar size={16} />}
          >
            Upcoming ({upcoming.length})
          </Tabs.Tab>
          <Tabs.Tab
            value="active"
            leftSection={<IconRocket size={16} />}
          >
            Active ({active.length})
          </Tabs.Tab>
          <Tabs.Tab
            value="completed"
            leftSection={<IconCheck size={16} />}
          >
            Completed ({completed.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* Upcoming Tab */}
        <Tabs.Panel value="upcoming">
          {upcoming.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map((release) => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  org={release.tenantId}
                />
              ))}
            </div>
          ) : (
            <Paper p="xl" withBorder className="text-center">
              <Text c="dimmed">No upcoming releases</Text>
            </Paper>
          )}
        </Tabs.Panel>

        {/* Active Tab */}
        <Tabs.Panel value="active">
          {active.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {active.map((release) => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  org={release.tenantId}
                />
              ))}
            </div>
          ) : (
            <Paper p="xl" withBorder className="text-center">
              <Text c="dimmed">No active releases</Text>
            </Paper>
          )}
        </Tabs.Panel>

        {/* Completed Tab */}
        <Tabs.Panel value="completed">
          {completed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completed.map((release) => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  org={release.tenantId}
                />
              ))}
            </div>
          ) : (
            <Paper p="xl" withBorder className="text-center">
              <Text c="dimmed">No completed releases</Text>
            </Paper>
          )}
        </Tabs.Panel>
      </Tabs>
      )}
    </Container>
  );
}
