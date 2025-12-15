/**
 * Releases Filter Component
 * Filter controls for releases list page
 */

import { memo } from 'react';
import { Group, Select } from '@mantine/core';
import { BUILD_MODE_FILTER_OPTIONS, STAGE_FILTER_OPTIONS } from '~/constants/release-filters';
import type { BuildModeFilter, StageFilter } from '~/constants/release-filters';

interface ReleasesFilterProps {
  buildMode: BuildModeFilter;
  stage: StageFilter;
  onBuildModeChange: (value: BuildModeFilter) => void;
  onStageChange: (value: StageFilter) => void;
}

export const ReleasesFilter = memo(function ReleasesFilter({
  buildMode,
  stage,
  onBuildModeChange,
  onStageChange,
}: ReleasesFilterProps) {
  return (
    <Group gap="md">
      <Select
        label="Build Mode"
        placeholder="Select build mode"
        data={BUILD_MODE_FILTER_OPTIONS}
        value={buildMode}
        onChange={(value) => onBuildModeChange(value as BuildModeFilter)}
        clearable={false}
        style={{ minWidth: 150 }}
      />
      <Select
        label="Stage"
        placeholder="Select stage"
        data={STAGE_FILTER_OPTIONS}
        value={stage}
        onChange={(value) => onStageChange(value as StageFilter)}
        clearable={false}
        style={{ minWidth: 180 }}
      />
    </Group>
  );
});


