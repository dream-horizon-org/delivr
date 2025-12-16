/**
 * BlockedMessage - Shows approval blocked message
 */

import { Group, Paper, Text, ThemeIcon } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { DISTRIBUTION_UI_LABELS } from '~/constants/distribution.constants';

type BlockedMessageProps = {
  reason: string;
};

export function BlockedMessage({ reason }: BlockedMessageProps) {
  return (
    <Paper p="md" withBorder radius="md" bg="red.0">
      <Group gap="sm">
        <ThemeIcon color="red" variant="light" size="lg">
          <IconAlertCircle size={20} />
        </ThemeIcon>
        <div>
          <Text fw={500} c="red.7">{DISTRIBUTION_UI_LABELS.APPROVAL_BLOCKED}</Text>
          <Text size="sm" c="dimmed">{reason}</Text>
        </div>
      </Group>
    </Paper>
  );
}

