/**
 * Platform Selector - UPDATED VERSION
 * Now uses ConfigContext for dynamic platform list
 */

import { useState } from 'react';
import { Card, Checkbox, Text, Badge, Loader } from '@mantine/core';
import { useConfig } from '~/contexts/ConfigContext';

interface PlatformSelectorProps {
  selectedPlatforms: string[];
  onChange: (platforms: string[]) => void;
}

export function PlatformSelector({ selectedPlatforms, onChange }: PlatformSelectorProps) {
  const {
    getAvailablePlatforms,
    getAvailableTargets,
    isLoadingMetadata,
  } = useConfig();
  
  // Get platforms from backend
  const platforms = getAvailablePlatforms();
  
  if (isLoadingMetadata) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader size="md" />
        <Text ml="md" c="dimmed">Loading platforms...</Text>
      </div>
    );
  }
  
  const handlePlatformToggle = (platformId: string, targetId: string) => {
    const isSelected = selectedPlatforms.includes(targetId);
    
    if (isSelected) {
      onChange(selectedPlatforms.filter(p => p !== targetId));
    } else {
      onChange([...selectedPlatforms, targetId]);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <Text size="lg" fw={600} mb="xs">
          Select Target Platforms
        </Text>
        <Text size="sm" c="dimmed">
          Choose which platforms you want to build and distribute for
        </Text>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => {
          const targets = getAvailableTargets(platform.id);
          
          return (
            <Card key={platform.id} shadow="sm" padding="lg" radius="md" withBorder>
              <div className="flex items-start gap-3 mb-4">
                <span className="text-3xl">{platform.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Text fw={600} size="lg">
                      {platform.name}
                    </Text>
                    {!platform.isAvailable && (
                      <Badge size="sm" color="gray">Coming Soon</Badge>
                    )}
                  </div>
                  <Text size="sm" c="dimmed">
                    {platform.description}
                  </Text>
                </div>
              </div>
              
              <div className="space-y-2 pl-12">
                {targets.map((target) => (
                  <div key={target.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedPlatforms.includes(target.id)}
                      onChange={() => handlePlatformToggle(platform.id, target.id)}
                      disabled={!target.isAvailable || !platform.isAvailable}
                      label={
                        <div className="flex items-center gap-2">
                          <span>{target.name}</span>
                          {target.comingSoon && (
                            <Badge size="xs" color="blue">Soon</Badge>
                          )}
                        </div>
                      }
                    />
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      
      {selectedPlatforms.length === 0 && (
        <Text size="sm" c="red" ta="center">
          Please select at least one target platform
        </Text>
      )}
    </div>
  );
}

