/**
 * PlatformSubmissionEmptyState - Empty state for platform submission
 */

import { Stack, Text } from '@mantine/core';
import {
  DS_TYPOGRAPHY,
  DS_SPACING,
  DS_COLORS,
} from '~/constants/distribution/distribution-design.constants';
import { Platform } from '~/types/distribution/distribution.types';
import { PLATFORM_LABELS } from '~/constants/distribution/distribution.constants';

export type PlatformSubmissionEmptyStateProps = {
  platform: Platform;
};

export function PlatformSubmissionEmptyState({ platform }: PlatformSubmissionEmptyStateProps) {
  return (
    <Stack gap={DS_SPACING.MD} align="center" py={DS_SPACING.LG}>
      <Text c={DS_COLORS.TEXT.SECONDARY} size={DS_TYPOGRAPHY.SIZE.SM} ta="center">
        No submission for {PLATFORM_LABELS[platform]} yet
      </Text>
    </Stack>
  );
}

