/**
 * Platform Selector Component
 * Allows selection of target platforms (Web, Play Store, App Store)
 */

import { Stack, Text, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { TargetPlatform } from '~/types/release-config';
import { PlatformCard } from './PlatformCard';

interface PlatformSelectorProps {
  selectedPlatforms: TargetPlatform[];
  onChange: (platforms: TargetPlatform[]) => void;
}

const allPlatforms: TargetPlatform[] = ['WEB', 'PLAY_STORE', 'APP_STORE'];

export function PlatformSelector({ selectedPlatforms, onChange }: PlatformSelectorProps) {
  const handleToggle = (platform: TargetPlatform) => {
    if (selectedPlatforms.includes(platform)) {
      // Remove if selected
      onChange(selectedPlatforms.filter(p => p !== platform));
    } else {
      // Add if not selected
      onChange([...selectedPlatforms, platform]);
    }
  };
  
  const hasAndroid = selectedPlatforms.some(p => p === 'WEB' || p === 'PLAY_STORE');
  const hasIOS = selectedPlatforms.includes('APP_STORE');
  
  return (
    <Stack gap="md">
      <div>
        <Text fw={600} size="lg" className="mb-1">
          Target Platforms
        </Text>
        <Text size="sm" c="dimmed">
          Select the platforms where you'll distribute your releases
        </Text>
      </div>
      
      <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
        <Text size="sm">
          <strong>Note:</strong> Your build pipeline configuration should match the 
          platforms you select here. Make sure you have the necessary build pipelines configured.
        </Text>
      </Alert>
      
      <Stack gap="sm">
        {allPlatforms.map((platform) => (
          <PlatformCard
            key={platform}
            platform={platform}
            selected={selectedPlatforms.includes(platform)}
            onToggle={() => handleToggle(platform)}
          />
        ))}
      </Stack>
      
      {selectedPlatforms.length === 0 && (
        <Alert color="red" variant="light">
          <Text size="sm">
            Please select at least one target platform to continue.
          </Text>
        </Alert>
      )}
      
      {selectedPlatforms.length > 0 && (
        <Alert color="green" variant="light">
          <Text size="sm" fw={500}>
            Selected: {hasAndroid && 'Android'}
            {hasAndroid && hasIOS && ' + '}
            {hasIOS && 'iOS'}
          </Text>
          <Text size="xs" c="dimmed" className="mt-1">
            {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''} configured
          </Text>
        </Alert>
      )}
    </Stack>
  );
}

