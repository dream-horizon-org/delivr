/**
 * Workflows Filter Component
 * Filter controls for workflows list page
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
import { 
  PLATFORM_FILTER_OPTIONS, 
  BUILD_ENVIRONMENT_FILTER_OPTIONS, 
  PLATFORM_FILTERS, 
  BUILD_ENVIRONMENT_FILTERS 
} from '~/constants/workflow-filters';
import type { PlatformFilter, BuildEnvironmentFilter } from '~/constants/workflow-filters';

interface WorkflowsFilterProps {
  platform: PlatformFilter;
  buildEnvironment: BuildEnvironmentFilter;
  onPlatformChange: (value: PlatformFilter | null) => void;
  onBuildEnvironmentChange: (value: BuildEnvironmentFilter | null) => void;
  onClearFilters: () => void;
}

export const WorkflowsFilter = memo(function WorkflowsFilter({
  platform,
  buildEnvironment,
  onPlatformChange,
  onBuildEnvironmentChange,
  onClearFilters,
}: WorkflowsFilterProps) {
  const hasActiveFilters = platform !== PLATFORM_FILTERS.ALL || buildEnvironment !== BUILD_ENVIRONMENT_FILTERS.ALL;
  const activeFilterCount = [
    platform !== PLATFORM_FILTERS.ALL ? platform : null, 
    buildEnvironment !== BUILD_ENVIRONMENT_FILTERS.ALL ? buildEnvironment : null
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
            placeholder="All Platforms"
            data={PLATFORM_FILTER_OPTIONS}
            value={platform === PLATFORM_FILTERS.ALL ? null : platform}
            onChange={(value) => onPlatformChange(value as PlatformFilter | null)}
            clearable
            size="sm"
            w={150}
          />
          <Select
            placeholder="All Environments"
            data={BUILD_ENVIRONMENT_FILTER_OPTIONS}
            value={buildEnvironment === BUILD_ENVIRONMENT_FILTERS.ALL ? null : buildEnvironment}
            onChange={(value) => onBuildEnvironmentChange(value as BuildEnvironmentFilter | null)}
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

