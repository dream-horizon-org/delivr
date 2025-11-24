/**
 * Configuration List Component
 * Display all release configurations for an organization
 */

import { useState } from 'react';
import { Stack, Text, Button, Group, Select, TextInput, SimpleGrid } from '@mantine/core';
import { IconPlus, IconSearch, IconFilter } from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';
import { ConfigurationListItem } from './ConfigurationListItem';
import { exportConfig } from '~/utils/release-config-storage';

interface ConfigurationListProps {
  configurations: ReleaseConfiguration[];
  onEdit: (config: ReleaseConfiguration) => void;
  onDuplicate: (config: ReleaseConfiguration) => void;
  onArchive: (configId: string) => void;
  onSetDefault: (configId: string) => void;
  onCreate: () => void;
}

export function ConfigurationList({
  configurations,
  onEdit,
  onDuplicate,
  onArchive,
  onSetDefault,
  onCreate,
}: ConfigurationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('ACTIVE');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  
  // Filter configurations
  const filteredConfigs = configurations.filter((config) => {
    const matchesSearch =
      !searchQuery ||
      config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Map status filter to isActive field + draft status
    // - DRAFT: config.status === 'DRAFT' (from localStorage)
    // - ACTIVE: config.isActive === true (from backend)
    // - ARCHIVED: config.isActive === false && not draft (from backend)
    const matchesStatus = !statusFilter || 
      (statusFilter === 'DRAFT' && config.status === 'DRAFT') ||
      (statusFilter === 'ACTIVE' && config.isActive === true) ||
      (statusFilter === 'ARCHIVED' && config.isActive === false && config.status !== 'DRAFT');
    
    const matchesType = !typeFilter || config.releaseType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });
  
  const handleExport = (config: ReleaseConfiguration) => {
    const jsonString = exportConfig(config);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, '-').toLowerCase()}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <Stack gap="lg">
      <div>
        <Group justify="apart" className="mb-4">
          <div>
            <Text fw={600} size="xl" className="mb-1">
              Release Configurations
            </Text>
            <Text size="sm" c="dimmed">
              Manage your release management configurations
            </Text>
          </div>
          
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={onCreate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            New Configuration
          </Button>
        </Group>
        
        {/* Filters */}
        <Group gap="md">
          <TextInput
            placeholder="Search configurations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftSection={<IconSearch size={16} />}
            className="flex-1"
          />
          
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
            clearable
            leftSection={<IconFilter size={16} />}
            className="w-40"
          />
          
          <Select
            placeholder="Type"
            value={typeFilter}
            onChange={setTypeFilter}
            data={[
              { value: 'PLANNED', label: 'Planned' },
              { value: 'HOTFIX', label: 'Hotfix' },
              { value: 'MAJOR', label: 'Major' },
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
              ? 'No configurations created yet'
              : 'No configurations match your filters'}
          </Text>
          {configurations.length === 0 && (
            <Button
              variant="light"
              leftSection={<IconPlus size={18} />}
              onClick={onCreate}
            >
              Create First Configuration
            </Button>
          )}
        </div>
      )}
    </Stack>
  );
}

