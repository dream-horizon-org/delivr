/**
 * Distribution Empty Submissions Component
 * Displays empty state when a distribution has no submissions yet
 */

import { Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconProgress } from '@tabler/icons-react';
import {
  DIST_CARD_PROPS,
  DIST_EMPTY_STATE,
  DIST_FONT_WEIGHTS,
  DS_SPACING,
} from '~/constants/distribution-design.constants';
import {
  DISTRIBUTION_MANAGEMENT_LAYOUT,
  DISTRIBUTION_MANAGEMENT_UI,
} from '~/constants/distribution.constants';

export function DistributionEmptySubmissions() {
  return (
    <Paper {...DIST_CARD_PROPS.DEFAULT} p={DS_SPACING.XL}>
      <Stack align="center" gap={DS_SPACING.MD}>
        <ThemeIcon
          size={DIST_EMPTY_STATE.ICON_SIZE}
          variant={DIST_EMPTY_STATE.ICON_VARIANT}
          color={DIST_EMPTY_STATE.ICON_COLOR}
          radius="xl"
        >
          <IconProgress size={DIST_EMPTY_STATE.ICON_SIZE * 0.6} />
        </ThemeIcon>
        <Text size={DIST_EMPTY_STATE.TEXT_SIZE} fw={DIST_FONT_WEIGHTS.MEDIUM}>
          {DISTRIBUTION_MANAGEMENT_UI.NO_SUBMISSIONS_TITLE}
        </Text>
        <Text
          size={DIST_EMPTY_STATE.DESCRIPTION_SIZE}
          c={DIST_EMPTY_STATE.DESCRIPTION_COLOR}
          ta="center"
          maw={DISTRIBUTION_MANAGEMENT_LAYOUT.EMPTY_TEXT_MAX_WIDTH}
        >
          {DISTRIBUTION_MANAGEMENT_UI.NO_SUBMISSIONS_MESSAGE}
        </Text>
      </Stack>
    </Paper>
  );
}

