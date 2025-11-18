/**
 * Platform Card Component
 * Visual representation of a target platform with selection
 */

import { Card, Checkbox, Text, Badge, Group } from '@mantine/core';
import { IconWorld, IconBrandAndroid, IconBrandApple } from '@tabler/icons-react';
import type { TargetPlatform } from '~/types/release-config';

interface PlatformCardProps {
  platform: TargetPlatform;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const platformConfig = {
  WEB: {
    label: 'Web (Android)',
    description: 'CodePush updates for web platform',
    icon: IconWorld,
    color: '#FF6B6B',
    badge: 'Android',
  },
  PLAY_STORE: {
    label: 'Play Store',
    description: 'Google Play Store distribution',
    icon: IconBrandAndroid,
    color: '#82C91E',
    badge: 'Android',
  },
  APP_STORE: {
    label: 'App Store',
    description: 'Apple App Store distribution via TestFlight',
    icon: IconBrandApple,
    color: '#4DABF7',
    badge: 'iOS',
  },
};

export function PlatformCard({ platform, selected, onToggle, disabled = false }: PlatformCardProps) {
  const config = platformConfig[platform];
  const Icon = config.icon;
  
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      className={`cursor-pointer transition-all ${
        selected
          ? 'border-blue-500 border-2 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && onToggle()}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onChange={onToggle}
          disabled={disabled}
          className="mt-1"
          onClick={(e) => e.stopPropagation()}
        />
        
        <div className="flex-1">
          <Group gap="xs" className="mb-2">
            <Icon size={24} style={{ color: config.color }} />
            <Text fw={600} size="md">
              {config.label}
            </Text>
            <Badge size="sm" variant="light" color="gray">
              {config.badge}
            </Badge>
          </Group>
          
          <Text size="sm" c="dimmed">
            {config.description}
          </Text>
        </div>
      </div>
    </Card>
  );
}

