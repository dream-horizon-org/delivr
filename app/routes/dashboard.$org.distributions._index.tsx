/**
 * Distributions List Page
 * Shows all releases that have been submitted for distribution
 * Fetches data from API - NO HARDCODED DATA
 * 
 * Entry Point 2: Sidebar → Distributions → Select Release → Manage Platforms
 */

import {
  Container,
  Group,
  Loader,
  Modal,
  Pagination,
  Paper,
  Stack,
  Table,
  Text,
  Title
} from '@mantine/core';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, useNavigation, useRevalidator, useSearchParams } from '@remix-run/react';
import { useCallback, useState } from 'react';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import { DistributionListRow } from '~/components/distribution/DistributionListRow';
import { DistributionStatsCards } from '~/components/distribution/DistributionStatsCards';
import { EmptyDistributions } from '~/components/distribution/EmptyDistributions';
import { ErrorState, StaleDataWarning } from '~/components/distribution/ErrorRecovery';
import { SubmitToStoresForm } from '~/components/distribution/SubmitToStoresForm';
import {
  DISTRIBUTIONS_LIST_LAYOUT,
  DISTRIBUTIONS_LIST_UI
} from '~/constants/distribution.constants';
import { useSubmitModalProps } from '~/hooks/useSubmitModalProps';
import {
  type DistributionEntry,
  type DistributionStats,
  type PaginationMeta,
} from '~/types/distribution.types';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { ErrorCategory, checkStaleData, type AppError } from '~/utils/error-handling';

// Types imported from central types file - single source of truth
interface LoaderData {
  org: string;
  distributions: DistributionEntry[];
  stats: DistributionStats;
  pagination: PaginationMeta;
  loadedAt: string;
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
    
    // TODO: Pass filters to backend API when implemented
    // const search = url.searchParams.get('search') || '';
    // const status = url.searchParams.getAll('status');
    // const platforms = url.searchParams.getAll('platform');
    // const dateFrom = url.searchParams.get('dateFrom');
    // const dateTo = url.searchParams.get('dateTo');

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
        loadedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Distributions] Failed to fetch:', error);
      
      // Parse error into AppError format
      const appError: AppError = {
        category: ErrorCategory.NETWORK,
        code: 'FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
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
        error: appError,
      });
    }
  }
);

export default function DistributionsListPage() {
  const { org, distributions, stats, pagination, loadedAt, error } =
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

  // Debug: Log navigation state
  console.log('[Distributions] Navigation state:', navigation.state);
  console.log('[Distributions] Has distributions:', hasDistributions);
  console.log('[Distributions] Distributions count:', distributions.length);

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
    // Client-side navigation - no full page refresh
    console.log('[Pagination] Changing to page:', newPage);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', String(newPage));
    const newUrl = `?${newSearchParams.toString()}`;
    console.log('[Pagination] Navigating to:', newUrl);
    navigate(newUrl, { replace: false });
  }, [navigate, searchParams]);

  const handleRetryLoad = useCallback(() => {
    revalidator.revalidate();
  }, [revalidator]);

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

      {/* Error State - Full page error with retry */}
      {error && !hasDistributions && (
        <ErrorState
          error={error}
          onRetry={handleRetryLoad}
          title="Failed to Load Distributions"
        />
      )}
      
      {/* Stale Data Warning */}
      {!error && staleInfo?.shouldRefresh && hasDistributions && (
        <StaleDataWarning
          loadedAt={new Date(loadedAt)}
          onRefresh={handleRetryLoad}
          threshold={5}
        />
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

