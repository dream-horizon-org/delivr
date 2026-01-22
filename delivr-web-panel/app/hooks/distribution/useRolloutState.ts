/**
 * useRolloutState - Manages rollout percentage state and changes
 */

import { useCallback, useState } from 'react';

export function useRolloutState(currentPercentage: number) {
  const [targetPercentage, setTargetPercentage] = useState(currentPercentage);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSliderChange = useCallback((value: number) => {
    setTargetPercentage(value);
    setHasChanges(value !== currentPercentage);
  }, [currentPercentage]);

  const selectPreset = useCallback((preset: number) => {
    setTargetPercentage(preset);
    setHasChanges(preset !== currentPercentage);
  }, [currentPercentage]);

  const resetChanges = useCallback(() => {
    setTargetPercentage(currentPercentage);
    setHasChanges(false);
  }, [currentPercentage]);

  return {
    targetPercentage,
    hasChanges,
    handleSliderChange,
    selectPreset,
    resetChanges,
  };
}

