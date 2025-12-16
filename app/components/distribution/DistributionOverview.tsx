/**
 * Distribution Overview Component
 * Displays high-level details about a distribution (version, branch, dates)
 */

import {
  Badge,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconCalendar, IconClock, IconGitBranch } from '@tabler/icons-react';
import {
  DISTRIBUTION_MANAGEMENT_ICON_SIZES,
  DISTRIBUTION_MANAGEMENT_UI,
} from '~/constants/distribution.constants';
import type { DistributionEntry, DistributionWithSubmissions } from '~/types/distribution.types';
import { formatDate, formatStatus, getStatusColor } from '~/utils/distribution-ui.utils';

export type DistributionOverviewProps = {
  distribution: DistributionEntry | DistributionWithSubmissions;
};

export function DistributionOverview({ distribution }: DistributionOverviewProps) {
  // Get version from first submission (only available for DistributionDetail with full Submission objects)
  const displayVersion = 'submissions' in distribution && distribution.submissions?.length > 0
    ? ('version' in distribution.submissions[0] ? distribution.submissions[0].version : 'N/A')
    : 'N/A';
    
  return (
    <Paper shadow="sm" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={3}>{DISTRIBUTION_MANAGEMENT_UI.OVERVIEW_TITLE}</Title>
            <Text size="sm" c="dimmed">
              {DISTRIBUTION_MANAGEMENT_UI.RELEASE_VERSION(displayVersion)}
            </Text>
          </div>
          <Badge
            color={getStatusColor(distribution.status)}
            variant="dot"
            size="lg"
            radius="sm"
          >
            {formatStatus(distribution.status)}
          </Badge>
        </Group>

        <Divider />

        <Group>
          <ThemeIcon size="lg" variant="light" color="gray" radius="sm">
            <IconGitBranch size={DISTRIBUTION_MANAGEMENT_ICON_SIZES.DETAIL} />
          </ThemeIcon>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              {DISTRIBUTION_MANAGEMENT_UI.LABELS.BRANCH}
            </Text>
            <Text size="sm" fw={500}>
              {distribution.branch}
            </Text>
          </div>
        </Group>

        <Group>
          <ThemeIcon size="lg" variant="light" color="gray" radius="sm">
            <IconCalendar size={DISTRIBUTION_MANAGEMENT_ICON_SIZES.DETAIL} />
          </ThemeIcon>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              {DISTRIBUTION_MANAGEMENT_UI.LABELS.LAST_UPDATED}
            </Text>
            <Text size="sm" fw={500}>
              {'updatedAt' in distribution ? formatDate(distribution.updatedAt) : formatDate(distribution.statusUpdatedAt)}
            </Text>
          </div>
        </Group>

        {'createdAt' in distribution && distribution.createdAt && (
          <Group>
            <ThemeIcon size="lg" variant="light" color="blue" radius="sm">
              <IconClock size={DISTRIBUTION_MANAGEMENT_ICON_SIZES.DETAIL} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Created At
              </Text>
              <Text size="sm" fw={500}>
                {formatDate(distribution.createdAt)}
              </Text>
            </div>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}

