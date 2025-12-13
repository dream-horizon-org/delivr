/**
 * Distributions List Page
 * Shows all releases that have been submitted for distribution
 * Fetches data from API - NO HARDCODED DATA
 * 
 * Entry Point 2: Sidebar → Distributions → Select Release → Manage Platforms
 */

import {
  ActionIcon,
  Badge,
  Card,
  Container,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import {
  IconBrandAndroid,
  IconBrandApple,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconPlayerPause,
  IconRocket,
  IconX,
} from '@tabler/icons-react';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import { ROLLOUT_COMPLETE_PERCENT } from '~/constants/distribution.constants';
import { Platform, DistributionReleaseStatus, SubmissionStatus } from '~/types/distribution.types';
import { authenticateLoaderRequest } from '~/utils/authenticate';

// Types - should match API response
interface PlatformStatus {
  platform: Platform;
  status: string;
  exposurePercent: number;
  submissionId?: string;
}

interface DistributionEntry {
  releaseId: string;
  version: string;
  branch: string;
  status: string;
  platforms: PlatformStatus[];
  submittedAt: string | null;
  lastUpdated: string;
}

interface LoaderData {
  org: string;
  distributions: DistributionEntry[];
  error?: string;
}

export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { org } = params;

    if (!org) {
      throw new Response('Organization not found', { status: 404 });
    }

    try {
      // Fetch from API (mock or real backend based on config)
      const response = await DistributionService.listDistributions();
      
      // Type assertion - API response is validated by backend
      const distributions = response.data.data.distributions as DistributionEntry[];
      
      return json<LoaderData>({
        org,
        distributions,
      });
    } catch (error) {
      console.error('[Distributions] Failed to fetch:', error);
      return json<LoaderData>({
        org,
        distributions: [],
        error: 'Failed to fetch distributions',
      });
    }
  }
);

// Helper functions - derived from API data, not hardcoded
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'gray',
    IN_REVIEW: 'yellow',
    IN_PROGRESS: 'blue',
    APPROVED: 'cyan',
    LIVE: 'green',
    REJECTED: 'red',
    HALTED: 'orange',
    PRE_RELEASE: 'gray',
    READY_FOR_SUBMISSION: 'cyan',
    COMPLETED: 'green',
  };
  return colors[status] ?? 'gray';
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'COMPLETED':
    case 'LIVE':
      return <IconCheck size={14} />;
    case 'APPROVED':
      return <IconRocket size={14} />;
    case 'IN_REVIEW':
    case 'PENDING':
    case 'PRE_RELEASE':
    case 'READY_FOR_SUBMISSION':
      return <IconClock size={14} />;
    case 'REJECTED':
      return <IconX size={14} />;
    case 'HALTED':
      return <IconPlayerPause size={14} />;
    default:
      return <IconClock size={14} />;
  }
}

