/**
 * Configurations Filter Component
 * Filter controls for configurations list page
 */

import { memo } from 'react';
import { 
  Group, 
  Select, 
  TextInput,
  Paper, 
  Text, 
  Badge, 
  ActionIcon, 
  Tooltip 
} from '@mantine/core';
import { IconFilter, IconFilterOff, IconSearch } from '@tabler/icons-react';
import { CONFIG_STATUS, RELEASE_TYPE } from '~/constants/release-config-ui';

export type ConfigStatusFilter = typeof CONFIG_STATUS.ACTIVE | typeof CONFIG_STATUS.ARCHIVED | null;
export type ConfigTypeFilter = typeof RELEASE_TYPE.MINOR | typeof RELEASE_TYPE.HOTFIX | typeof RELEASE_TYPE.MAJOR | null;

interface ConfigurationsFilterProps {
  searchQuery: string;
  statusFilter: ConfigStatusFilter;
  typeFilter: ConfigTypeFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ConfigStatusFilter) => void;
  onTypeChange: (value: ConfigTypeFilter) => void;
  onClearFilters: () => void;
  configCount: number;
}

export const ConfigurationsFilter = memo(function ConfigurationsFilter({
  searchQuery,
  statusFilter,
  typeFilter,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onClearFilters,
  configCount,
}: ConfigurationsFilterProps) {
  const hasActiveFilters = !!statusFilter || !!typeFilter || !!searchQuery;
  const activeFilterCount = [
    statusFilter ? statusFilter : null,
    typeFilter ? typeFilter : null,
    searchQuery ? 'search' : null
  ].filter(Boolean).length;

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
      <Group justify="space-between" align="center">
        <Group gap="md" style={{ flex: 1 }}>
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
            placeholder="All Statuses"
            value={statusFilter}
            onChange={(value) => onStatusChange(value as ConfigStatusFilter)}
            data={[
              { value: CONFIG_STATUS.ACTIVE, label: 'Active' },
              { value: CONFIG_STATUS.ARCHIVED, label: 'Archived' },
            ]}
            clearable
            size="sm"
            w={160}
          />
          <Select
            placeholder="All Types"
            value={typeFilter}
            onChange={(value) => onTypeChange(value as ConfigTypeFilter)}
            data={[
              { value: RELEASE_TYPE.MINOR, label: 'Minor' },
              { value: RELEASE_TYPE.HOTFIX, label: 'Hotfix' },
              { value: RELEASE_TYPE.MAJOR, label: 'Major' },
            ]}
            clearable
            size="sm"
            w={140}
          />
          <TextInput
            placeholder="Search configurations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1, maxWidth: 400 }}
            size="sm"
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

