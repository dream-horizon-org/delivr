/**
 * Configuration Selector Component
 * 
 * Dropdown selector with preview card for selected configuration.
 * Replaces the multi-card view with a cleaner dropdown + preview approach.
 */

import { Card, Text, Group, Badge, Stack, Button, Select } from '@mantine/core';
import { IconSettings, IconInfoCircle, IconPlus, IconCopy } from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';

interface ConfigurationSelectorProps {
  configurations: ReleaseConfiguration[];
  selectedMode: 'WITH_CONFIG' | 'MANUAL'; // Keep for compatibility
  selectedConfigId?: string;
  onModeChange: (mode: 'WITH_CONFIG' | 'MANUAL') => void; // Keep for compatibility
  onConfigSelect: (configId: string) => void;
  onCreateNew?: () => void;
  onClone?: (configId: string) => void;
}

export function ConfigurationSelector({
  configurations,
  selectedConfigId,
  onConfigSelect,
  onCreateNew,
  onClone,
}: ConfigurationSelectorProps) {
  // Filter active configs
  const activeConfigs = configurations.filter((c) => c.isActive === true);

  // Get selected config for preview
  const selectedConfig = activeConfigs.find((c) => c.id === selectedConfigId);

  // Prepare dropdown options
  const configOptions = activeConfigs.map((config) => ({
    value: config.id,
    label: config.name,
  }));

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Select
          label="Configuration"
          placeholder="Select a configuration"
          data={configOptions}
          value={selectedConfigId || null}
          onChange={(value) => {
            if (value) {
              onConfigSelect(value);
            }
          }}
          required
          searchable
          description="Choose a configuration template for your release"
          style={{ flex: 1 }}
        />

        {onCreateNew && (
          <Button
            leftSection={<IconPlus size={18} />}
            variant="light"
            onClick={onCreateNew}
            style={{ marginTop: '24px' }}
          >
            Create New
          </Button>
        )}
      </Group>

      {/* Preview Card for Selected Configuration */}
      {selectedConfig && (
        <Card shadow="sm" padding="md" radius="md" withBorder className="border-blue-300 bg-blue-50">
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <div className="flex-1">
              <Group gap="xs" className="mb-2">
                <IconSettings size={18} className="text-blue-600" />
                <Text fw={600} size="md">
                  {selectedConfig.name}
                </Text>

                {selectedConfig.isDefault && (
                  <Badge size="sm" variant="light" color="green">
                    Default
                  </Badge>
                )}

                <Badge size="sm" variant="outline" color="gray">
                  {selectedConfig.releaseType}
                </Badge>
              </Group>

              {selectedConfig.description && (
                <Text size="sm" c="dimmed" className="mb-2">
                  {selectedConfig.description}
                </Text>
              )}

              <Group gap="lg" className="text-xs text-gray-600">
                <div>
                  <span className="font-medium">{selectedConfig.workflows?.length || 0}</span> pipelines
                </div>
                <div>
                  <span className="font-medium">{selectedConfig.targets?.length || 0}</span> platforms
                </div>
                <div>
                  <span className="font-medium">
                    {selectedConfig.scheduling?.regressionSlots?.length || 0}
                  </span>{' '}
                  slots
                </div>
              </Group>
            </div>

            {onClone && (
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconCopy size={16} />}
                onClick={() => onClone(selectedConfig.id)}
              >
                Clone
              </Button>
            )}
          </Group>
        </Card>
      )}

      {activeConfigs.length === 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            No configurations found. Click "Create New" to get started.
          </Text>
        </Card>
      )}
    </Stack>
  );
}
