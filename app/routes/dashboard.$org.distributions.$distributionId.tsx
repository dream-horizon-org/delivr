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
  ThemeIcon,
  Title,
} from '@mantine/core';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData, useNavigation } from '@remix-run/react';
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import { DistributionOverview } from '~/components/distribution/DistributionOverview';
import { DistributionSubmissionCard } from '~/components/distribution/DistributionSubmissionCard';
import { DistributionEmptySubmissions } from '~/components/distribution/DistributionEmptySubmissions';
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

interface LoaderData {
  org: string;
  distribution: DistributionWithSubmissions;
  error?: string;
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
      });
    } catch (error) {
      console.error('[Distribution Management] Failed to fetch:', error);
      return json<LoaderData>({
        org,
        distribution: {} as DistributionWithSubmissions,
        error: 'Failed to fetch distribution details',
      });
    }
  }
);

export default function DistributionManagementPage() {
  const { org, distribution, error } = useLoaderData<LoaderData>();
  const navigation = useNavigation();

  const isLoading = navigation.state === 'loading';
  const hasSubmissions = useMemo(
    () => distribution?.submissions?.length > 0,
    [distribution?.submissions?.length]
  );
  const isPending = useMemo(
    () => distribution?.status === DistributionStatus.PENDING,
    [distribution?.status]
  );

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
        <Paper
          p="xl"
          radius="md"
          withBorder
          style={{
            backgroundColor: 'var(--mantine-color-red-0)',
            borderColor: 'var(--mantine-color-red-3)',
          }}
        >
          <Stack align="center" gap="md">
            <ThemeIcon
              size={DISTRIBUTION_MANAGEMENT_LAYOUT.ERROR_STATE_SIZE}
              variant="light"
              color="red"
              radius="xl"
            >
              <IconAlertCircle
                size={DISTRIBUTION_MANAGEMENT_ICON_SIZES.ERROR_STATE}
              />
            </ThemeIcon>
            <Text size="lg" fw={500} c="red.9">
              {DISTRIBUTION_MANAGEMENT_UI.ERROR_TITLE}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              {error || DISTRIBUTION_MANAGEMENT_UI.ERROR_NOT_FOUND}
            </Text>
            <Button
              component={Link}
              to={`/dashboard/${org}/distributions`}
              variant="filled"
              color="blue"
              leftSection={
                <IconArrowLeft
                  size={DISTRIBUTION_MANAGEMENT_ICON_SIZES.BACK_BUTTON}
                />
              }
            >
              {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.BACK_TO_DISTRIBUTIONS}
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-8">
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
                {DISTRIBUTION_MANAGEMENT_UI.PAGE_SUBTITLE(distribution.version)}
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

