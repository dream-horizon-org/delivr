/**
 * Platform Selector Component
 * Two-level selection: First select platforms (Android/iOS), then select distribution targets
 */

import { useState } from 'react';
import { Stack, Text, Alert, Card, Checkbox, Group, Badge, Collapse } from '@mantine/core';
import { IconInfoCircle, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { TargetPlatform } from '~/types/release-config';

interface PlatformSelectorProps {
  selectedPlatforms: TargetPlatform[];
  onChange: (platforms: TargetPlatform[]) => void;
}

interface DistributionTarget {
  id: TargetPlatform;
  name: string;
  description: string;
  available: boolean;
  comingSoon?: boolean;
}

interface PlatformConfig {
  id: 'ANDROID' | 'IOS';
  name: string;
  description: string;
  targets: DistributionTarget[];
}

const platformConfigs: PlatformConfig[] = [
  {
    id: 'ANDROID',
    name: 'Android',
    description: 'Build and distribute for Android devices',
    targets: [
      {
        id: 'PLAY_STORE',
        name: 'Google Play Store',
        description: 'Distribute to Play Store',
        available: true,
      },
      // Future targets can be added here
      // {
      //   id: 'FIREBASE',
      //   name: 'Firebase App Distribution',
      //   description: 'Internal distribution via Firebase',
      //   available: false,
      //   comingSoon: true,
      // },
    ],
  },
  {
    id: 'IOS',
    name: 'iOS',
    description: 'Build and distribute for iOS devices',
    targets: [
      {
        id: 'APP_STORE',
        name: 'Apple App Store',
        description: 'Distribute to App Store',
        available: true,
      },
      // Future targets can be added here
      // {
      //   id: 'TESTFLIGHT_STANDALONE',
      //   name: 'TestFlight Only',
      //   description: 'TestFlight distribution without App Store',
      //   available: false,
      //   comingSoon: true,
      // },
    ],
  },
];

export function PlatformSelector({ selectedPlatforms, onChange }: PlatformSelectorProps) {
  // Track which platforms are expanded
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set(['ANDROID', 'IOS']));
  
  // Determine which platforms are selected based on their targets
  const isPlatformSelected = (platformId: 'ANDROID' | 'IOS') => {
    const platform = platformConfigs.find(p => p.id === platformId);
    if (!platform) return false;
    return platform.targets.some(target => selectedPlatforms.includes(target.id));
  };
  
  const handlePlatformToggle = (platformId: 'ANDROID' | 'IOS') => {
    const platform = platformConfigs.find(p => p.id === platformId);
    if (!platform) return;
    
    const availableTargets = platform.targets.filter(t => t.available).map(t => t.id);
    const isCurrentlySelected = isPlatformSelected(platformId);
    
    if (isCurrentlySelected) {
      // Deselect all targets for this platform
      onChange(selectedPlatforms.filter(p => !availableTargets.includes(p)));
    } else {
      // Select all available targets for this platform
      const newTargets = [...selectedPlatforms, ...availableTargets.filter(t => !selectedPlatforms.includes(t))];
      onChange(newTargets);
    }
  };
  
  const handleTargetToggle = (targetId: TargetPlatform) => {
    if (selectedPlatforms.includes(targetId)) {
      onChange(selectedPlatforms.filter(p => p !== targetId));
    } else {
      onChange([...selectedPlatforms, targetId]);
    }
  };
  
  const toggleExpanded = (platformId: string) => {
    const newExpanded = new Set(expandedPlatforms);
    if (newExpanded.has(platformId)) {
      newExpanded.delete(platformId);
    } else {
      newExpanded.add(platformId);
    }
    setExpandedPlatforms(newExpanded);
  };
  
  const hasAndroid = selectedPlatforms.includes('PLAY_STORE');
  const hasIOS = selectedPlatforms.includes('APP_STORE');
  
  return (
    <Stack gap="md">
      <div>
        <Text fw={600} size="lg" className="mb-1">
          Platforms & Distribution Targets
        </Text>
        <Text size="sm" c="dimmed">
          Select platforms and their distribution targets
        </Text>
      </div>
      
      <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
        <Text size="sm">
          <strong>Step 1:</strong> Select platforms (Android/iOS)<br />
          <strong>Step 2:</strong> For each platform, select distribution targets
        </Text>
      </Alert>
      
      <Stack gap="md">
        {platformConfigs.map((platform) => {
          const isExpanded = expandedPlatforms.has(platform.id);
          const isSelected = isPlatformSelected(platform.id);
          const selectedTargetsCount = platform.targets.filter(t => selectedPlatforms.includes(t.id)).length;
          
          return (
            <Card
              key={platform.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              className={isSelected ? 'border-blue-500' : ''}
            >
              {/* Platform Level */}
              <div
                className="cursor-pointer"
                onClick={() => toggleExpanded(platform.id)}
              >
                <Group justify="apart" className="mb-0">
                  <Group gap="sm">
                    {isExpanded ? (
                      <IconChevronDown size={20} className="text-gray-500" />
                    ) : (
                      <IconChevronRight size={20} className="text-gray-500" />
                    )}
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handlePlatformToggle(platform.id)}
                      onClick={(e) => e.stopPropagation()}
                      label={
                        <div>
                          <Text fw={600} size="md">
                            {platform.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {platform.description}
                          </Text>
                        </div>
                      }
                    />
                  </Group>
                  
                  {isSelected && (
                    <Badge color="blue" variant="light">
                      {selectedTargetsCount} target{selectedTargetsCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </Group>
              </div>
              
              {/* Distribution Targets */}
              <Collapse in={isExpanded}>
                <div className="ml-8 mt-3 pl-4 border-l-2 border-gray-200">
                  <Text size="sm" fw={500} c="dimmed" className="mb-2">
                    Distribution Targets:
                  </Text>
                  <Stack gap="xs">
                    {platform.targets.map((target) => (
                      <Card
                        key={target.id}
                        padding="sm"
                        radius="sm"
                        withBorder
                        className={selectedPlatforms.includes(target.id) ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'}
                      >
                        <Group justify="apart">
                          <Checkbox
                            checked={selectedPlatforms.includes(target.id)}
                            onChange={() => handleTargetToggle(target.id)}
                            disabled={!target.available}
                            label={
                              <div>
                                <Group gap="xs">
                                  <Text size="sm" fw={500}>
                                    {target.name}
                                  </Text>
                                  {target.comingSoon && (
                                    <Badge size="xs" color="gray" variant="outline">
                                      Coming Soon
                                    </Badge>
                                  )}
                                </Group>
                                <Text size="xs" c="dimmed">
                                  {target.description}
                                </Text>
                              </div>
                            }
                          />
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                </div>
              </Collapse>
            </Card>
          );
        })}
      </Stack>
      
      {selectedPlatforms.length === 0 && (
        <Alert color="red" variant="light">
          <Text size="sm">
            Please select at least one distribution target to continue.
          </Text>
        </Alert>
      )}
      
      {selectedPlatforms.length > 0 && (
        <Alert color="green" variant="light">
          <Text size="sm" fw={500}>
            Selected: {hasAndroid && 'Android (Play Store)'}
            {hasAndroid && hasIOS && ' + '}
            {hasIOS && 'iOS (App Store)'}
          </Text>
          <Text size="xs" c="dimmed" className="mt-1">
            {selectedPlatforms.length} distribution target{selectedPlatforms.length > 1 ? 's' : ''} configured
          </Text>
        </Alert>
      )}
    </Stack>
  );
}

