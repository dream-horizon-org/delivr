import { Card, Text, Group, Badge, Stack, Button, ActionIcon, Menu } from '@mantine/core';
import { IconSettings, IconInfoCircle, IconPlus, IconCopy, IconDotsVertical } from '@tabler/icons-react';
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
  const activeConfigs = configurations.filter(c => c.status === 'ACTIVE');
  
  return (
    <Stack gap="lg">
      <div>
        <Group justify="apart" className="mb-2">
          <div>
            <Text fw={600} size="lg">
              Select Release Configuration
            </Text>
            <Text size="sm" c="dimmed">
              Choose a configuration template for your release
            </Text>
          </div>
          
          {onCreateNew && (
            <Button
              leftSection={<IconPlus size={18} />}
              variant="light"
              onClick={onCreateNew}
            >
              Create New
            </Button>
          )}
        </Group>
      </div>
      
      {/* Configuration List */}
      {activeConfigs.length > 0 ? (
        <Stack gap="sm">
          {activeConfigs.map((config) => (
            <Card
              key={config.id}
              shadow="sm"
              padding="md"
              radius="md"
              withBorder
              className={`cursor-pointer transition-all ${
                selectedConfigId === config.id
                  ? 'border-blue-500 border-2 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200'
              }`}
              onClick={() => onConfigSelect(config.id)}
            >
              <Group justify="apart" wrap="nowrap">
                <div className="flex-1">
                  <Group gap="xs" className="mb-2">
                    <IconSettings size={18} className="text-blue-600" />
                    <Text fw={600} size="md">
                      {config.name}
                    </Text>
                    
                    {config.isDefault && (
                      <Badge size="sm" variant="light" color="green">
                        Default
                      </Badge>
                    )}
                    
                    <Badge size="sm" variant="outline" color="gray">
                      {config.releaseType}
                    </Badge>
                  </Group>
                  
                  {config.description && (
                    <Text size="sm" c="dimmed" className="mb-2">
                      {config.description}
                    </Text>
                  )}
                  
                  <Group gap="lg" className="text-xs text-gray-600">
                    <div>
                      <span className="font-medium">{config.workflows?.length || 0}</span> pipelines
                    </div>
                    <div>
                      <span className="font-medium">{config.targets?.length || 0}</span> platforms
                    </div>
                    <div>
                      <span className="font-medium">{config.scheduling?.regressionSlots?.length || 0}</span> slots
                    </div>
                  </Group>
                </div>
                
                <Group gap="xs">
                  {selectedConfigId === config.id && (
                    <IconInfoCircle size={20} className="text-blue-600" />
                  )}
                  
                  {onClone && (
                    <Menu shadow="md" width={180}>
                      <Menu.Target>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconDotsVertical size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconCopy size={16} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onClone(config.id);
                          }}
                        >
                          Clone & Edit
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  )}
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            No configurations found. Click "Create New" to get started.
          </Text>
        </Card>
      )}
    </Stack>
  );
}

