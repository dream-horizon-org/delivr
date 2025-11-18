/**
 * Configuration List Item Component
 * Display a single configuration in the list
 */

import { Card, Text, Badge, Group, ActionIcon, Tooltip, Menu } from '@mantine/core';
import { IconDots, IconEdit, IconCopy, IconArchive, IconDownload, IconStar, IconStarFilled } from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';

interface ConfigurationListItemProps {
  config: ReleaseConfiguration;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onExport: () => void;
  onSetDefault: () => void;
}

const statusColors = {
  DRAFT: 'gray',
  ACTIVE: 'green',
  ARCHIVED: 'red',
};

const releaseTypeColors = {
  PLANNED: 'blue',
  HOTFIX: 'orange',
  EMERGENCY: 'red',
};

export function ConfigurationListItem({
  config,
  onEdit,
  onDuplicate,
  onArchive,
  onExport,
  onSetDefault,
}: ConfigurationListItemProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Group gap="xs" className="mb-2">
            <Text fw={600} size="md">
              {config.name}
            </Text>
            
            {config.isDefault && (
              <Tooltip label="Default Configuration">
                <IconStarFilled size={16} className="text-yellow-500" />
              </Tooltip>
            )}
            
            <Badge size="sm" variant="light" color={statusColors[config.status]}>
              {config.status}
            </Badge>
            
            <Badge size="sm" variant="outline" color={releaseTypeColors[config.releaseType]}>
              {config.releaseType}
            </Badge>
          </Group>
          
          {config.description && (
            <Text size="sm" c="dimmed" className="mb-3">
              {config.description}
            </Text>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <Text size="xs" c="dimmed">
                Pipelines
              </Text>
              <Text fw={500}>{config.buildPipelines.length}</Text>
            </div>
            
            <div>
              <Text size="xs" c="dimmed">
                Platforms
              </Text>
              <Text fw={500}>{config.defaultTargets.length}</Text>
            </div>
            
            <div>
              <Text size="xs" c="dimmed">
                Frequency
              </Text>
              <Text fw={500}>{config.scheduling.releaseFrequency}</Text>
            </div>
            
            <div>
              <Text size="xs" c="dimmed">
                Regression Slots
              </Text>
              <Text fw={500}>{config.scheduling.regressionSlots.length}</Text>
            </div>
          </div>
        </div>
        
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray">
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEdit size={16} />} onClick={onEdit}>
              Edit Configuration
            </Menu.Item>
            
            {!config.isDefault && (
              <Menu.Item leftSection={<IconStar size={16} />} onClick={onSetDefault}>
                Set as Default
              </Menu.Item>
            )}
            
            <Menu.Item leftSection={<IconCopy size={16} />} onClick={onDuplicate}>
              Duplicate
            </Menu.Item>
            
            <Menu.Item leftSection={<IconDownload size={16} />} onClick={onExport}>
              Export JSON
            </Menu.Item>
            
            <Menu.Divider />
            
            <Menu.Item
              leftSection={<IconArchive size={16} />}
              color="red"
              onClick={onArchive}
              disabled={config.status === 'ARCHIVED'}
            >
              Archive
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <Text size="xs" c="dimmed">
          Created: {formatDate(config.createdAt)}
        </Text>
        <Text size="xs" c="dimmed">
          Updated: {formatDate(config.updatedAt)}
        </Text>
      </div>
    </Card>
  );
}

