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
import type { DistributionStats } from '~/types/distribution.types';

export type DistributionStatsCardsProps = {
  stats: DistributionStats;
};

export function DistributionStatsCards({ stats }: DistributionStatsCardsProps) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {DISTRIBUTIONS_LIST_UI.STATS_TITLES.TOTAL_DISTRIBUTIONS}
          </Text>
          <ThemeIcon size="sm" variant="light" color="gray" radius="md">
            <IconList size={DISTRIBUTIONS_LIST_ICON_SIZES.STATS_CARD} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={700} lh={1}>
          {stats.totalDistributions}
        </Text>
      </Card>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {DISTRIBUTIONS_LIST_UI.STATS_TITLES.TOTAL_SUBMISSIONS}
          </Text>
          <ThemeIcon size="sm" variant="light" color="blue" radius="md">
            <IconFileText size={DISTRIBUTIONS_LIST_ICON_SIZES.STATS_CARD} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={700} c="blue" lh={1}>
          {stats.totalSubmissions}
        </Text>
      </Card>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {DISTRIBUTIONS_LIST_UI.STATS_TITLES.IN_REVIEW}
          </Text>
          <ThemeIcon size="sm" variant="light" color="orange" radius="md">
            <IconClock size={DISTRIBUTIONS_LIST_ICON_SIZES.STATS_CARD} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={700} c="orange" lh={1}>
          {stats.inReviewSubmissions}
        </Text>
      </Card>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {DISTRIBUTIONS_LIST_UI.STATS_TITLES.RELEASED}
          </Text>
          <ThemeIcon size="sm" variant="light" color="green" radius="md">
            <IconCheck size={DISTRIBUTIONS_LIST_ICON_SIZES.STATS_CARD} />
          </ThemeIcon>
        </Group>
        <Text size="32" fw={700} c="green" lh={1}>
          {stats.releasedSubmissions}
        </Text>
      </Card>
    </SimpleGrid>
  );
}

