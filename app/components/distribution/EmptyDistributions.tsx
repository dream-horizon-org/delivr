/**
 * Empty Distributions Component
 * Displays empty state when no distributions exist
 */

import { Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconList } from '@tabler/icons-react';
import {
  DISTRIBUTIONS_LIST_ICON_SIZES,
  DISTRIBUTIONS_LIST_LAYOUT,
  DISTRIBUTIONS_LIST_UI,
} from '~/constants/distribution.constants';

export function EmptyDistributions() {
  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Stack align="center" gap="md">
        <ThemeIcon
          size={DISTRIBUTIONS_LIST_ICON_SIZES.EMPTY_STATE_LARGE}
          variant="light"
          color="gray"
          radius="xl"
        >
          <IconList size={DISTRIBUTIONS_LIST_ICON_SIZES.EMPTY_STATE_INNER} />
        </ThemeIcon>
        <Text size="lg" fw={500}>
          {DISTRIBUTIONS_LIST_UI.EMPTY_TITLE}
        </Text>
        <Text
          size="sm"
          c="dimmed"
          ta="center"
          maw={DISTRIBUTIONS_LIST_LAYOUT.EMPTY_TEXT_MAX_WIDTH}
        >
          {DISTRIBUTIONS_LIST_UI.EMPTY_MESSAGE}
        </Text>
      </Stack>
    </Paper>
  );
}