function getPlatformIcon(platform: Platform) {
  return platform === Platform.ANDROID ? (
    <IconBrandAndroid size={16} />
  ) : (
    <IconBrandApple size={16} />
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

// Components
function DistributionStats({ distributions }: { distributions: DistributionEntry[] }) {
  const stats = {
    total: distributions.length,
    rollingOut: distributions.filter(d => 
      d.status === DistributionReleaseStatus.READY_FOR_SUBMISSION || d.platforms.some(p => p.status === SubmissionStatus.LIVE && p.exposurePercent < ROLLOUT_COMPLETE_PERCENT)
    ).length,
    inReview: distributions.filter(d => 
      d.status === DistributionReleaseStatus.READY_FOR_SUBMISSION ||
      d.platforms.some(p => p.status === SubmissionStatus.IN_REVIEW)
    ).length,
    released: distributions.filter(d => d.status === DistributionReleaseStatus.COMPLETED).length,
  };

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Text size="sm" c="dimmed">Total Distributions</Text>
        <Text size="xl" fw={700}>{stats.total}</Text>
      </Card>
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Text size="sm" c="dimmed">Rolling Out</Text>
        <Text size="xl" fw={700} c="indigo">{stats.rollingOut}</Text>
      </Card>
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Text size="sm" c="dimmed">In Review</Text>
        <Text size="xl" fw={700} c="blue">{stats.inReview}</Text>
      </Card>
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Text size="sm" c="dimmed">Released</Text>
        <Text size="xl" fw={700} c="green">{stats.released}</Text>
      </Card>
    </SimpleGrid>
  );
}

function PlatformStatusBadge({ platformStatus }: { platformStatus: PlatformStatus }) {
  const { platform, status, exposurePercent } = platformStatus;
  const isRollingOut = status === SubmissionStatus.LIVE && exposurePercent < ROLLOUT_COMPLETE_PERCENT;

  return (
    <Group gap="xs">
      <ThemeIcon size="sm" variant="light" color={getStatusColor(status)}>
        {getPlatformIcon(platform)}
      </ThemeIcon>
      <Stack gap={2}>
        <Group gap={4}>
          <Badge size="xs" color={getStatusColor(status)} variant="light">
            {formatStatus(status)}
          </Badge>
          {isRollingOut && (
            <Text size="xs" c="dimmed">{exposurePercent}%</Text>
          )}
        </Group>
        {isRollingOut && (
          <Progress value={exposurePercent} size="xs" color="indigo" w={60} />
        )}
      </Stack>
    </Group>
  );
}

function DistributionRow({ distribution, org }: { distribution: DistributionEntry; org: string }) {
  return (
    <Table.Tr>
      <Table.Td>
        <Group gap="sm">
          <ThemeIcon size="md" variant="light" color="grape">
            <IconRocket size={16} />
          </ThemeIcon>
          <div>
            <Text fw={500} className="font-mono">{distribution.version}</Text>
            <Text size="xs" c="dimmed">{distribution.branch}</Text>
          </div>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge 
          color={getStatusColor(distribution.status)} 
          variant="light" 
          leftSection={getStatusIcon(distribution.status)}
        >
          {formatStatus(distribution.status)}
        </Badge>
      </Table.Td>
      <Table.Td>
        {distribution.platforms.length > 0 ? (
          <Stack gap="xs">
            {distribution.platforms.map((p) => (
              <PlatformStatusBadge key={p.platform} platformStatus={p} />
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">No submissions yet</Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatDate(distribution.submittedAt)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatDate(distribution.lastUpdated)}</Text>
      </Table.Td>
      <Table.Td>
        <Tooltip label="Open Distribution Management">
          <ActionIcon
            component={Link}
            to={`/dashboard/${org}/distributions/${distribution.releaseId}`}
            variant="light"
            color="grape"
          >
            <IconExternalLink size={16} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  );
}

function EmptyDistributions() {
  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Stack align="center" gap="md">
        <ThemeIcon size={60} variant="light" color="gray" radius="xl">
          <IconRocket size={30} />
        </ThemeIcon>
        <Text size="lg" fw={500}>No Active Distributions</Text>
        <Text size="sm" c="dimmed" ta="center" maw={400}>
          When you submit a release for distribution, it will appear here.
          You can track rollout progress and manage store submissions.
        </Text>
      </Stack>
    </Paper>
  );
}

export default function DistributionsListPage() {
  const { org, distributions, error } = useLoaderData<LoaderData>();

  return (
    <Container size="xl" className="py-8">
      {/* Header */}
      <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>Distributions</Title>
            <Text size="sm" c="dimmed">
              Manage store submissions and rollouts across all releases
            </Text>
          </div>
          <ThemeIcon size={48} variant="light" color="grape" radius="md">
            <IconRocket size={28} />
          </ThemeIcon>
        </Group>
      </Paper>

      {/* Error State */}
      {error && (
        <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6" bg="red.0">
          <Text c="red">{error}</Text>
        </Paper>
      )}

      {/* Stats */}
      {distributions.length > 0 && <DistributionStats distributions={distributions} />}

      {/* Distributions Table */}
      {distributions.length === 0 ? (
        <EmptyDistributions />
      ) : (
        <Paper shadow="sm" radius="md" withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Release</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Platforms</Table.Th>
                <Table.Th>Submitted</Table.Th>
                <Table.Th>Last Updated</Table.Th>
                <Table.Th w={60}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {distributions.map((distribution) => (
                <DistributionRow
                  key={distribution.releaseId}
                  distribution={distribution}
                  org={org}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Container>
  );
}
