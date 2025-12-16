/**
 * AndroidOptions - Android-specific submission options
 * 
 * Note: Track selection removed - AAB submissions go directly to production per API spec
 */

import { Group, Paper, Select, Slider, Stack, Text } from '@mantine/core';
import { IconBrandAndroid } from '@tabler/icons-react';
import { useCallback } from 'react';
import {
  DIST_CARD_PROPS,
  DIST_FONT_WEIGHTS,
  DIST_ICON_SIZES,
  DIST_INPUT_PROPS,
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';
import {
  ANDROID_PRIORITIES,
  DISTRIBUTION_UI_LABELS,
  ROLLOUT_PRESETS
} from '~/constants/distribution.constants';

type AndroidOptionsProps = {
  rollout: number;
  priority: number;
  onRolloutChange: (value: number) => void;
  onPriorityChange: (value: number) => void;
  disabled?: boolean;
};

// Memoized data transformation (computed once)
const ROLLOUT_MARKS = ROLLOUT_PRESETS.map(p => ({ value: p, label: `${p}%` }));

export function AndroidOptions({ 
  rollout,
  priority,
  onRolloutChange,
  onPriorityChange,
  disabled,
}: AndroidOptionsProps) {
  const handlePriorityChange = useCallback((v: string | null) => {
    if (v) onPriorityChange(Number(v));
  }, [onPriorityChange]);

  return (
    <Paper {...DIST_CARD_PROPS.COMPACT} bg={DS_COLORS.BACKGROUND.SUCCESS_LIGHT} p={DS_SPACING.MD}>
      <Group gap={DS_SPACING.XS} mb={DS_SPACING.MD}>
        <IconBrandAndroid size={DIST_ICON_SIZES.LG} className="text-green-600" />
        <Text fw={DIST_FONT_WEIGHTS.MEDIUM} size={DS_TYPOGRAPHY.SIZE.SM}>{DISTRIBUTION_UI_LABELS.ANDROID_OPTIONS}</Text>
      </Group>
      
      <Stack gap={DS_SPACING.MD}>
        <Select
          label={DISTRIBUTION_UI_LABELS.ANDROID_UPDATE_PRIORITY}
          description={DISTRIBUTION_UI_LABELS.ANDROID_UPDATE_PRIORITY_DESC}
          value={String(priority)}
          onChange={handlePriorityChange}
          data={ANDROID_PRIORITIES}
          disabled={disabled}
          {...DIST_INPUT_PROPS.DEFAULT}
        />

        <div>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.MEDIUM} mb={DS_SPACING.XS}>{DISTRIBUTION_UI_LABELS.ANDROID_ROLLOUT_PERCENTAGE}</Text>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY} mb={DS_SPACING.SM}>
            {DISTRIBUTION_UI_LABELS.ANDROID_ROLLOUT_PERCENTAGE_DESC}
          </Text>
          <Slider
            value={rollout}
            onChange={onRolloutChange}
            min={1}
            max={100}
            step={0.1}
            precision={1}
            marks={ROLLOUT_MARKS}
            disabled={disabled}
          />
          <Text size={DS_TYPOGRAPHY.SIZE.SM} ta="center" mt={DS_SPACING.SM} fw={DIST_FONT_WEIGHTS.MEDIUM}>
            {rollout.toFixed(1)}%
          </Text>
        </div>
      </Stack>
    </Paper>
  );
}

