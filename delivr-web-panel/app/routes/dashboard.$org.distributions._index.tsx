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
  Container,
  Group,
  Loader,
  Modal,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Tooltip
} from '@mantine/core';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, useNavigation, useRevalidator, useSearchParams } from '@remix-run/react';
import { IconFilter, IconFilterOff, IconSend } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import type { User } from '~/.server/services/Auth/auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import { DistributionListRow } from '~/components/distribution/DistributionListRow';
import { DistributionStatsCard } from '~/components/distribution/DistributionStatsCard';
import { EmptyDistributions } from '~/components/distribution/EmptyDistributions';
import { ErrorState, StaleDataWarning } from '~/components/distribution/ErrorRecovery';
import { SubmitToStoresForm } from '~/components/distribution/SubmitToStoresForm';
import { PageHeader } from '~/components/Common/PageHeader';
import { BackToReleasesButton } from '~/components/Common/BackToReleasesButton';
import {
  DISTRIBUTION_STATUS_FILTER_OPTIONS,
  DISTRIBUTIONS_LIST_LAYOUT,
  DISTRIBUTIONS_LIST_UI,
  PLATFORM_FILTER_OPTIONS,
} from '~/constants/distribution/distribution.constants';
import { useSubmitModalProps } from '~/hooks/distribution';
import type {
  ActiveDistributionFilters,
  DistributionEntry,
  DistributionStats,
  PaginationMeta,
} from '~/types/distribution/distribution.types';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { checkStaleData, ErrorCategory, type AppError } from '~/utils/error-handling';

// Loader data interface
interface LoaderData {
  org: string;
  distributions: DistributionEntry[];
  stats: DistributionStats;
  pagination: PaginationMeta;
  loadedAt: string;
  filters: ActiveDistributionFilters;
  error?: AppError | string;
}

export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { org } = params;

    if (!org) {
      throw new Response('Organization not found', { status: 404 });
    }

    // Extract pagination and filter params from URL
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    
    // Extract filter params
    const status = url.searchParams.get('status') ?? null;
    const platform = url.searchParams.get('platform') ?? null;

    try {
      // Fetch from API with pagination and filter params
      // Backend returns paginated response with distributions + submissions + stats
      // org is the appId in this context
      const response = await DistributionService.listDistributions(
        org,  // appId
        page,
        pageSize,
        status,
        platform
      );
      
      // Extract distributions, stats, and pagination from response
      const { distributions, stats, pagination } = response.data.data;

      return json<LoaderData>({
        org,
        distributions: distributions as DistributionEntry[],
        stats: stats as DistributionStats,
        pagination: pagination as PaginationMeta,
        loadedAt: new Date().toISOString(),
        filters: {
          status: status || null,
          platform: platform || null,
        },
      });
    } catch (error: any) {
      // ✅ SPECIAL CASE: Treat 404 as empty state (no distributions yet)
      // This happens when backend returns "No Distribution exists for this tenant"
      // which is actually a valid empty state, not an error
      const is404 = error?.response?.status === 404;
      
      if (is404) {
        return json<LoaderData>({
          org,
          distributions: [],
          stats: {
            totalDistributions: 0,
            totalSubmissions: 0,
            inReviewSubmissions: 0,
            releasedSubmissions: 0,
          },
          pagination: {
            page: 1,
            pageSize: 10,
            totalPages: 0,
            totalItems: 0,
            hasMore: false,
          },
          loadedAt: new Date().toISOString(),
          filters: {
            status: status || null,
            platform: platform || null,
          },
          // No error property - this is a valid empty state
        });
      }
      
      // For other errors, show error state
      const appError: AppError = {
        category: ErrorCategory.NETWORK,
        code: 'FETCH_FAILED',
        message: error?.response?.data?.message || error?.message || 'Request failed with status code 500',
        userMessage: 'Failed to load distributions',
        recoveryGuidance: 'Check your internet connection and try again. If the problem persists, the server may be experiencing issues.',
        retryable: true,
      };
      
      return json<LoaderData>({
        org,
        distributions: [],
        stats: {
          totalDistributions: 0,
          totalSubmissions: 0,
          inReviewSubmissions: 0,
          releasedSubmissions: 0,
        },
        pagination: {
          page: 1,
          pageSize: 10,
          totalPages: 0,
          totalItems: 0,
          hasMore: false,
        },
        loadedAt: new Date().toISOString(),
        filters: {
          status: status || null,
          platform: platform || null,
        },
        error: appError,
      });
    }
  }
);

