/**
 * Configuration List Component
 * Display all release configurations for an organization
 */

import { useState } from 'react';
import { Stack, Text, Button, Group, Select, TextInput, SimpleGrid } from '@mantine/core';
import { IconPlus, IconSearch, IconFilter } from '@tabler/icons-react';
import type { ConfigurationListProps } from '~/types/release-config-props';
import type { ReleaseConfiguration } from '~/types/release-config';
import { CONFIG_LIST_LABELS, CONFIG_STATUS, RELEASE_TYPE } from '~/constants/release-config-ui';
import { ConfigurationListItem } from './ConfigurationListItem';
import { exportConfig } from '~/utils/release-config-storage';

export function ConfigurationList({
  configurations,
  onEdit,
  onDuplicate,
  onArchive,
  onSetDefault,
  onCreate,
}: ConfigurationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(CONFIG_STATUS.ACTIVE);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  
  // Filter configurations
  const filteredConfigs = configurations.filter((config) => {
    const matchesSearch =
      !searchQuery ||
      config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Map status filter to isActive field
    // - ACTIVE: config.isActive === true (from backend)
    // - ARCHIVED: config.isActive === false && not draft (from backend)
    // Note: Drafts are always shown regardless of filter
    const matchesStatus = !statusFilter || 
      (statusFilter === CONFIG_STATUS.ACTIVE && config.isActive === true) ||
      (statusFilter === CONFIG_STATUS.ARCHIVED && config.isActive === false && config.status !== CONFIG_STATUS.DRAFT);
    
    const matchesType = !typeFilter || config.releaseType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });
  
  const handleExport = (config: ReleaseConfiguration) => {
    const jsonString = exportConfig(config);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, '-').toLowerCase()}${CONFIG_LIST_LABELS.EXPORT_FILE_SUFFIX}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <Stack gap="lg">
      <div>
        <Group justify="apart" className="mb-4">
          <div>
            <Text fw={600} size="xl" className="mb-1">
              {CONFIG_LIST_LABELS.PAGE_TITLE}
            </Text>
            <Text size="sm" c="dimmed">
              {CONFIG_LIST_LABELS.PAGE_DESCRIPTION}
            </Text>
          </div>
          
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={onCreate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {CONFIG_LIST_LABELS.NEW_CONFIGURATION}
          </Button>
        </Group>
        
        {/* Filters */}
        <Group gap="md">
          <TextInput
            placeholder={CONFIG_LIST_LABELS.SEARCH_PLACEHOLDER}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftSection={<IconSearch size={16} />}
            className="flex-1"
          />
          
          <Select
            placeholder={CONFIG_LIST_LABELS.STATUS_FILTER_PLACEHOLDER}
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: CONFIG_STATUS.ACTIVE, label: CONFIG_LIST_LABELS.STATUS_ACTIVE },
              { value: CONFIG_STATUS.ARCHIVED, label: CONFIG_LIST_LABELS.STATUS_ARCHIVED },
            ]}
            clearable
            leftSection={<IconFilter size={16} />}
            className="w-40"
          />
          
          <Select
            placeholder={CONFIG_LIST_LABELS.TYPE_FILTER_PLACEHOLDER}
            value={typeFilter}
            onChange={setTypeFilter}
            data={[
              { value: RELEASE_TYPE.PLANNED, label: CONFIG_LIST_LABELS.TYPE_PLANNED },
              { value: RELEASE_TYPE.HOTFIX, label: CONFIG_LIST_LABELS.TYPE_HOTFIX },
              { value: RELEASE_TYPE.MAJOR, label: CONFIG_LIST_LABELS.TYPE_MAJOR },
            ]}
            clearable
            leftSection={<IconFilter size={16} />}
            className="w-40"
          />
        </Group>
      </div>
      
      {filteredConfigs.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 1, md: 2, lg: 2, xl: 3 }} spacing="lg">
          {filteredConfigs.map((config) => (
            <ConfigurationListItem
              key={config.id}
              config={config}
              onEdit={() => onEdit(config)}
              onDuplicate={() => onDuplicate(config)}
              onArchive={() => onArchive(config.id)}
              onExport={() => handleExport(config)}
              onSetDefault={() => onSetDefault(config.id)}
            />
          ))}
        </SimpleGrid>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Text size="sm" c="dimmed" className="mb-4">
            {configurations.length === 0
              ? CONFIG_LIST_LABELS.NO_CONFIGS_MESSAGE
              : CONFIG_LIST_LABELS.NO_MATCHES_MESSAGE}
          </Text>
          {configurations.length === 0 && (
            <Button
              variant="light"
              leftSection={<IconPlus size={18} />}
              onClick={onCreate}
            >
              {CONFIG_LIST_LABELS.NEW_CONFIGURATION}
            </Button>
          )}
        </div>
      )}
    </Stack>
  );
}

