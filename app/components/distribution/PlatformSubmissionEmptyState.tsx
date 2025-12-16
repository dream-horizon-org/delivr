/**
 * PlatformSubmissionEmptyState - Empty state for platform submission
 */

import { Stack, Text } from '@mantine/core';
import { Platform } from '~/types/distribution.types';
import { PLATFORM_LABELS } from '~/constants/distribution.constants';

type PlatformSubmissionEmptyStateProps = {
  platform: Platform;
};

export function PlatformSubmissionEmptyState({ platform }: PlatformSubmissionEmptyStateProps) {
  return (
    <Stack gap="md" align="center" py="lg">
      <Text c="dimmed" size="sm" ta="center">
        No submission for {PLATFORM_LABELS[platform]} yet
      </Text>
    </Stack>
  );
}

