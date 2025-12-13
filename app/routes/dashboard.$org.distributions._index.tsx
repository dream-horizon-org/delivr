/**
 * Distributions List Page
 * Shows all releases that have been submitted for distribution
 * Fetches data from API - NO HARDCODED DATA
 * 
 * Entry Point 2: Sidebar → Distributions → Select Release → Manage Platforms
 */

import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Pagination,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip
} from '@mantine/core';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData, useNavigation } from '@remix-run/react';
import {
  IconAlertCircle,
  IconBrandAndroid,
  IconBrandApple,
  IconCheck,
  IconClock,
  IconEye,
  IconList,
  IconPlayerPause,
  IconProgress,
  IconRefresh,
  IconSend,
  IconX
} from '@tabler/icons-react';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import { ROLLOUT_COMPLETE_PERCENT } from '~/constants/distribution.constants';
import {
  DistributionStatus,
  Platform,
  SubmissionStatus,
  type DistributionEntry,
  type DistributionStats,
  type PaginationMeta,
  type SubmissionInDistribution,
} from '~/types/distribution.types';
import { authenticateLoaderRequest } from '~/utils/authenticate';

// Types imported from central types file - single source of truth
interface LoaderData {
  org: string;
  distributions: DistributionEntry[];
  stats: DistributionStats;
  pagination: PaginationMeta;
  error?: string;
}

export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { org } = params;

    if (!org) {
      throw new Response('Organization not found', { status: 404 });
    }

    // Extract pagination params from URL
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

    try {
      // Fetch from API with pagination params
      // Backend returns paginated response with distributions + submissions + stats
      const response = await DistributionService.listDistributions(page, pageSize);
      
      // Extract distributions, stats, and pagination from response
      const { distributions, stats, pagination } = response.data.data;
      
      return json<LoaderData>({
        org,
        distributions: distributions as DistributionEntry[],
        stats: stats as DistributionStats,
        pagination: pagination as PaginationMeta,
      });
    } catch (error) {
      console.error('[Distributions] Failed to fetch:', error);
      return json<LoaderData>({
        org,
        distributions: [],
        stats: {
          total: 0,
          rollingOut: 0,
          inReview: 0,
          released: 0,
        },
        pagination: {
          page: 1,
          pageSize: 10,
          totalPages: 0,
          totalItems: 0,
          hasMore: false,
        },
        error: 'Failed to fetch distributions',
      });
    }
  }
);

// Helper functions - derived from API data, not hardcoded
function getStatusColor(status: string): string {
  // Distribution-level statuses (from distribution table)
  if (status === DistributionStatus.PENDING) return 'gray';
  if (status === DistributionStatus.PARTIALLY_RELEASED) return 'blue';
  if (status === DistributionStatus.COMPLETED) return 'green';
  
  // Submission-level statuses (from android_submissions/ios_submissions tables)
  const colors: Record<string, string> = {
    IN_REVIEW: 'yellow',
    APPROVED: 'cyan',
    LIVE: 'green',
    REJECTED: 'red',
    HALTED: 'orange',
  };
  return colors[status] ?? 'gray';
}

