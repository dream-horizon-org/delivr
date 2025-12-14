/**
 * Distribution Empty Submissions Component
 * Displays empty state when a distribution has no submissions yet
 */

import { Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconProgress } from '@tabler/icons-react';
import {
  DISTRIBUTION_MANAGEMENT_ICON_SIZES,
  DISTRIBUTION_MANAGEMENT_LAYOUT,
  DISTRIBUTION_MANAGEMENT_UI,
} from '~/constants/distribution.constants';

export function DistributionEmptySubmissions() {
  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Stack align="center" gap="md">
        <ThemeIcon
          size={DISTRIBUTION_MANAGEMENT_LAYOUT.EMPTY_STATE_SIZE}
          variant="light"
          color="gray"
          radius="xl"
        >
          <IconProgress size={DISTRIBUTION_MANAGEMENT_ICON_SIZES.EMPTY_STATE} />
        </ThemeIcon>
        <Text size="lg" fw={500}>
          {DISTRIBUTION_MANAGEMENT_UI.NO_SUBMISSIONS_TITLE}
        </Text>
        <Text
          size="sm"
          c="dimmed"
          ta="center"
          maw={DISTRIBUTION_MANAGEMENT_LAYOUT.EMPTY_TEXT_MAX_WIDTH}
        >
          {DISTRIBUTION_MANAGEMENT_UI.NO_SUBMISSIONS_MESSAGE}
        </Text>
      </Stack>
    </Paper>
  );
}

