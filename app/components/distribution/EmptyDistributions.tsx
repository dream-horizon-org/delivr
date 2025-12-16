/**
 * Empty Distributions Component
 * Displays empty state when no distributions exist
 */

import { Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconList } from '@tabler/icons-react';
import {
  DIST_CARD_PROPS,
  DIST_EMPTY_STATE,
  DS_TYPOGRAPHY,
  DIST_FONT_WEIGHTS,
  DS_SPACING,
  DS_COLORS,
} from '~/constants/distribution-design.constants';
import {
  DISTRIBUTIONS_LIST_LAYOUT,
  DISTRIBUTIONS_LIST_UI,
} from '~/constants/distribution.constants';

export function EmptyDistributions() {
  return (
    <Paper {...DIST_CARD_PROPS.DEFAULT} p={DS_SPACING.XL}>
      <Stack align="center" gap={DS_SPACING.MD}>
        <ThemeIcon
          size={DIST_EMPTY_STATE.ICON_SIZE}
          variant={DIST_EMPTY_STATE.ICON_VARIANT}
          color={DIST_EMPTY_STATE.ICON_COLOR}
          radius="xl"
        >
          <IconList size={DIST_EMPTY_STATE.ICON_SIZE * 0.6} />
        </ThemeIcon>
        <Text size={DIST_EMPTY_STATE.TEXT_SIZE} fw={DIST_FONT_WEIGHTS.MEDIUM}>
          {DISTRIBUTIONS_LIST_UI.EMPTY_TITLE}
        </Text>
        <Text
          size={DIST_EMPTY_STATE.DESCRIPTION_SIZE}
          c={DIST_EMPTY_STATE.DESCRIPTION_COLOR}
          ta="center"
          maw={DISTRIBUTIONS_LIST_LAYOUT.EMPTY_TEXT_MAX_WIDTH}
        >
          {DISTRIBUTIONS_LIST_UI.EMPTY_MESSAGE}
        </Text>
      </Stack>
    </Paper>
  );
}