function getStatusIcon(status: string) {
  // Distribution-level statuses
  if (status === DistributionStatus.COMPLETED) return <IconCheck size={14} />;
  if (status === DistributionStatus.PARTIALLY_RELEASED) return <IconProgress size={14} />;
  if (status === DistributionStatus.PENDING) return <IconClock size={14} />;
  
  // Submission-level statuses
  switch (status) {
    case 'LIVE':
      return <IconCheck size={14} />;
    case 'APPROVED':
      return <IconCheck size={14} />;
    case 'IN_REVIEW':
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
    <IconBrandAndroid size={24} stroke={2} />
  ) : (
    <IconBrandApple size={24} stroke={2} />
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

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  // Fallback to absolute date for older items
  return formatDate(dateString);
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

// Components
function DistributionStatsCards({ stats }: { stats: DistributionStats }) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total Distributions</Text>
          <ThemeIcon size="sm" variant="light" color="gray" radius="md">
            <IconList size={16} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={700} lh={1}>{stats.total}</Text>
      </Card>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Rolling Out</Text>
          <ThemeIcon size="sm" variant="light" color="blue" radius="md">
            <IconProgress size={16} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={700} c="blue" lh={1}>{stats.rollingOut}</Text>
      </Card>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>In Review</Text>
          <ThemeIcon size="sm" variant="light" color="orange" radius="md">
            <IconClock size={16} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={700} c="orange" lh={1}>{stats.inReview}</Text>
      </Card>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Released</Text>
          <ThemeIcon size="sm" variant="light" color="green" radius="md">
            <IconCheck size={16} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={700} c="green" lh={1}>{stats.released}</Text>
      </Card>
    </SimpleGrid>
  );
}

