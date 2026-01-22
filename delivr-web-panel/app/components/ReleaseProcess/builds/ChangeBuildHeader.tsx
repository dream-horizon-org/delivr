/**
 * ChangeBuildHeader Component
 * Header shown when user is changing a build
 * Displays title and cancel button
 */

import { Button, Group, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { Platform } from '~/types/release-process-enums';

interface ChangeBuildHeaderProps {
  platform?: Platform;
  onCancel: () => void;
}

export function ChangeBuildHeader({
  platform,
  onCancel,
}: ChangeBuildHeaderProps) {
  return (
    <Group justify="space-between" mb="xs">
      <Text size="sm" fw={500}>
        Change Build - {platform || 'Build'}
      </Text>
      <Button
        size="xs"
        variant="subtle"
        color="gray"
        leftSection={<IconX size={14} />}
        onClick={onCancel}
      >
        Cancel
      </Button>
    </Group>
  );
}

