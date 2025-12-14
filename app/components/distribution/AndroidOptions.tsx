/**
 * AndroidOptions - Android-specific submission options
 */

import { Group, Paper, Select, Slider, Stack, Text } from '@mantine/core';
import { IconBrandAndroid } from '@tabler/icons-react';
import { useCallback } from 'react';
import {
  ANDROID_PRIORITIES,
  ANDROID_TRACKS,
  DISTRIBUTION_UI_LABELS,
  FORM_ICON_SIZES,
  ROLLOUT_PRESETS
} from '~/constants/distribution.constants';

type AndroidOptionsProps = {
  track: string;
  rollout: number;
  priority: number;
  onTrackChange: (value: string) => void;
  onRolloutChange: (value: number) => void;
  onPriorityChange: (value: number) => void;
  disabled?: boolean;
};

// Memoized data transformations (computed once)
const ANDROID_TRACKS_DATA = ANDROID_TRACKS.map(t => ({ value: t.value, label: t.label }));
const ROLLOUT_MARKS = ROLLOUT_PRESETS.map(p => ({ value: p, label: `${p}%` }));

export function AndroidOptions({ 
  track, 
  rollout,
  priority,
  onTrackChange,
  onRolloutChange,
  onPriorityChange,
  disabled,
}: AndroidOptionsProps) {
  const handleTrackChange = useCallback((v: string | null) => {
    if (v) onTrackChange(v);
  }, [onTrackChange]);

  const handlePriorityChange = useCallback((v: string | null) => {
    if (v) onPriorityChange(Number(v));
  }, [onPriorityChange]);

  return (
    <Paper p="md" withBorder radius="md" bg="green.0">
      <Group gap="xs" mb="md">
        <IconBrandAndroid size={FORM_ICON_SIZES.INPUT} className="text-green-600" />
        <Text fw={500} size="sm">{DISTRIBUTION_UI_LABELS.ANDROID_OPTIONS}</Text>
      </Group>
      
      <Stack gap="md">
        <Select
          label={DISTRIBUTION_UI_LABELS.ANDROID_RELEASE_TRACK}
          description={DISTRIBUTION_UI_LABELS.ANDROID_RELEASE_TRACK_DESC}
          value={track}
          onChange={handleTrackChange}
          data={ANDROID_TRACKS_DATA}
          disabled={disabled}
        />

        <Select
          label={DISTRIBUTION_UI_LABELS.ANDROID_UPDATE_PRIORITY}
          description={DISTRIBUTION_UI_LABELS.ANDROID_UPDATE_PRIORITY_DESC}
          value={String(priority)}
          onChange={handlePriorityChange}
          data={ANDROID_PRIORITIES}
          disabled={disabled}
        />

        <div>
          <Text size="sm" fw={500} mb="xs">{DISTRIBUTION_UI_LABELS.ANDROID_ROLLOUT_PERCENTAGE}</Text>
          <Text size="xs" c="dimmed" mb="sm">
            {DISTRIBUTION_UI_LABELS.ANDROID_ROLLOUT_PERCENTAGE_DESC}
          </Text>
          <Slider
            value={rollout}
            onChange={onRolloutChange}
            min={1}
            max={100}
            marks={ROLLOUT_MARKS}
            disabled={disabled}
          />
          <Text size="sm" ta="center" mt="sm" fw={500}>
            {rollout}%
          </Text>
        </div>
      </Stack>
    </Paper>
  );
}

