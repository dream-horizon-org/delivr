/**
 * DistributionListFilters - Filter controls for distributions list page
 * 
 * Features:
 * - Search by version/branch
 * - Filter by status (multi-select)
 * - Filter by platform checkboxes
 * - Date range picker
 * - Clear all filters button
 */

import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCalendar, IconFilter, IconSearch, IconX } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import {
  DISTRIBUTION_STATUS_LABELS,
  PLATFORM_LABELS,
} from '~/constants/distribution.constants';
import { DistributionStatus, Platform } from '~/types/distribution.types';

// ============================================================================
// TYPES
// ============================================================================

export type DistributionFilters = {
  search: string;
  status: DistributionStatus[];
  platforms: Platform[];
  dateFrom: Date | null;
  dateTo: Date | null;
};

export type DistributionListFiltersProps = {
  filters: DistributionFilters;
  onFiltersChange: (filters: DistributionFilters) => void;
  onApply: () => void;
  onClear: () => void;
  isLoading?: boolean;
};

// ============================================================================
// HELPERS
// ============================================================================

function hasActiveFilters(filters: DistributionFilters): boolean {
  return (
    filters.search.length > 0 ||
    filters.status.length > 0 ||
    filters.platforms.length > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DistributionListFilters({
  filters,
  onFiltersChange,
  onApply,
  onClear,
  isLoading = false,
}: DistributionListFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusOptions = useMemo(() => {
    return Object.entries(DISTRIBUTION_STATUS_LABELS).map(([value, label]) => ({
      value,
      label,
    }));
  }, []);

  const hasFilters = useMemo(() => hasActiveFilters(filters), [filters]);

  // Handlers
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ ...filters, search: event.currentTarget.value });
    },
    [filters, onFiltersChange]
  );

  const handleStatusChange = useCallback(
    (value: string | null) => {
      if (!value) {
        onFiltersChange({ ...filters, status: [] });
        return;
      }
      const currentStatus = filters.status;
      const statusValue = value as DistributionStatus;
      const newStatus = currentStatus.includes(statusValue)
        ? currentStatus.filter((s) => s !== statusValue)
        : [...currentStatus, statusValue];
      onFiltersChange({ ...filters, status: newStatus });
    },
    [filters, onFiltersChange]
  );

  const handlePlatformToggle = useCallback(
    (platform: Platform) => {
      const currentPlatforms = filters.platforms;
      const newPlatforms = currentPlatforms.includes(platform)
        ? currentPlatforms.filter((p) => p !== platform)
        : [...currentPlatforms, platform];
      onFiltersChange({ ...filters, platforms: newPlatforms });
    },
    [filters, onFiltersChange]
  );

  const handleDateRangeChange = useCallback(
    (dates: [Date | null, Date | null]) => {
      onFiltersChange({
        ...filters,
        dateFrom: dates[0],
        dateTo: dates[1],
      });
    },
    [filters, onFiltersChange]
  );

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Stack gap="md">
        {/* Top Row: Search + Toggle Filters */}
        <Group justify="space-between" wrap="nowrap">
          <TextInput
            placeholder="Search by version or branch..."
            leftSection={<IconSearch size={16} />}
            value={filters.search}
            onChange={handleSearchChange}
            disabled={isLoading}
            style={{ flex: 1, maxWidth: 400 }}
            rightSection={
              filters.search && (
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  onClick={() => onFiltersChange({ ...filters, search: '' })}
                >
                  <IconX size={14} />
                </ActionIcon>
              )
            }
          />

          <Group gap="xs">
            {hasFilters && (
              <Button
                variant="subtle"
                color="gray"
                size="sm"
                onClick={onClear}
                disabled={isLoading}
              >
                Clear Filters
              </Button>
            )}
            
            <Button
              variant={isExpanded ? 'filled' : 'light'}
              color="blue"
              size="sm"
              leftSection={<IconFilter size={16} />}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              Filters
              {hasFilters && ` (${
                (filters.status.length > 0 ? 1 : 0) +
                (filters.platforms.length > 0 ? 1 : 0) +
                (filters.dateFrom || filters.dateTo ? 1 : 0)
              })`}
            </Button>
          </Group>
        </Group>

        {/* Expanded Filters */}
        {isExpanded && (
          <>
            <Group align="flex-start" grow>
              {/* Status Filter */}
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Status
                </Text>
                <Stack gap="xs">
                  {statusOptions.map((option) => (
                    <Checkbox
                      key={option.value}
                      label={option.label}
                      checked={filters.status.includes(option.value as DistributionStatus)}
                      onChange={() => handleStatusChange(option.value)}
                      disabled={isLoading}
                      size="sm"
                    />
                  ))}
                </Stack>
              </div>

              {/* Platform Filter */}
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Platform
                </Text>
                <Stack gap="xs">
                  <Checkbox
                    label={PLATFORM_LABELS[Platform.ANDROID]}
                    checked={filters.platforms.includes(Platform.ANDROID)}
                    onChange={() => handlePlatformToggle(Platform.ANDROID)}
                    disabled={isLoading}
                    size="sm"
                  />
                  <Checkbox
                    label={PLATFORM_LABELS[Platform.IOS]}
                    checked={filters.platforms.includes(Platform.IOS)}
                    onChange={() => handlePlatformToggle(Platform.IOS)}
                    disabled={isLoading}
                    size="sm"
                  />
                </Stack>
              </div>

              {/* Date Range Filter */}
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Date Range
                </Text>
                <DatePickerInput
                  type="range"
                  placeholder="Pick date range"
                  value={[filters.dateFrom, filters.dateTo]}
                  onChange={handleDateRangeChange}
                  disabled={isLoading}
                  leftSection={<IconCalendar size={16} />}
                  clearable
                  size="sm"
                />
              </div>
            </Group>

            {/* Apply Button */}
            <Group justify="flex-end">
              <Button
                size="sm"
                onClick={onApply}
                disabled={isLoading || !hasFilters}
                loading={isLoading}
              >
                Apply Filters
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Paper>
  );
}