export default function DistributionsListPage() {
  const { org, distributions, stats, pagination, loadedAt, filters, error } =
    useLoaderData<LoaderData>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check if data is stale
  const staleInfo = loadedAt ? checkStaleData(new Date(loadedAt)) : null;

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedDistribution, setSelectedDistribution] =
    useState<DistributionEntry | null>(null);

  // Extract complex modal props logic to custom hook
  const submitModalProps = useSubmitModalProps(selectedDistribution);

  const isLoading = navigation.state === 'loading';
  const hasDistributions = distributions.length > 0;
  const hasMultiplePages = pagination.totalPages > 1;
  const hasActiveFilters = filters.status !== null || filters.platform !== null;
  const activeFilterCount = [filters.status, filters.platform].filter(Boolean).length;

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
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', String(newPage));
    navigate(`?${newSearchParams.toString()}`, { replace: false });
  }, [navigate, searchParams]);

  const handleRetryLoad = useCallback(() => {
    revalidator.revalidate();
  }, [revalidator]);

  // Filter handlers
  const handleStatusChange = useCallback((value: string | null) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set('status', value);
    } else {
      newSearchParams.delete('status');
    }
    newSearchParams.set('page', '1'); // Reset to first page when filtering
    navigate(`?${newSearchParams.toString()}`, { replace: false });
  }, [navigate, searchParams]);

  const handlePlatformChange = useCallback((value: string | null) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set('platform', value);
    } else {
      newSearchParams.delete('platform');
    }
    newSearchParams.set('page', '1'); // Reset to first page when filtering
    navigate(`?${newSearchParams.toString()}`, { replace: false });
  }, [navigate, searchParams]);

  const handleClearFilters = useCallback(() => {
    const newSearchParams = new URLSearchParams();
    // Keep pagination params
    if (searchParams.get('pageSize')) {
      newSearchParams.set('pageSize', searchParams.get('pageSize')!);
    }
    navigate(`?${newSearchParams.toString()}`, { replace: false });
  }, [navigate, searchParams]);

  // Pagination display text
  const paginationText = DISTRIBUTIONS_LIST_UI.PAGINATION_TEXT(
    (pagination.page - 1) * pagination.pageSize + 1,
    Math.min(pagination.page * pagination.pageSize, pagination.totalItems),
    pagination.totalItems
  );

  return (
    <Container size="xl" py={16}>
      {/* Header */}
      <PageHeader
        title={DISTRIBUTIONS_LIST_UI.PAGE_TITLE}
        description={DISTRIBUTIONS_LIST_UI.PAGE_SUBTITLE}
        icon={IconSend}
        mb={24}
        rightSection={
          <Group gap="md">
            {isLoading && <Loader size="sm" color="blue" />}
            <BackToReleasesButton />
          </Group>
        }
      />

      {/* Filters */}
      <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
        <Group justify="space-between" align="center">
          <Group gap="md">
            <Group gap="xs" w={100}>
              <IconFilter size={18} color="gray" />
              <Text size="sm" fw={500} c="dimmed">Filters</Text>
              <Badge 
                size="sm" 
                variant="filled" 
                color="blue"
                style={{ 
                  opacity: hasActiveFilters ? 1 : 0,
                  transition: 'opacity 150ms ease',
                }}
              >
                {activeFilterCount || 0}
              </Badge>
            </Group>
            <Select
              placeholder="All Statuses"
              data={DISTRIBUTION_STATUS_FILTER_OPTIONS}
              value={filters.status}
              onChange={handleStatusChange}
              clearable
              size="sm"
              w={180}
            />
            <Select
              placeholder="All Platforms"
              data={PLATFORM_FILTER_OPTIONS}
              value={filters.platform}
              onChange={handlePlatformChange}
              clearable
              size="sm"
              w={140}
            />
          </Group>
          <Tooltip label="Clear all filters" disabled={!hasActiveFilters}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={handleClearFilters}
              size="lg"
              style={{ 
                opacity: hasActiveFilters ? 1 : 0,
                pointerEvents: hasActiveFilters ? 'auto' : 'none',
                transition: 'opacity 150ms ease',
              }}
            >
              <IconFilterOff size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Paper>

      {/* Loading State - Priority 1: Show loading first */}
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

      {/* Error State - Priority 2: Show error only when NOT loading */}
      {!isLoading && error && !hasDistributions && (
        <ErrorState
          error={error}
          onRetry={handleRetryLoad}
          title="Failed to Load Distributions"
        />
      )}
      
      {/* Stale Data Warning - Priority 3: Show when data loaded but stale */}
      {!isLoading && !error && staleInfo?.shouldRefresh && hasDistributions && (
        <StaleDataWarning
          loadedAt={new Date(loadedAt)}
          onRefresh={handleRetryLoad}
          threshold={5}
        />
      )}

      {/* Stats */}
      {!isLoading && hasDistributions && <DistributionStatsCard stats={stats} />}

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
                      Created
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
                    key={distribution.id}
                    distribution={distribution}
                    org={org}
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
            appId={org}
            distributionId={selectedDistribution.id}
            submissions={selectedDistribution.submissions}
            hasAndroidActiveRollout={false}
            onSubmitComplete={handleSubmitComplete}
            onClose={handleCloseSubmitModal}
            isFirstSubmission={submitModalProps.isFirstSubmission}
            androidArtifact={submitModalProps.androidArtifact}
            iosArtifact={submitModalProps.iosArtifact}
          />
        )}
      </Modal>
    </Container>
  );
}

