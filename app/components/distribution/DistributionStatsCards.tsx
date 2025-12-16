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
import { DISTRIBUTIONS_LIST_ICON_SIZES, DISTRIBUTIONS_LIST_UI } from '~/constants/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';
import type { DistributionStats } from '~/types/distribution.types';

export type DistributionStatsCardsProps = {
  stats: DistributionStats;
};

export function DistributionStatsCards({ stats }: DistributionStatsCardsProps) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
      <Card shadow="sm" padding="lg" radius={DS_SPACING.BORDER_RADIUS} withBorder>
        <Group justify="space-between" mb={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
            {DISTRIBUTIONS_LIST_UI.STATS_TITLES.TOTAL_DISTRIBUTIONS}
          </Text>
          <ThemeIcon size={DS_TYPOGRAPHY.SIZE.SM} variant="light" color="gray" radius={DS_SPACING.BORDER_RADIUS}>
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
        <Text size="32" fw={DS_TYPOGRAPHY.WEIGHT.BOLD} c="blue" lh={1}>
          {stats.totalSubmissions}
        </Text>
      </Card>
      
      <Card shadow="sm" padding="lg" radius={DS_SPACING.BORDER_RADIUS} withBorder>
        <Group justify="space-between" mb={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} tt="uppercase" fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
            {DISTRIBUTIONS_LIST_UI.STATS_TITLES.IN_REVIEW}
          </Text>
          <ThemeIcon size={DS_TYPOGRAPHY.SIZE.SM} variant="light" color="orange" radius={DS_SPACING.BORDER_RADIUS}>
            <IconClock size={DISTRIBUTIONS_LIST_ICON_SIZES.STATS_CARD} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={DS_TYPOGRAPHY.WEIGHT.BOLD} c="orange" lh={1}>
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
        <Text size="32" fw={DS_TYPOGRAPHY.WEIGHT.BOLD} c="green" lh={1}>
          {stats.releasedSubmissions}
        </Text>
      </Card>
    </SimpleGrid>
  );
}

