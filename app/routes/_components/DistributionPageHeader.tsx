/**
 * DistributionPageHeader - Header for distribution page
 * Extracted from dashboard.$org.releases.$releaseId.distribution.tsx
 */

import { Badge, Group, Text, Title } from '@mantine/core';
import { RELEASE_STATUS_COLORS, RELEASE_STATUS_LABELS } from '~/constants/distribution.constants';
import type { DistributionReleaseStatus } from '~/types/distribution.types';

export type DistributionPageHeaderProps = {
  releaseId: string;
  currentStatus: DistributionReleaseStatus;
};

export function DistributionPageHeader({ releaseId, currentStatus }: DistributionPageHeaderProps) {
  return (
    <Group justify="space-between" mb="xl">
      <div>
        <Title order={1}>Distribution</Title>
        <Text c="dimmed" mt="xs">Release {releaseId}</Text>
      </div>
      <Badge color={RELEASE_STATUS_COLORS[currentStatus]} variant="light" size="xl">
        {RELEASE_STATUS_LABELS[currentStatus]}
      </Badge>
    </Group>
  );
}

