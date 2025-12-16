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
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';
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
    <Paper shadow="sm" p={DS_SPACING.LG} radius={DS_SPACING.BORDER_RADIUS} withBorder>
      <Stack gap={DS_SPACING.MD}>
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={3}>{DISTRIBUTION_MANAGEMENT_UI.OVERVIEW_TITLE}</Title>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
              {DISTRIBUTION_MANAGEMENT_UI.RELEASE_VERSION(displayVersion)}
            </Text>
          </div>
          <Badge
            color={getStatusColor(distribution.status)}
            variant="dot"
            size={DS_TYPOGRAPHY.SIZE.LG}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            {formatStatus(distribution.status)}
          </Badge>
        </Group>

        <Divider />

        <Group>
          <ThemeIcon size={DS_TYPOGRAPHY.SIZE.LG} variant="light" color="gray" radius={DS_SPACING.BORDER_RADIUS}>
            <IconGitBranch size={DISTRIBUTION_MANAGEMENT_ICON_SIZES.DETAIL} />
          </ThemeIcon>
          <div>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
              {DISTRIBUTION_MANAGEMENT_UI.LABELS.BRANCH}
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
              {distribution.branch}
            </Text>
          </div>
        </Group>

        <Group>
          <ThemeIcon size={DS_TYPOGRAPHY.SIZE.LG} variant="light" color="gray" radius={DS_SPACING.BORDER_RADIUS}>
            <IconCalendar size={DISTRIBUTION_MANAGEMENT_ICON_SIZES.DETAIL} />
          </ThemeIcon>
          <div>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
              {DISTRIBUTION_MANAGEMENT_UI.LABELS.LAST_UPDATED}
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
              {'updatedAt' in distribution ? formatDate(distribution.updatedAt) : formatDate(distribution.statusUpdatedAt)}
            </Text>
          </div>
        </Group>

        {'createdAt' in distribution && distribution.createdAt && (
          <Group>
            <ThemeIcon size={DS_TYPOGRAPHY.SIZE.LG} variant="light" color={DS_COLORS.STATUS.INFO} radius={DS_SPACING.BORDER_RADIUS}>
              <IconClock size={DISTRIBUTION_MANAGEMENT_ICON_SIZES.DETAIL} />
            </ThemeIcon>
            <div>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
                Created At
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                {formatDate(distribution.createdAt)}
              </Text>
            </div>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}

