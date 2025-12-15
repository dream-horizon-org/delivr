/**
 * Distribution List Row Component
 * Displays a single distribution entry in the table
 */

import { Badge, Button, Group, Table, Text, Tooltip } from '@mantine/core';
import { Link } from '@remix-run/react';
import { IconClock, IconEye, IconSend } from '@tabler/icons-react';
import {
  DISTRIBUTION_STATUS_COLORS,
  DISTRIBUTIONS_LIST_ICON_SIZES,
  DISTRIBUTIONS_LIST_LAYOUT,
  DISTRIBUTIONS_LIST_UI,
} from '~/constants/distribution.constants';
import {
  DistributionStatus,
  Platform,
  type DistributionEntry,
} from '~/types/distribution.types';
import { formatRelativeTime, formatStatus } from '~/utils/distribution-ui.utils';
import { getPlatformIcon } from '~/utils/distribution-icons.utils';

export type DistributionListRowProps = {
  distribution: DistributionEntry;
  org: string;
  onSubmitClick: (distribution: DistributionEntry) => void;
};

export function DistributionListRow({
  distribution,
  org,
  onSubmitClick,
}: DistributionListRowProps) {
  const isPending = distribution.status === DistributionStatus.PENDING;
  
  // Get version from first submission (all submissions should initially have the same version)
  const displayVersion = distribution.submissions && distribution.submissions.length > 0
    ? distribution.submissions[0]?.versionName || 'N/A'
    : 'N/A';
  
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
          {displayVersion}
        </Badge>
      </Table.Td>

      {/* Branch */}
      <Table.Td>
        <Text size="sm" c="dimmed">
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
            const platformName =
              platform === Platform.ANDROID
                ? DISTRIBUTIONS_LIST_UI.PLATFORM_TOOLTIP.NOT_SUBMITTED('Android')
                : DISTRIBUTIONS_LIST_UI.PLATFORM_TOOLTIP.NOT_SUBMITTED('iOS');

            // Platform color is based on the platform, not status
            const platformColor =
              platform === Platform.ANDROID ? 'green' : 'blue';

            if (submission) {
              // Platform has been submitted - show with full color
              const tooltipLabel =
                submission.rolloutPercent > 0
                  ? DISTRIBUTIONS_LIST_UI.PLATFORM_TOOLTIP.SUBMITTED(
                      platformName.split(':')[0],
                      formatStatus(submission.status),
                      submission.rolloutPercent
                    )
                  : DISTRIBUTIONS_LIST_UI.PLATFORM_TOOLTIP.SUBMITTED(
                      platformName.split(':')[0],
                      formatStatus(submission.status)
                    );

              return (
                <Tooltip
                  key={platform}
                  label={tooltipLabel}
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
                      padding: DISTRIBUTIONS_LIST_LAYOUT.PLATFORM_BADGE_PADDING,
                    }}
                  >
                    {getPlatformIcon(
                      platform,
                      DISTRIBUTIONS_LIST_ICON_SIZES.PLATFORM_BADGE
                    )}
                  </Badge>
                </Tooltip>
              );
            } else {
              // Platform is targeted but not submitted yet - show faded
              return (
                <Tooltip
                  key={platform}
                  label={platformName}
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
                      padding: DISTRIBUTIONS_LIST_LAYOUT.PLATFORM_BADGE_PADDING,
                      opacity: 0.4,
                    }}
                  >
                    {getPlatformIcon(
                      platform,
                      DISTRIBUTIONS_LIST_ICON_SIZES.PLATFORM_BADGE
                    )}
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

      {/* Last Updated */}
      <Table.Td>
        <Group gap={6}>
          <IconClock size={DISTRIBUTIONS_LIST_ICON_SIZES.CLOCK_ICON} color="gray" />
          <Text size="sm" fw={500}>
            {formatRelativeTime(distribution.lastUpdated)}
          </Text>
        </Group>
      </Table.Td>

      {/* Actions */}
      <Table.Td>
        <Group gap="xs">
          {isPending ? (
            <Button
              onClick={() => onSubmitClick(distribution)}
              variant="filled"
              color="blue"
              size="sm"
              radius="sm"
              w={DISTRIBUTIONS_LIST_LAYOUT.ACTION_BUTTON_WIDTH}
              leftSection={
                <IconSend size={DISTRIBUTIONS_LIST_ICON_SIZES.ACTION_BUTTON} />
              }
            >
              {DISTRIBUTIONS_LIST_UI.SUBMIT_BUTTON}
            </Button>
          ) : (
            <Button
              component={Link}
              to={`/dashboard/${org}/distributions/${distribution.id}`}
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
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

