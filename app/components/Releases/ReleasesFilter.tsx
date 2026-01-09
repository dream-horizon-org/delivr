/**
 * Releases Filter Component
 * Filter controls for releases list page
 */

import { memo } from 'react';
import { 
  Group, 
  Select, 
  Paper, 
  Text, 
  Badge, 
  ActionIcon, 
  Tooltip 
} from '@mantine/core';
import { IconFilter, IconFilterOff } from '@tabler/icons-react';
import { BUILD_MODE_FILTER_OPTIONS, STAGE_FILTER_OPTIONS, BUILD_MODE_FILTERS, STAGE_FILTERS } from '~/constants/release-filters';
import type { BuildModeFilter, StageFilter } from '~/constants/release-filters';

interface ReleasesFilterProps {
  buildMode: BuildModeFilter;
  stage: StageFilter;
  onBuildModeChange: (value: BuildModeFilter | null) => void;
  onStageChange: (value: StageFilter | null) => void;
  onClearFilters: () => void;
}

export const ReleasesFilter = memo(function ReleasesFilter({
  buildMode,
  stage,
  onBuildModeChange,
  onStageChange,
  onClearFilters,
}: ReleasesFilterProps) {
  const hasActiveFilters = buildMode !== BUILD_MODE_FILTERS.ALL || stage !== STAGE_FILTERS.ALL;
  const activeFilterCount = [
    buildMode !== BUILD_MODE_FILTERS.ALL ? buildMode : null, 
    stage !== STAGE_FILTERS.ALL ? stage : null
  ].filter(Boolean).length;

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
      <Group justify="space-between" align="center">
        <Group gap="md">
          <Group gap="xs" w={100}>
            <IconFilter size={18} color="gray" />
            <Text size="sm" fw={500} c="dimmed">Filters</Text>
            <Badge 
              size="sm" 
              variant="filled" 
              color="blue"
              style={{ 
                opacity: hasActiveFilters ? 1 : 0,
                transition: 'opacity 150ms ease',
              }}
            >
              {activeFilterCount || 0}
            </Badge>
          </Group>
          <Select
            placeholder="All Modes"
            data={BUILD_MODE_FILTER_OPTIONS}
            value={buildMode === BUILD_MODE_FILTERS.ALL ? null : buildMode}
            onChange={(value) => onBuildModeChange(value as BuildModeFilter | null)}
            clearable
            size="sm"
            w={150}
          />
          <Select
            placeholder="All Stages"
            data={STAGE_FILTER_OPTIONS}
            value={stage === STAGE_FILTERS.ALL ? null : stage}
            onChange={(value) => onStageChange(value as StageFilter | null)}
            clearable
            size="sm"
            w={180}
          />
        </Group>
        <Tooltip label="Clear all filters" disabled={!hasActiveFilters}>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={onClearFilters}
            size="lg"
            style={{ 
              opacity: hasActiveFilters ? 1 : 0,
              pointerEvents: hasActiveFilters ? 'auto' : 'none',
              transition: 'opacity 150ms ease',
            }}
          >
            <IconFilterOff size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Paper>
  );
});


