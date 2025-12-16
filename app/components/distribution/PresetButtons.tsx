/**
 * PresetButtons - Quick rollout percentage presets
 */

import { Button, Group } from '@mantine/core';
import { ROLLOUT_PRESETS } from '~/constants/distribution.constants';

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
    <Group gap="xs">
      {availablePresets.map((preset) => {
        const handleClick = () => onSelect(preset);
        
        return (
          <Button
            key={preset}
            variant={targetPercentage === preset ? 'filled' : 'light'}
            size="xs"
            onClick={handleClick}
            disabled={disabled}
          >
            {preset}%
          </Button>
        );
      })}
    </Group>
  );
}

