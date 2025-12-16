/**
 * PresetButtons - Quick rollout percentage presets
 */

import { Button, Group } from '@mantine/core';
import { ROLLOUT_PRESETS } from '~/constants/distribution.constants';
import { DS_SPACING } from '~/constants/distribution-design.constants';

export type PresetButtonsProps = {
  currentPercentage: number;
  targetPercentage: number;
  onSelect: (preset: number) => void;
  disabled?: boolean;
};

export function PresetButtons({ 
  currentPercentage,
  targetPercentage,
  onSelect,
  disabled,
}: PresetButtonsProps) {
  const availablePresets = ROLLOUT_PRESETS.filter(p => p > currentPercentage);
  
  return (
    <Group gap={DS_SPACING.XS}>
      {availablePresets.map((preset) => {
        const handleClick = () => onSelect(preset);
        
        return (
          <Button
            key={preset}
            variant={targetPercentage === preset ? 'filled' : 'light'}
            size="xs"
            onClick={handleClick}
            disabled={disabled}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            {preset}%
          </Button>
        );
      })}
    </Group>
  );
}