function SubmissionStatusBadge({ submission }: { submission: SubmissionInDistribution }) {
  const { platform, status, exposurePercent } = submission;
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
      {/* Version */}
      <Table.Td>
        <Badge 
          variant="light" 
          color="dark" 
          size="lg"
          radius="sm"
          className="font-mono"
        >
          {distribution.version}
        </Badge>
      </Table.Td>
      
      {/* Branch */}
      <Table.Td>
        <Text size="sm" c="dimmed">{distribution.branch}</Text>
      </Table.Td>
      
      {/* Platforms */}
      <Table.Td>
        <Group gap="sm">
          {distribution.platforms.map((platform) => {
            const submission = distribution.submissions.find(s => s.platform === platform);
            const platformName = platform === Platform.ANDROID ? 'Android' : 'iOS';
            
            // Platform color is based on the platform, not status
            const platformColor = platform === Platform.ANDROID ? 'green' : 'blue';
            
            if (submission) {
              // Platform has been submitted - show with full color
              const statusIndicator = submission.exposurePercent > 0 
                ? `${formatStatus(submission.status)} (${submission.exposurePercent}%)`
                : formatStatus(submission.status);
              
              return (
                <Tooltip 
                  key={platform} 
                  label={`${platformName}: ${statusIndicator}`}
                  withArrow
                  position="top"
                >
                  <Badge
                    variant="light"
                    color={platformColor}
                    size="xl"
                    radius="sm"
                    style={{ 
                      cursor: 'pointer',
                      padding: '10px 14px'
                    }}
                  >
                    {getPlatformIcon(platform)}
                  </Badge>
                </Tooltip>
              );
            } else {
              // Platform is targeted but not submitted yet - show faded
              return (
                <Tooltip 
                  key={platform} 
                  label={`${platformName}: Not Submitted`}
                  withArrow
                  position="top"
                >
                  <Badge
                    variant="outline"
                    color={platformColor}
                    size="xl"
                    radius="sm"
                    style={{ 
                      cursor: 'pointer',
                      padding: '10px 14px',
                      opacity: 0.4
                    }}
                  >
                    {getPlatformIcon(platform)}
                  </Badge>
                </Tooltip>
              );
            }
          })}
        </Group>
      </Table.Td>
      
      {/* Status */}
      <Table.Td>
        <Badge 
          color={getStatusColor(distribution.status)} 
          variant="dot"
          size="lg"
          radius="sm"
        >
          {formatStatus(distribution.status)}
        </Badge>
      </Table.Td>
      
      {/* Last Updated */}
      <Table.Td>
        <Group gap={6}>
          <IconClock size={14} color="gray" />
          <Text size="sm" fw={500}>{formatRelativeTime(distribution.lastUpdated)}</Text>
        </Group>
      </Table.Td>
      
      {/* Actions */}
      <Table.Td>
        <Group gap="xs">
          {distribution.status === DistributionStatus.PENDING ? (
            <Button
              component={Link}
              to={`/dashboard/${org}/distributions/${distribution.releaseId}`}
              variant="filled"
              color="blue"
              size="sm"
              radius="sm"
              w={100}
              leftSection={<IconSend size={16} />}
            >
              Submit
            </Button>
          ) : (
            <Button
              component={Link}
              to={`/dashboard/${org}/distributions/${distribution.releaseId}`}
              variant="outline"
              color="blue"
              size="sm"
              radius="sm"
              w={100}
              leftSection={<IconEye size={16} />}
            >
              View
            </Button>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

function EmptyDistributions() {
  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Stack align="center" gap="md">
        <ThemeIcon size={60} variant="light" color="gray" radius="xl">
          <IconList size={30} />
        </ThemeIcon>
        <Text size="lg" fw={500}>No Active Distributions</Text>
        <Text size="sm" c="dimmed" ta="center" maw={400}>
          Distributions appear here automatically when a release completes the pre-release phase.
          You can then track rollout progress and manage store submissions.
        </Text>
      </Stack>
    </Paper>
  );
}

export default function DistributionsListPage() {
  const { org, distributions, stats, pagination, error } = useLoaderData<LoaderData>();
  const navigation = useNavigation();
  
  const isLoading = navigation.state === 'loading';

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
          {isLoading && <Loader size="sm" color="blue" />}
        </Group>
      </Paper>

      {/* Error State */}
      {error && (
        <Paper 
          p="md" 
          radius="md" 
          withBorder 
          className="mb-6"
          style={{ 
            backgroundColor: 'var(--mantine-color-red-0)',
            borderColor: 'var(--mantine-color-red-3)'
          }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="sm" align="center" wrap="nowrap">
              <ThemeIcon color="red" size="lg" radius="sm" variant="light">
                <IconAlertCircle size={20} />
              </ThemeIcon>
              <Text size="sm" fw={500} c="red.9">{error}</Text>
            </Group>
            <Button 
              size="sm" 
              variant="filled" 
              color="red" 
              leftSection={<IconRefresh size={16} />}
              onClick={() => window.location.reload()}
              style={{ flexShrink: 0 }}
            >
              Retry
            </Button>
          </Group>
        </Paper>
      )}

      {/* Loading State */}
      {isLoading && distributions.length === 0 && (
        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Stack align="center" gap="md">
            <Loader size="lg" color="blue" />
            <Text size="lg" fw={500}>Loading distributions...</Text>
            <Text size="sm" c="dimmed">Please wait while we fetch your data</Text>
          </Stack>
        </Paper>
      )}

      {/* Stats */}
      {!isLoading && distributions.length > 0 && <DistributionStatsCards stats={stats} />}

      {/* Distributions Table */}
      {!isLoading && distributions.length === 0 && !error ? (
        <EmptyDistributions />
      ) : !isLoading && distributions.length > 0 ? (
        <>
          <Paper shadow="sm" radius="md" withBorder>
            <Table striped highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th><Text size="sm" fw={600} tt="uppercase">Version</Text></Table.Th>
                  <Table.Th><Text size="sm" fw={600} tt="uppercase">Branch</Text></Table.Th>
                  <Table.Th><Text size="sm" fw={600} tt="uppercase">Platforms</Text></Table.Th>
                  <Table.Th><Text size="sm" fw={600} tt="uppercase">Status</Text></Table.Th>
                  <Table.Th><Text size="sm" fw={600} tt="uppercase">Last Updated</Text></Table.Th>
                  <Table.Th w={150}><Text size="sm" fw={600} tt="uppercase">Actions</Text></Table.Th>
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
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Group justify="center" mt="xl">
              <Pagination 
                total={pagination.totalPages} 
                value={pagination.page} 
                onChange={(newPage) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('page', String(newPage));
                  window.location.href = url.toString();
                }}
                color="blue"
              />
              <Text size="sm" c="dimmed">
                Showing {(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems}
              </Text>
            </Group>
          )}
        </>
      ) : null}
    </Container>
  );
}
