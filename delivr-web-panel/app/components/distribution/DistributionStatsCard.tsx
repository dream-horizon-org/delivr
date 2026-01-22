/**
 * Distribution Stats Cards Component
 * Displays aggregate statistics for distributions
 * - Total Distributions: Count of all distributions
 * - Total Submissions: Count of all submissions across all distributions
 * - In Review: Count of submissions with IN_REVIEW status
 * - Released: Count of submissions with LIVE status at 100% exposure
 */

import { Card, Group, SimpleGrid, Text, ThemeIcon } from '@mantine/core';
import { IconCheck, IconClock, IconList, IconFileText } from '@tabler/icons-react';
import { DISTRIBUTIONS_LIST_ICON_SIZES, DISTRIBUTIONS_LIST_UI } from '~/constants/distribution/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import type { DistributionStats } from '~/types/distribution/distribution.types';

export type DistributionStatsCardProps = {
  stats: DistributionStats;
};

export function DistributionStatsCard({ stats }: DistributionStatsCardProps) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
      <Card shadow="sm" padding="lg" radius={DS_SPACING.BORDER_RADIUS} withBorder>
        <Group justify="space-between" mb={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
            {DISTRIBUTIONS_LIST_UI.STATS_TITLES.TOTAL_DISTRIBUTIONS}
          </Text>
          <ThemeIcon size={DS_TYPOGRAPHY.SIZE.SM} variant="light" color={DS_COLORS.STATUS.MUTED} radius={DS_SPACING.BORDER_RADIUS}>
            <IconList size={DISTRIBUTIONS_LIST_ICON_SIZES.STATS_CARD} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={DS_TYPOGRAPHY.WEIGHT.BOLD} lh={1}>
          {stats.totalDistributions}
        </Text>
      </Card>
      
      <Card shadow="sm" padding="lg" radius={DS_SPACING.BORDER_RADIUS} withBorder>
        <Group justify="space-between" mb={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
            {DISTRIBUTIONS_LIST_UI.STATS_TITLES.TOTAL_SUBMISSIONS}
          </Text>
          <ThemeIcon size={DS_TYPOGRAPHY.SIZE.SM} variant="light" color={DS_COLORS.STATUS.INFO} radius={DS_SPACING.BORDER_RADIUS}>
            <IconFileText size={DISTRIBUTIONS_LIST_ICON_SIZES.STATS_CARD} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={DS_TYPOGRAPHY.WEIGHT.BOLD} c={DS_COLORS.STATUS.INFO} lh={1}>
          {stats.totalSubmissions}
        </Text>
      </Card>
      
      <Card shadow="sm" padding="lg" radius={DS_SPACING.BORDER_RADIUS} withBorder>
        <Group justify="space-between" mb={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
            {DISTRIBUTIONS_LIST_UI.STATS_TITLES.IN_REVIEW}
          </Text>
          <ThemeIcon size={DS_TYPOGRAPHY.SIZE.SM} variant="light" color={DS_COLORS.STATUS.WARNING} radius={DS_SPACING.BORDER_RADIUS}>
            <IconClock size={DISTRIBUTIONS_LIST_ICON_SIZES.STATS_CARD} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={DS_TYPOGRAPHY.WEIGHT.BOLD} c={DS_COLORS.STATUS.WARNING} lh={1}>
          {stats.inReviewSubmissions}
        </Text>
      </Card>
      
      <Card shadow="sm" padding="lg" radius={DS_SPACING.BORDER_RADIUS} withBorder>
        <Group justify="space-between" mb={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
            {DISTRIBUTIONS_LIST_UI.STATS_TITLES.RELEASED}
          </Text>
          <ThemeIcon size={DS_TYPOGRAPHY.SIZE.SM} variant="light" color={DS_COLORS.STATUS.SUCCESS} radius={DS_SPACING.BORDER_RADIUS}>
            <IconCheck size={DISTRIBUTIONS_LIST_ICON_SIZES.STATS_CARD} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={DS_TYPOGRAPHY.WEIGHT.BOLD} c={DS_COLORS.STATUS.SUCCESS} lh={1}>
          {stats.releasedSubmissions}
        </Text>
      </Card>
    </SimpleGrid>
  );
}

