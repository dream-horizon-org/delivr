/**
 * Distribution Management Page
 * Full view of a single distribution with all its submissions
 * Route: /dashboard/:org/distributions/:distributionId
 */

import {
    Button,
    Container,
    Divider,
    Group,
    Loader,
    Paper,
    Stack,
    Text,
    Title
} from '@mantine/core';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData, useNavigation } from '@remix-run/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import { DistributionEmptySubmissions } from '~/components/distribution/DistributionEmptySubmissions';
import { DistributionOverview } from '~/components/distribution/DistributionOverview';
import { DistributionSubmissionCard } from '~/components/distribution/DistributionSubmissionCard';
import { ErrorState, StaleDataWarning } from '~/components/distribution/ErrorRecovery';
import {
    DISTRIBUTION_MANAGEMENT_ICON_SIZES,
    DISTRIBUTION_MANAGEMENT_LAYOUT,
    DISTRIBUTION_MANAGEMENT_UI,
} from '~/constants/distribution.constants';
import {
    DistributionStatus,
    type DistributionWithSubmissions,
} from '~/types/distribution.types';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { ErrorCategory, checkStaleData, type AppError } from '~/utils/error-handling';

interface LoaderData {
  org: string;
  distribution: DistributionWithSubmissions;
  loadedAt: string;
  error?: AppError | string;
}

export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { org, distributionId } = params;

    if (!org || !distributionId) {
      throw new Response('Organization or Distribution ID not found', { status: 404 });
    }

    try {
      // Fetch distribution details by distributionId
      // This calls GET /api/v1/distributions/:distributionId
      const response = await DistributionService.getDistribution(distributionId);
      const distribution = response.data.data;

      return json<LoaderData>({
        org,
        distribution,
        loadedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Distribution Management] Failed to fetch:', error);
      
      const appError: AppError = {
        category: ErrorCategory.NETWORK,
        code: 'FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        userMessage: 'Failed to load distribution details',
        recoveryGuidance: 'Check your connection and try again.',
        retryable: true,
      };
      
      return json<LoaderData>({
        org,
        distribution: {} as DistributionWithSubmissions,
        loadedAt: new Date().toISOString(),
        error: appError,
      });
    }
  }
);

export default function DistributionManagementPage() {
  const { org, distribution, loadedAt, error } = useLoaderData<LoaderData>();
  const navigation = useNavigation();

  const isLoading = navigation.state === 'loading';
  const staleInfo = loadedAt ? checkStaleData(new Date(loadedAt)) : null;
  const hasSubmissions = useMemo(
    () => distribution?.submissions?.length > 0,
    [distribution?.submissions?.length]
  );
  const isPending = useMemo(
    () => distribution?.status === DistributionStatus.PENDING,
    [distribution?.status]
  );
  
  // Get display version from submissions (all submissions should have the same initial version)
  const displayVersion = useMemo(() => {
    if (!distribution?.submissions || distribution.submissions.length === 0) {
      return 'N/A';
    }
    // Use the first submission's version
    return distribution.submissions[0]?.versionName || 'N/A';
  }, [distribution?.submissions]);

  const gridStyle = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(${DISTRIBUTION_MANAGEMENT_LAYOUT.CARD_MIN_WIDTH}px, 1fr))`,
      gap: '1rem',
    }),
    []
  );

  const handleBackClick = useCallback(() => {
    // Navigation handled by Link component
  }, []);

  if (error || !distribution.id) {
    return (
      <Container size="lg" className="py-8">
        <ErrorState
          error={error || 'Distribution not found'}
          onRetry={() => window.location.reload()}
          title="Failed to Load Distribution"
        />
        <Group justify="center" mt="xl">
          <Button
            component={Link}
            to={`/dashboard/${org}/distributions`}
            variant="filled"
            leftSection={<IconArrowLeft size={16} />}
          >
            {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.BACK_TO_DISTRIBUTIONS}
          </Button>
        </Group>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-8">
      {/* Stale Data Warning */}
      {staleInfo?.shouldRefresh && (
        <StaleDataWarning
          loadedAt={new Date(loadedAt)}
          onRefresh={() => window.location.reload()}
          threshold={5}
        />
      )}
      {/* Header */}
      <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
        <Group justify="space-between" align="center">
          <Group>
            <Button
              component={Link}
              to={`/dashboard/${org}/distributions`}
              variant="subtle"
              color="gray"
              leftSection={
                <IconArrowLeft
                  size={DISTRIBUTION_MANAGEMENT_ICON_SIZES.BACK_BUTTON}
                />
              }
              size="sm"
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.BACK}
            </Button>
            <Divider orientation="vertical" />
            <div>
              <Title order={2}>{DISTRIBUTION_MANAGEMENT_UI.PAGE_TITLE}</Title>
              <Text size="sm" c="dimmed">
                {DISTRIBUTION_MANAGEMENT_UI.PAGE_SUBTITLE(displayVersion)}
              </Text>
            </div>
          </Group>
          {isLoading && <Loader size="sm" color="blue" />}
        </Group>
      </Paper>

      {/* Distribution Overview */}
      <DistributionOverview distribution={distribution} />

      {/* Submissions Section */}
      <Paper shadow="sm" p="lg" radius="md" withBorder className="mt-6">
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <div>
              <Title order={4}>
                {DISTRIBUTION_MANAGEMENT_UI.PLATFORM_SUBMISSIONS_TITLE}
              </Title>
              <Text size="sm" c="dimmed">
                {DISTRIBUTION_MANAGEMENT_UI.PLATFORM_SUBMISSIONS_SUBTITLE}
              </Text>
            </div>
            {!hasSubmissions && isPending && (
              <Button
                component={Link}
                to={`/dashboard/${org}/distributions`}
                variant="filled"
                color="blue"
              >
                {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.SUBMIT_TO_STORES}
              </Button>
            )}
          </Group>

          <Divider />

          {hasSubmissions ? (
            <div style={gridStyle}>
              {distribution.submissions.map((submission: any) => (
                <DistributionSubmissionCard
                  key={submission.id}
                  submission={submission}
                  org={org}
                  releaseId={distribution.releaseId}
                />
              ))}
            </div>
          ) : (
            <DistributionEmptySubmissions />
          )}
        </Stack>
      </Paper>
    </Container>
  );
}

