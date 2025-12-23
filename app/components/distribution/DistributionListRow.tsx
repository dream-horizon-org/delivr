/**
 * Distribution List Row Component
 * Displays a single distribution entry in the table
 */

import { Badge, Button, Group, Table, Text, Tooltip } from '@mantine/core';
import { Link } from '@remix-run/react';
import { IconEye } from '@tabler/icons-react';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import {
  DISTRIBUTION_STATUS_COLORS,
  DISTRIBUTIONS_LIST_ICON_SIZES,
  DISTRIBUTIONS_LIST_LAYOUT,
  DISTRIBUTIONS_LIST_UI,
} from '~/constants/distribution/distribution.constants';
import {
  Platform,
  SubmissionStatus,
  type DistributionEntry
} from '~/types/distribution/distribution.types';
import { getPlatformIcon } from '~/utils/distribution/distribution-icons.utils';
import { formatDateTime, formatStatus } from '~/utils/distribution/distribution-ui.utils';

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
      // Success states
      case SubmissionStatus.IN_PROGRESS: return DS_COLORS.STATUS.SUCCESS;
      case SubmissionStatus.COMPLETED: return DS_COLORS.STATUS.SUCCESS;
      case SubmissionStatus.LIVE: return DS_COLORS.STATUS.SUCCESS;
      case SubmissionStatus.APPROVED: return DS_COLORS.STATUS.INFO;
      
      // In-review states
      case SubmissionStatus.SUBMITTED: return DS_COLORS.STATUS.INFO;
      case SubmissionStatus.IN_REVIEW: return DS_COLORS.STATUS.WARNING;
      
      // Paused states
      case SubmissionStatus.PAUSED: return DS_COLORS.STATUS.WARNING;
      case SubmissionStatus.HALTED: return DS_COLORS.STATUS.WARNING;
      
      // Error/terminal states - ALL RED
      case SubmissionStatus.REJECTED: return DS_COLORS.STATUS.ERROR;
      case SubmissionStatus.SUSPENDED: return DS_COLORS.STATUS.ERROR;
      case SubmissionStatus.CANCELLED: return DS_COLORS.STATUS.ERROR;
      
      // Action required
      case SubmissionStatus.USER_ACTION_PENDING: return DS_COLORS.STATUS.WARNING;
      
      // Pending
      case SubmissionStatus.PENDING: return DS_COLORS.STATUS.MUTED;
      default: return DS_COLORS.STATUS.MUTED;
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
          size={DS_TYPOGRAPHY.SIZE.SM}
          fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}
          c={DS_COLORS.ACTION.PRIMARY}
          style={{ textDecoration: 'none', cursor: 'pointer' }}
          className="hover:underline"
        >
          {distribution.branch}
        </Text>
      </Table.Td>

      {/* Platforms */}
      <Table.Td>
        <Group gap={DS_SPACING.XS}>
          {distribution.platforms.map((platform) => {
            const submission = distribution.submissions.find(
              (s) => s.platform === platform
            );
            const platformName = platform === Platform.ANDROID ? 'Android' : 'iOS';

            if (submission) {
              // Platform has been submitted - show with status color and rollout %
              const statusColor = getSubmissionColor(submission.status);
              
              // Special statuses that should be prominently displayed
              const isSpecialStatus = [
                SubmissionStatus.SUSPENDED,
                SubmissionStatus.USER_ACTION_PENDING,
                SubmissionStatus.REJECTED,
                SubmissionStatus.CANCELLED,
              ].includes(submission.status);
              
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
                      radius={DS_SPACING.BORDER_RADIUS}
                      leftSection={getPlatformIcon(platform, DISTRIBUTIONS_LIST_ICON_SIZES.PLATFORM_BADGE)}
                    >
                      {isSpecialStatus ? formatStatus(submission.status) : `${submission.rolloutPercentage}%`}
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
                    color={DS_COLORS.STATUS.MUTED}
                    size="lg"
                    radius={DS_SPACING.BORDER_RADIUS}
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
          radius={DS_SPACING.BORDER_RADIUS}
        >
          {formatStatus(distribution.status)}
        </Badge>
      </Table.Td>

      {/* Created */}
      <Table.Td>
        <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
          {formatDateTime(distribution.createdAt)}
        </Text>
      </Table.Td>

      {/* Last Updated */}
      <Table.Td>
        <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
          {formatDateTime(distribution.statusUpdatedAt)}
        </Text>
      </Table.Td>

      {/* Actions */}
      <Table.Td>
        <Group gap={DS_SPACING.XS}>
          <Button
            component={Link}
            to={`/dashboard/${org}/distributions/${distribution.id}`}
            prefetch="none"
            variant="outline"
            color={DS_COLORS.ACTION.PRIMARY}
            size="sm"
            radius={DS_SPACING.BORDER_RADIUS}
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

