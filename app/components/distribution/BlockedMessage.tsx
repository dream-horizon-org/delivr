/**
 * BlockedMessage - Shows approval blocked message
 */

import { Group, Paper, Text, ThemeIcon } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { DISTRIBUTION_UI_LABELS } from '~/constants/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';

type BlockedMessageProps = {
  reason: string;
};

export function BlockedMessage({ reason }: BlockedMessageProps) {
  return (
    <Paper p={DS_SPACING.MD} withBorder radius={DS_SPACING.BORDER_RADIUS} bg={DS_COLORS.BACKGROUND.ERROR}>
      <Group gap={DS_SPACING.SM}>
        <ThemeIcon color={DS_COLORS.STATUS.ERROR} variant="light" size="lg" radius={DS_SPACING.BORDER_RADIUS}>
          <IconAlertCircle size={20} />
        </ThemeIcon>
        <div>
          <Text fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} c={DS_COLORS.STATUS.ERROR}>{DISTRIBUTION_UI_LABELS.APPROVAL_BLOCKED}</Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>{reason}</Text>
        </div>
      </Group>
    </Paper>
  );
}

