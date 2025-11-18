/**
 * Configuration Selector Component
 * Select a configuration or create release manually
 */

import { Card, Text, Radio, Group, Badge, Stack, Alert } from '@mantine/core';
import { IconSettings, IconEdit, IconInfoCircle } from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';

interface ConfigurationSelectorProps {
  configurations: ReleaseConfiguration[];
  selectedMode: 'WITH_CONFIG' | 'MANUAL';
  selectedConfigId?: string;
  onModeChange: (mode: 'WITH_CONFIG' | 'MANUAL') => void;
  onConfigSelect: (configId: string) => void;
}

export function ConfigurationSelector({
  configurations,
  selectedMode,
  selectedConfigId,
  onModeChange,
  onConfigSelect,
}: ConfigurationSelectorProps) {
  const activeConfigs = configurations.filter(c => c.status === 'ACTIVE');
  const defaultConfig = activeConfigs.find(c => c.isDefault);
  
  return (
    <Stack gap="md">
      <div>
        <Text fw={600} size="lg" className="mb-2">
          Choose Creation Mode
        </Text>
        <Text size="sm" c="dimmed">
          Use a saved configuration or create a release manually
        </Text>
      </div>
      
      <Radio.Group value={selectedMode} onChange={(val) => onModeChange(val as any)}>
        <Stack gap="sm">
          {/* With Configuration */}
          <Card
            shadow="sm"
            padding="md"
            radius="md"
            withBorder
            className={`cursor-pointer transition-all ${
              selectedMode === 'WITH_CONFIG'
                ? 'border-blue-500 border-2 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onModeChange('WITH_CONFIG')}
          >
            <Group gap="md" wrap="nowrap">
              <Radio value="WITH_CONFIG" />
              
              <div className="flex-1">
                <Group gap="xs" className="mb-2">
                  <IconSettings size={20} className="text-blue-600" />
                  <Text fw={600} size="md">
                    Use Configuration
                  </Text>
                  <Badge size="sm" variant="light" color="blue">
                    Recommended
                  </Badge>
                </Group>
                
                <Text size="sm" c="dimmed" className="mb-2">
                  Apply a saved configuration with pre-defined pipelines, schedules, and settings.
                  You can customize specific fields after selection.
                </Text>
                
                {activeConfigs.length > 0 ? (
                  <Text size="xs" c="dimmed">
                    {activeConfigs.length} configuration{activeConfigs.length > 1 ? 's' : ''} available
                  </Text>
                ) : (
                  <Alert color="yellow" variant="light" className="mt-2">
                    <Text size="xs">
                      No active configurations found. Create one first in Release Configuration.
                    </Text>
                  </Alert>
                )}
              </div>
            </Group>
          </Card>
          
          {/* Manual Creation */}
          <Card
            shadow="sm"
            padding="md"
            radius="md"
            withBorder
            className={`cursor-pointer transition-all ${
              selectedMode === 'MANUAL'
                ? 'border-blue-500 border-2 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onModeChange('MANUAL')}
          >
            <Group gap="md" wrap="nowrap">
              <Radio value="MANUAL" />
              
              <div className="flex-1">
                <Group gap="xs" className="mb-2">
                  <IconEdit size={20} className="text-gray-600" />
                  <Text fw={600} size="md">
                    Create Manually
                  </Text>
                </Group>
                
                <Text size="sm" c="dimmed">
                  Define all release details manually without using a configuration template.
                  Best for one-off or emergency releases.
                </Text>
              </div>
            </Group>
          </Card>
        </Stack>
      </Radio.Group>
      
      {/* Configuration Selection (if WITH_CONFIG mode) */}
      {selectedMode === 'WITH_CONFIG' && activeConfigs.length > 0 && (
        <div className="mt-4">
          <Text fw={500} size="sm" className="mb-3">
            Select Configuration
          </Text>
          
          <Stack gap="xs">
            {activeConfigs.map((config) => (
              <Card
                key={config.id}
                shadow="xs"
                padding="sm"
                radius="md"
                withBorder
                className={`cursor-pointer transition-all ${
                  selectedConfigId === config.id
                    ? 'border-blue-500 border-2 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-200'
                }`}
                onClick={() => onConfigSelect(config.id)}
              >
                <Group justify="apart">
                  <div className="flex-1">
                    <Group gap="xs" className="mb-1">
                      <Text fw={600} size="sm">
                        {config.name}
                      </Text>
                      
                      {config.isDefault && (
                        <Badge size="xs" variant="light" color="green">
                          Default
                        </Badge>
                      )}
                      
                      <Badge size="xs" variant="outline" color="gray">
                        {config.releaseType}
                      </Badge>
                    </Group>
                    
                    {config.description && (
                      <Text size="xs" c="dimmed" className="mb-2">
                        {config.description}
                      </Text>
                    )}
                    
                    <Group gap="md" className="text-xs text-gray-600">
                      <div>
                        <span className="font-medium">{config.buildPipelines.length}</span> pipelines
                      </div>
                      <div>
                        <span className="font-medium">{config.defaultTargets.length}</span> platforms
                      </div>
                      <div>
                        <span className="font-medium">{config.scheduling.regressionSlots.length}</span> regression slots
                      </div>
                    </Group>
                  </div>
                  
                  {selectedConfigId === config.id && (
                    <IconInfoCircle size={20} className="text-blue-600" />
                  )}
                </Group>
              </Card>
            ))}
          </Stack>
        </div>
      )}
    </Stack>
  );
}

