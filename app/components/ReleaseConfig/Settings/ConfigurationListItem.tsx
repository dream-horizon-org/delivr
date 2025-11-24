/**
 * Configuration List Item Component
 * Display a single configuration in the list
 */

import { Card, Text, Badge, Group, ActionIcon, Tooltip, Menu, Button, Box } from '@mantine/core';
import { 
  IconDots, IconEdit, IconCopy, IconArchive, IconDownload, IconStar, IconStarFilled,
  IconDeviceMobile, IconBrandAndroid, IconBrandApple, IconCalendar, IconTarget,
  IconLayersIntersect
} from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';
import type { ConfigurationListItemProps } from '~/types/release-config-props';
import { PLATFORMS } from '~/types/release-config-constants';

// Helper to get status display from isActive field or draft status
const getStatusDisplay = (config: any) => {
  // Check if it's a draft config (from localStorage)
  if (config.status === 'DRAFT') {
    return { label: 'DRAFT', color: 'gray' };
  }
  
  // Backend configs use isActive field
  return config.isActive
    ? { label: 'ACTIVE', color: 'green' }
    : { label: 'ARCHIVED', color: 'red' };
};

const releaseTypeColors = {
  PLANNED: 'blue',
  HOTFIX: 'orange',
  MAJOR: 'red',
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
  
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };
  
  // Get status display based on isActive field or draft status
  const statusDisplay = getStatusDisplay(config);
  const isDraft = config.status === 'DRAFT';
  
  // Platform icons mapping
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case PLATFORMS.ANDROID: return <IconBrandAndroid size={16} />;
      case PLATFORMS.IOS: return <IconBrandApple size={16} />;
      default: return <IconDeviceMobile size={16} />;
    }
  };
  
  // Get gradient for release type
  const getReleaseTypeGradient = (type: string) => {
    switch (type) {
      case 'PLANNED': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'HOTFIX': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'MAJOR': return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
      default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };
  
  return (
    <Card 
      shadow="md" 
      padding={0}
      radius="lg" 
      className="overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-300"
    >
      {/* Header with gradient */}
      <Box 
        style={{ 
          background: getReleaseTypeGradient(config.releaseType),
          padding: '16px 20px',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Group gap="xs" className="mb-1">
              <Text fw={700} size="lg" c="white">
                {config.name}
              </Text>
              
              {config.isDefault && (
                <Tooltip label="Default Configuration">
                  <IconStarFilled size={18} className="text-yellow-300" />
                </Tooltip>
              )}
            </Group>
            
            <Group gap="xs">
              <Badge 
                size="sm" 
                variant="light" 
                color={statusDisplay.color}
                className="bg-white/20 text-white border-white/30"
              >
                {statusDisplay.label}
              </Badge>
              
              <Badge 
                size="sm" 
                variant="light"
                className="bg-white/20 text-white border-white/30"
              >
                {config.releaseType}
              </Badge>
            </Group>
          </div>
          
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="white" size="lg">
                <IconDots size={20} />
              </ActionIcon>
            </Menu.Target>
            
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconEdit size={16} />} onClick={onEdit}>
                {isDraft ? 'Continue Editing' : 'Edit Configuration'}
              </Menu.Item>
              
              {!isDraft && !config.isDefault && (
                <Menu.Item leftSection={<IconStar size={16} />} onClick={onSetDefault}>
                  Set as Default
                </Menu.Item>
              )}
              
              {!isDraft && (
                <Menu.Item leftSection={<IconCopy size={16} />} onClick={onDuplicate}>
                  Duplicate
                </Menu.Item>
              )}
              
              <Menu.Item leftSection={<IconDownload size={16} />} onClick={onExport}>
                Export JSON
              </Menu.Item>
              
              <Menu.Divider />
              
              <Menu.Item
                leftSection={<IconArchive size={16} />}
                color="red"
                onClick={onArchive}
                disabled={!isDraft && config.isActive === false}
              >
                {isDraft ? 'Delete Draft' : 'Archive'}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
      </Box>
      
      {/* Content */}
      <div className="p-5">
        {config.description && (
          <Text size="sm" c="dimmed" className="mb-4">
            {config.description}
          </Text>
        )}
        
        {/* Platforms & Targets */}
        <div className="mb-4">
          <Group gap="xs" className="mb-2">
            <IconLayersIntersect size={16} className="text-gray-500" />
            <Text size="sm" fw={600} c="dimmed">Platforms & Targets</Text>
          </Group>
          
          <Group gap="xs">
            {config.platforms?.map((platform) => (
              <Badge 
                key={platform}
                variant="light" 
                color="blue"
                leftSection={getPlatformIcon(platform)}
                size="md"
              >
                {platform}
              </Badge>
            ))}
            
            {config.targets?.map((target) => (
              <Badge 
                key={target}
                variant="outline" 
                color="gray"
                size="sm"
              >
                {target.replace(/_/g, ' ')}
              </Badge>
            ))}
          </Group>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Text size="xs" c="dimmed" className="mb-1">
              Branch
            </Text>
            <Text fw={600} size="sm" className="text-blue-700">
              {config.baseBranch || 'N/A'}
            </Text>
          </div>
          
          {config.scheduling && (
            <>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <IconCalendar size={16} className="mx-auto mb-1 text-purple-600" />
                <Text size="xs" c="dimmed" className="mb-1">
                  Frequency
                </Text>
                <Text fw={600} size="sm" className="text-purple-700">
                  {config.scheduling.releaseFrequency}
                </Text>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <IconTarget size={16} className="mx-auto mb-1 text-green-600" />
                <Text size="xs" c="dimmed" className="mb-1">
                  Slots
                </Text>
                <Text fw={600} size="sm" className="text-green-700">
                  {config.scheduling.regressionSlots?.length || 0}
                </Text>
              </div>
            </>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <Text size="xs" c="dimmed">
              Updated {formatRelativeTime(config.updatedAt)}
            </Text>
          </div>
          
          <Group gap="xs">
            <Button 
              size="xs" 
              variant="light" 
              onClick={onEdit}
              leftSection={<IconEdit size={14} />}
            >
              Edit
            </Button>
          </Group>
        </div>
      </div>
    </Card>
  );
}

