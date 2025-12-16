/**
 * Distribution List Row Component
 * Displays a single distribution entry in the table
 */

import { Badge, Button, Group, Table, Text, Tooltip } from '@mantine/core';
import { Link } from '@remix-run/react';
import { IconClock, IconEye } from '@tabler/icons-react';
import {
  DISTRIBUTION_STATUS_COLORS,
  DISTRIBUTIONS_LIST_ICON_SIZES,
  DISTRIBUTIONS_LIST_LAYOUT,
  DISTRIBUTIONS_LIST_UI,
} from '~/constants/distribution.constants';
import {
  Platform,
  SubmissionStatus,
  type DistributionEntry
} from '~/types/distribution.types';
import { getPlatformIcon } from '~/utils/distribution-icons.utils';
import { formatDateTime, formatStatus } from '~/utils/distribution-ui.utils';

export type DistributionListRowProps = {
  distribution: DistributionEntry;
  org: string;
};

export function DistributionListRow({
  distribution,
  org,
}: DistributionListRowProps) {
  
  // Get submission status color
  const getSubmissionColor = (status: SubmissionStatus): string => {
    switch (status) {
      case SubmissionStatus.LIVE: return 'green';
      case SubmissionStatus.IN_REVIEW: return 'yellow';
      case SubmissionStatus.APPROVED: return 'blue';
      case SubmissionStatus.REJECTED: return 'red';
      case SubmissionStatus.PAUSED: return 'orange';
      case SubmissionStatus.HALTED: return 'red';
      case SubmissionStatus.CANCELLED: return 'gray';
      case SubmissionStatus.PENDING: return 'gray';
      default: return 'gray';
    }
  };
  
  return (
    <Table.Tr>
      {/* Branch */}
      <Table.Td>
        <Text
          component={Link}
          to={`/dashboard/${org}/releases/${distribution.releaseId}`}
          prefetch="none"
          size="sm"
          fw={600}
          c="blue"
          style={{ textDecoration: 'none', cursor: 'pointer' }}
          className="hover:underline"
        >
          {distribution.branch}
        </Text>
      </Table.Td>

      {/* Platforms */}
      <Table.Td>
        <Group gap="sm">
          {distribution.platforms.map((platform) => {
            const submission = distribution.submissions.find(
              (s) => s.platform === platform
            );
            const platformName = platform === Platform.ANDROID ? 'Android' : 'iOS';

            if (submission) {
              // Platform has been submitted - show with status color and rollout %
              const statusColor = getSubmissionColor(submission.status);
              const tooltipLabel = `${platformName}: ${formatStatus(submission.status)} (${submission.rolloutPercentage}%)`;

              return (
                <Tooltip
                  key={platform}
                  label={tooltipLabel}
                  withArrow
                  position="top"
                >
                  <Group gap={4} style={{ cursor: 'pointer' }}>
                    <Badge
                      variant="light"
                      color={statusColor}
                      size="lg"
                      radius="sm"
                      leftSection={getPlatformIcon(platform, DISTRIBUTIONS_LIST_ICON_SIZES.PLATFORM_BADGE)}
                    >
                      {submission.rolloutPercentage}%
                    </Badge>
                  </Group>
                </Tooltip>
              );
            } else {
              // Platform is targeted but not submitted yet - show faded
              return (
                <Tooltip
                  key={platform}
                  label={`${platformName}: Not submitted`}
                  withArrow
                  position="top"
                >
                  <Badge
                    variant="outline"
                    color="gray"
                    size="lg"
                    radius="sm"
                    style={{ cursor: 'pointer', opacity: 0.4 }}
                    leftSection={getPlatformIcon(platform, DISTRIBUTIONS_LIST_ICON_SIZES.PLATFORM_BADGE)}
                  >
                    -
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
          color={DISTRIBUTION_STATUS_COLORS[distribution.status]}
          variant="dot"
          size="lg"
          radius="sm"
        >
          {formatStatus(distribution.status)}
        </Badge>
      </Table.Td>

      {/* Created */}
      <Table.Td>
        <Text size="sm" c="dimmed">
          {formatDateTime(distribution.createdAt)}
        </Text>
      </Table.Td>

      {/* Last Updated */}
      <Table.Td>
        <Group gap={6}>
          <IconClock size={DISTRIBUTIONS_LIST_ICON_SIZES.CLOCK_ICON} color="gray" />
          <Text size="sm" fw={500}>
            {formatDateTime(distribution.statusUpdatedAt)}
          </Text>
        </Group>
      </Table.Td>

      {/* Actions */}
      <Table.Td>
        <Group gap="xs">
          <Button
            component={Link}
            to={`/dashboard/${org}/distributions/${distribution.id}`}
            prefetch="none"
            variant="outline"
            color="blue"
            size="sm"
            radius="sm"
            w={DISTRIBUTIONS_LIST_LAYOUT.ACTION_BUTTON_WIDTH}
            leftSection={
              <IconEye size={DISTRIBUTIONS_LIST_ICON_SIZES.ACTION_BUTTON} />
            }
          >
            {DISTRIBUTIONS_LIST_UI.VIEW_BUTTON}
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

