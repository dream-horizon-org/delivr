/**
 * Platform Card Component
 * Visual representation of a target platform with selection
 */

import { Card, Checkbox, Text, Badge, Group } from '@mantine/core';
import type { PlatformCardProps } from '~/types/release-config-props';
import { PLATFORM_CARD_CONFIG } from '~/constants/release-config';

export function PlatformCard({ platform, selected, onToggle, disabled = false }: PlatformCardProps) {
  const config = PLATFORM_CARD_CONFIG[platform];
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

