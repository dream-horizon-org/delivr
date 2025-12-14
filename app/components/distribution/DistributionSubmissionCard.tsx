/**
 * Distribution Submission Card Component
 * Displays a single platform submission within the distribution management page
 */

import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { Link } from '@remix-run/react';
import { useCallback, useMemo } from 'react';
import {
  DISTRIBUTION_MANAGEMENT_ICON_SIZES,
  DISTRIBUTION_MANAGEMENT_LAYOUT,
  DISTRIBUTION_MANAGEMENT_UI,
  ROLLOUT_COMPLETE_PERCENT,
} from '~/constants/distribution.constants';
import {
  Platform,
  SubmissionStatus,
  type SubmissionInDistribution,
} from '~/types/distribution.types';
import { formatDate, getPlatformColor, getStatusColor } from '~/utils/distribution-ui.utils';
import { getPlatformIcon } from '~/utils/distribution-icons.utils';

export type DistributionSubmissionCardProps = {
  submission: SubmissionInDistribution;
  org: string;
  releaseId: string;
};

export function DistributionSubmissionCard({
  submission,
  org,
  releaseId,
}: DistributionSubmissionCardProps) {
  const platformName = submission.platform === Platform.ANDROID ? 'Android' : 'iOS';
  const platformColor = getPlatformColor(submission.platform);
  
  const isRollingOut = useMemo(
    () =>
      submission.status === SubmissionStatus.LIVE &&
      submission.rolloutPercent < ROLLOUT_COMPLETE_PERCENT,
    [submission.status, submission.rolloutPercent]
  );

  const detailsUrl = useMemo(
    () => `/dashboard/${org}/releases/${releaseId}/submissions/${submission.id}`,
    [org, releaseId, submission.id]
  );

  const progressBarStyle = useMemo(
    () => ({
      width: '100%',
      height: `${DISTRIBUTION_MANAGEMENT_LAYOUT.PROGRESS_BAR_HEIGHT}px`,
      backgroundColor: 'var(--mantine-color-gray-2)',
      borderRadius: `${DISTRIBUTION_MANAGEMENT_LAYOUT.PROGRESS_BAR_RADIUS}px`,
      overflow: 'hidden' as const,
    }),
    []
  );

  const progressFillStyle = useMemo(
    () => ({
      width: `${submission.rolloutPercent}%`,
      height: '100%',
      backgroundColor: 'var(--mantine-color-blue-6)',
      transition: 'width 0.3s ease',
    }),
    [submission.rolloutPercent]
  );

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Group>
            <ThemeIcon
              size="xl"
              variant="light"
              color={platformColor}
              radius="md"
            >
              {getPlatformIcon(
                submission.platform,
                DISTRIBUTION_MANAGEMENT_ICON_SIZES.PLATFORM
              )}
            </ThemeIcon>
            <div>
              <Text fw={600} size="lg">
                {platformName}
              </Text>
              <Text size="xs" c="dimmed">
                {submission.storeType}
              </Text>
            </div>
          </Group>
          <Badge
            color={getStatusColor(submission.status)}
            variant="light"
            size="lg"
            radius="sm"
          >
            {submission.status.replace(/_/g, ' ')}
          </Badge>
        </Group>

        {isRollingOut && (
          <div>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                {DISTRIBUTION_MANAGEMENT_UI.ROLLOUT_PROGRESS_LABEL}
              </Text>
              <Text size="xs" fw={600}>
                {submission.rolloutPercent}%
              </Text>
            </Group>
            <div style={progressBarStyle}>
              <div style={progressFillStyle} />
            </div>
          </div>
        )}

        <Divider />

        <Group justify="space-between">
          <div>
            <Text size="xs" c="dimmed">
              {DISTRIBUTION_MANAGEMENT_UI.LABELS.SUBMITTED}
            </Text>
            <Text size="sm" fw={500}>
              {formatDate(submission.submittedAt)}
            </Text>
          </div>
          {submission.updatedAt && (
            <div>
              <Text size="xs" c="dimmed">
                {DISTRIBUTION_MANAGEMENT_UI.LABELS.UPDATED}
              </Text>
              <Text size="sm" fw={500}>
                {formatDate(submission.updatedAt)}
              </Text>
            </div>
          )}
        </Group>

        <Button
          component={Link}
          to={detailsUrl}
          variant="light"
          color="blue"
          fullWidth
          radius="sm"
        >
          {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.VIEW_DETAILS}
        </Button>
      </Stack>
    </Card>
  );
}

