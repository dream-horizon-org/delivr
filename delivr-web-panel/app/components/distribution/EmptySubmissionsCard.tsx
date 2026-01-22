/**
 * EmptySubmissionsCard - Empty state for no submissions
 * Extracted from dashboard.$org.releases.$releaseId.distribution.tsx
 */

import { Button, Card, Stack, Text } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';
import { DS_COLORS, DS_SPACING } from '~/constants/distribution/distribution-design.constants';

export type EmptySubmissionsCardProps = {
  showButton: boolean;
  onSubmit: () => void;
};

export function EmptySubmissionsCard({ showButton, onSubmit }: EmptySubmissionsCardProps) {
  return (
    <Card shadow="sm" padding={DS_SPACING.LG} radius="md" withBorder>
      <Stack align="center" py={DS_SPACING.XL}>
        <IconRocket size={48} color={DS_COLORS.TEXT.MUTED} />
        <Text c={DS_COLORS.TEXT.MUTED} ta="center">
          No submissions yet. Submit your builds to the app stores to start distribution.
        </Text>
        {showButton && (
          <Button mt={DS_SPACING.MD} leftSection={<IconRocket size={16} />} onClick={onSubmit}>
            Submit to Stores
          </Button>
        )}
      </Stack>
    </Card>
  );
}

