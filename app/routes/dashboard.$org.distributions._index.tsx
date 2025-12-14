/**
 * Distributions List Page
 * Shows all releases that have been submitted for distribution
 * Fetches data from API - NO HARDCODED DATA
 * 
 * Entry Point 2: Sidebar → Distributions → Select Release → Manage Platforms
 */

import {
  Button,
  Container,
  Group,
  Loader,
  Modal,
  Pagination,
  Paper,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigation, useRevalidator } from '@remix-run/react';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import { DistributionListRow } from '~/components/distribution/DistributionListRow';
import { DistributionStatsCards } from '~/components/distribution/DistributionStatsCards';
import { EmptyDistributions } from '~/components/distribution/EmptyDistributions';
import { SubmitToStoresForm } from '~/components/distribution/SubmitToStoresForm';
import {
  DISTRIBUTIONS_LIST_ICON_SIZES,
  DISTRIBUTIONS_LIST_LAYOUT,
  DISTRIBUTIONS_LIST_UI,
} from '~/constants/distribution.constants';
import { useSubmitModalProps } from '~/hooks/useSubmitModalProps';
import {
  type DistributionEntry,
  type DistributionStats,
  type PaginationMeta,
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
      const response = await DistributionService.listDistributions(
        page,
        pageSize
      );

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

export default function DistributionsListPage() {
  const { org, distributions, stats, pagination, error } =
    useLoaderData<LoaderData>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedDistribution, setSelectedDistribution] =
    useState<DistributionEntry | null>(null);

  // Extract complex modal props logic to custom hook
  const submitModalProps = useSubmitModalProps(selectedDistribution);

  const isLoading = navigation.state === 'loading';
  const hasDistributions = distributions.length > 0;
  const hasMultiplePages = pagination.totalPages > 1;

  // Handler functions - extracted from inline JSX
  const handleOpenSubmitModal = useCallback((distribution: DistributionEntry) => {
    setSelectedDistribution(distribution);
    setSubmitModalOpen(true);
  }, []);

  const handleCloseSubmitModal = useCallback(() => {
    setSubmitModalOpen(false);
    setSelectedDistribution(null);
  }, []);

  const handleSubmitComplete = useCallback(() => {
    handleCloseSubmitModal();
    revalidator.revalidate(); // Refresh the list
  }, [handleCloseSubmitModal, revalidator]);

  const handlePageChange = useCallback((newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(newPage));
    window.location.href = url.toString();
  }, []);

  const handleRetryLoad = useCallback(() => {
    window.location.reload();
  }, []);

  // Pagination display text
  const paginationText = DISTRIBUTIONS_LIST_UI.PAGINATION_TEXT(
    (pagination.page - 1) * pagination.pageSize + 1,
    Math.min(pagination.page * pagination.pageSize, pagination.totalItems),
    pagination.totalItems
  );

  return (
    <Container size="xl" className="py-8">
      {/* Header */}
      <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>{DISTRIBUTIONS_LIST_UI.PAGE_TITLE}</Title>
            <Text size="sm" c="dimmed">
              {DISTRIBUTIONS_LIST_UI.PAGE_SUBTITLE}
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
            borderColor: 'var(--mantine-color-red-3)',
          }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="sm" align="center" wrap="nowrap">
              <ThemeIcon color="red" size="lg" radius="sm" variant="light">
                <IconAlertCircle
                  size={DISTRIBUTIONS_LIST_ICON_SIZES.ALERT_ICON}
                />
              </ThemeIcon>
              <Text size="sm" fw={500} c="red.9">
                {error}
              </Text>
            </Group>
            <Button
              size="sm"
              variant="filled"
              color="red"
              leftSection={
                <IconRefresh size={DISTRIBUTIONS_LIST_ICON_SIZES.ACTION_BUTTON} />
              }
              onClick={handleRetryLoad}
              style={{ flexShrink: 0 }}
            >
              {DISTRIBUTIONS_LIST_UI.RETRY_BUTTON}
            </Button>
          </Group>
        </Paper>
      )}

      {/* Loading State */}
      {isLoading && !hasDistributions && (
        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Stack align="center" gap="md">
            <Loader size="lg" color="blue" />
            <Text size="lg" fw={500}>
              {DISTRIBUTIONS_LIST_UI.LOADING_TITLE}
            </Text>
            <Text size="sm" c="dimmed">
              {DISTRIBUTIONS_LIST_UI.LOADING_MESSAGE}
            </Text>
          </Stack>
        </Paper>
      )}

      {/* Stats */}
      {!isLoading && hasDistributions && <DistributionStatsCards stats={stats} />}

      {/* Distributions Table */}
      {!isLoading && !hasDistributions && !error ? (
        <EmptyDistributions />
      ) : !isLoading && hasDistributions ? (
        <>
          <Paper shadow="sm" radius="md" withBorder>
            <Table
              striped
              highlightOnHover
              verticalSpacing="md"
              horizontalSpacing="lg"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <Text size="sm" fw={600} tt="uppercase">
                      {DISTRIBUTIONS_LIST_UI.TABLE_HEADERS.VERSION}
                    </Text>
                  </Table.Th>
                  <Table.Th>
                    <Text size="sm" fw={600} tt="uppercase">
                      {DISTRIBUTIONS_LIST_UI.TABLE_HEADERS.BRANCH}
                    </Text>
                  </Table.Th>
                  <Table.Th>
                    <Text size="sm" fw={600} tt="uppercase">
                      {DISTRIBUTIONS_LIST_UI.TABLE_HEADERS.PLATFORMS}
                    </Text>
                  </Table.Th>
                  <Table.Th>
                    <Text size="sm" fw={600} tt="uppercase">
                      {DISTRIBUTIONS_LIST_UI.TABLE_HEADERS.STATUS}
                    </Text>
                  </Table.Th>
                  <Table.Th>
                    <Text size="sm" fw={600} tt="uppercase">
                      {DISTRIBUTIONS_LIST_UI.TABLE_HEADERS.LAST_UPDATED}
                    </Text>
                  </Table.Th>
                  <Table.Th w={DISTRIBUTIONS_LIST_LAYOUT.ACTIONS_COLUMN_WIDTH}>
                    <Text size="sm" fw={600} tt="uppercase">
                      {DISTRIBUTIONS_LIST_UI.TABLE_HEADERS.ACTIONS}
                    </Text>
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {distributions.map((distribution) => (
                  <DistributionListRow
                    key={distribution.releaseId}
                    distribution={distribution}
                    org={org}
                    onSubmitClick={handleOpenSubmitModal}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </Paper>

          {/* Pagination */}
          {hasMultiplePages && (
            <Group justify="center" mt="xl">
              <Pagination
                total={pagination.totalPages}
                value={pagination.page}
                onChange={handlePageChange}
                color="blue"
              />
              <Text size="sm" c="dimmed">
                {paginationText}
              </Text>
            </Group>
          )}
        </>
      ) : null}

      {/* Submit to Stores Modal */}
      <Modal
        opened={submitModalOpen}
        onClose={handleCloseSubmitModal}
        title={DISTRIBUTIONS_LIST_UI.MODAL_TITLE}
        size="lg"
        centered
      >
        {selectedDistribution && submitModalProps && (
          <SubmitToStoresForm
            releaseId={selectedDistribution.releaseId}
            distributionId={selectedDistribution.id}
            submissions={selectedDistribution.submissions}
            hasAndroidActiveRollout={false}
            onSubmitComplete={handleSubmitComplete}
            onClose={handleCloseSubmitModal}
            isFirstSubmission={submitModalProps.isFirstSubmission}
            androidArtifact={submitModalProps.androidArtifact}
            iosArtifact={submitModalProps.iosArtifact}
            isResubmission={submitModalProps.isResubmission}
          />
        )}
      </Modal>
    </Container>
  );
}

