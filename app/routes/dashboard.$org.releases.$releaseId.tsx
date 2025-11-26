/**
 * Release Details Page
 * Shows detailed information about a specific release
 * 
 * Data Flow:
 * - Uses useRelease hook (React Query) for cached data
 * - No refetching on navigation - uses cached data
 * - Displays release details with backend data
 */

import { useParams, Link } from '@remix-run/react';
import { Container, Title, Text, Paper, Badge, Group, Stack, Button, Loader } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useRelease } from '~/hooks/useRelease';
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
    return (
      <Container size="xl" className="py-8">
        <Paper p="xl" withBorder className="text-center">
          <Loader size="md" className="mx-auto" />
          <Text c="dimmed" mt="md">Loading release...</Text>
        </Paper>
      </Container>
    );
  }

  // Error State
  if (error || !release) {
    return (
      <Container size="xl" className="py-8">
        <Paper p="xl" withBorder className="text-center">
          <Title order={2} className="mb-2">Release not found</Title>
          <Text c="dimmed" mb="md">
            {error?.message || 'The release you\'re looking for doesn\'t exist or has been deleted.'}
          </Text>
          <Link to={`/dashboard/${org}/releases`}>
            <Button leftSection={<IconArrowLeft size={16} />} variant="light">
              Back to Releases
            </Button>
          </Link>
        </Paper>
      </Container>
    );
  }

  const tasks = release.tasks || [];
  const builds: any[] = []; // Backend doesn't return builds yet
  const cherryPicks: any[] = []; // Backend doesn't return cherry picks yet

  return (
    <Container size="xl" className="py-8">
      {/* Header */}
      <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
        <Group justify="space-between" align="flex-start">
          <Group>
            <Link to={`/dashboard/${org}/releases`}>
              <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}>
                Back
              </Button>
            </Link>
            <div>
              <Title order={2} className="mb-1">
                {release.releaseId || release.id || 'Unknown Release'}
              </Title>
              {release.branch && (
                <Text size="sm" c="dimmed" className="font-mono">
                  {release.branch}
                </Text>
              )}
            </div>
          </Group>
          
          <Group>
            <Badge color={getStatusColor(release.status)} variant="light" size="lg">
              {release.status.replace('_', ' ')}
            </Badge>
            <Button variant="outline">
              Edit Release
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Overview */}
      <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
        <Title order={3} className="mb-4">Overview</Title>
        
        <Stack gap="md">
          <Group>
            <div style={{ flex: 1 }}>
              <Text size="sm" c="dimmed" className="mb-1">Release Type</Text>
              <Badge color={getTypeColor(release.type)} variant="light">
                {release.type}
              </Badge>
            </div>
            
            {release.kickOffDate && (
              <div style={{ flex: 1 }}>
                <Text size="sm" c="dimmed" className="mb-1">Kick Off Date</Text>
                <Text size="sm">{formatDate(release.kickOffDate)}</Text>
              </div>
            )}
          </Group>

          <Group>
            {release.targetReleaseDate && (
              <div style={{ flex: 1 }}>
                <Text size="sm" c="dimmed" className="mb-1">Target Release Date</Text>
                <Text size="sm">{formatDate(release.targetReleaseDate)}</Text>
              </div>
            )}
            
            {release.releaseDate && (
              <div style={{ flex: 1 }}>
                <Text size="sm" c="dimmed" className="mb-1">Release Date</Text>
                <Text size="sm">{formatDate(release.releaseDate)}</Text>
              </div>
            )}
          </Group>

          <Group>
            {release.branch && (
              <div style={{ flex: 1 }}>
                <Text size="sm" c="dimmed" className="mb-1">Branch</Text>
                <Text size="sm" className="font-mono">{release.branch}</Text>
              </div>
            )}
            
            {release.baseBranch && (
              <div style={{ flex: 1 }}>
                <Text size="sm" c="dimmed" className="mb-1">Base Branch</Text>
                <Text size="sm" className="font-mono">{release.baseBranch}</Text>
              </div>
            )}
          </Group>

          {/* Platform Targets */}
          {release.platformTargetMappings && release.platformTargetMappings.length > 0 && (
            <div>
              <Text size="sm" c="dimmed" className="mb-2">Platform Targets</Text>
              <Group gap="xs">
                {release.platformTargetMappings.map((mapping: any, idx: number) => (
                  <Badge key={idx} size="sm" variant="dot">
                    {mapping.platform} → {mapping.target}
                  </Badge>
                ))}
              </Group>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-2 border-t border-gray-200">
            <Group gap="md">
              <Text size="xs" c="dimmed">
                Created {formatDate(release.createdAt)}
              </Text>
              {release.updatedAt && release.updatedAt !== release.createdAt && (
                <Text size="xs" c="dimmed">
                  Updated {formatDate(release.updatedAt)}
                </Text>
              )}
            </Group>
          </div>
        </Stack>
      </Paper>

      {/* Tasks */}
      <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
        <Title order={3} className="mb-4">Tasks</Title>
        
        {tasks.length === 0 ? (
          <Text size="sm" c="dimmed" className="text-center py-8">No tasks yet</Text>
        ) : (
          <Stack gap="sm">
            {tasks.map((task: any) => (
              <Paper key={task.id} p="sm" withBorder radius="sm">
                <Group justify="space-between">
                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>{task.taskType || task.taskId || 'Unknown Task'}</Text>
                    {task.taskId && (
                      <Text size="xs" c="dimmed" className="font-mono mt-1">
                        {task.taskId}
                      </Text>
                    )}
                  </div>
                  {task.taskStatus && (
                    <Badge 
                      color={
                        task.taskStatus === 'COMPLETED' ? 'green' :
                        task.taskStatus === 'IN_PROGRESS' ? 'yellow' :
                        task.taskStatus === 'FAILED' ? 'red' : 'gray'
                      }
                      variant="light"
                      size="sm"
                    >
                      {task.taskStatus}
                    </Badge>
                  )}
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Builds - Placeholder for future */}
      <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
        <Group justify="space-between" className="mb-4">
          <Title order={3}>Builds</Title>
          <Button size="sm">Trigger Build</Button>
        </Group>
        
        {builds.length === 0 ? (
          <Text size="sm" c="dimmed" className="text-center py-8">No builds yet</Text>
        ) : (
          <div>Builds will be displayed here</div>
        )}
      </Paper>

      {/* Cherry Picks - Placeholder for future */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" className="mb-4">
          <Title order={3}>Cherry Picks</Title>
          <Button size="sm" variant="outline">Request Cherry Pick</Button>
        </Group>
        
        {cherryPicks.length === 0 ? (
          <Text size="sm" c="dimmed" className="text-center py-8">No cherry picks yet</Text>
        ) : (
          <div>Cherry picks will be displayed here</div>
        )}
      </Paper>
    </Container>
  );
}

