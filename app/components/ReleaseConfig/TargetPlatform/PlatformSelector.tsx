/**
 * Platform Selector Component
 * Two-level selection: First select platforms (Android/iOS), then select distribution targets
 */

import { useState } from 'react';
import { Stack, Text, Alert, Card, Checkbox, Group, Badge, Collapse } from '@mantine/core';
import { IconInfoCircle, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { TargetPlatform } from '~/types/release-config';
import type { PlatformSelectorProps } from '~/types/release-config-props';
import { PLATFORM_CONFIGS } from '~/constants/release-config';
import { PLATFORMS, TARGET_PLATFORMS } from '~/types/release-config-constants';
import { PLATFORM_SELECTION_LABELS, ICON_SIZES } from '~/constants/release-config-ui';

export function PlatformSelector({ selectedPlatforms, onChange }: PlatformSelectorProps) {
  // Track which platforms are expanded
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set([PLATFORMS.ANDROID, PLATFORMS.IOS]));
  
  // Determine which platforms are selected based on their targets
  const isPlatformSelected = (platformId: typeof PLATFORMS.ANDROID | typeof PLATFORMS.IOS) => {
    const platform = PLATFORM_CONFIGS.find(p => p.id === platformId);
    if (!platform) return false;
    return platform.targets.some(target => selectedPlatforms.includes(target.id));
  };
  
  const handlePlatformToggle = (platformId: typeof PLATFORMS.ANDROID | typeof PLATFORMS.IOS) => {
    const platform = PLATFORM_CONFIGS.find(p => p.id === platformId);
    if (!platform) return;
    
    const availableTargets = platform.targets.filter(t => t.available).map(t => t.id);
    const isCurrentlySelected = isPlatformSelected(platformId);
    
    if (isCurrentlySelected) {
      // Deselect all targets for this platform
      onChange(selectedPlatforms.filter(p => !(availableTargets as readonly TargetPlatform[]).includes(p)));
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
  
  const hasAndroid = selectedPlatforms.includes(TARGET_PLATFORMS.PLAY_STORE);
  const hasIOS = selectedPlatforms.includes(TARGET_PLATFORMS.APP_STORE);
  
  return (
    <Stack gap="md">
      <div>
        <Text fw={600} size="lg" className="mb-1">
          {PLATFORM_SELECTION_LABELS.SECTION_TITLE}
        </Text>
        <Text size="sm" c="dimmed">
          {PLATFORM_SELECTION_LABELS.SECTION_DESCRIPTION}
        </Text>
      </div>
      
      <Alert icon={<IconInfoCircle size={ICON_SIZES.SMALL} />} color="blue" variant="light">
        <Text size="sm">
          <strong>{PLATFORM_SELECTION_LABELS.STEP_1}</strong><br />
          <strong>{PLATFORM_SELECTION_LABELS.STEP_2}</strong>
        </Text>
      </Alert>
      
      <Stack gap="md">
        {PLATFORM_CONFIGS.map((platform) => {
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
                onClick={() => platform.available && toggleExpanded(platform.id)}
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
                      disabled={!platform.available}
                      label={
                        <div>
                          <Group gap="xs">
                            <Text fw={600} size="md" c={platform.available ? undefined : 'dimmed'}>
                              {platform.name}
                            </Text>
                            {'comingSoon' in platform && platform.comingSoon && (
                              <Badge size="sm" color="gray" variant="outline">
                                {PLATFORM_SELECTION_LABELS.COMING_SOON}
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="dimmed">
                            {platform.description}
                          </Text>
                        </div>
                      }
                    />
                  </Group>
                  
                  {isSelected && (
                    <Badge color="blue" variant="light">
                      {selectedTargetsCount} {selectedTargetsCount > 1 ? PLATFORM_SELECTION_LABELS.TARGET_PLURAL : PLATFORM_SELECTION_LABELS.TARGET_SINGULAR}
                    </Badge>
                  )}
                </Group>
              </div>
              
              {/* Distribution Targets */}
              <Collapse in={isExpanded}>
                <div className="ml-8 mt-3 pl-4 border-l-2 border-gray-200">
                  <Text size="sm" fw={500} c="dimmed" className="mb-2">
                    {PLATFORM_SELECTION_LABELS.DISTRIBUTION_TARGETS_LABEL}
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
                                  {'comingSoon' in target && target.comingSoon && (
                                    <Badge size="xs" color="gray" variant="outline">
                                      {PLATFORM_SELECTION_LABELS.COMING_SOON}
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
            {PLATFORM_SELECTION_LABELS.SELECT_AT_LEAST_ONE}
          </Text>
        </Alert>
      )}
      
      {selectedPlatforms.length > 0 && (
        <Alert color="green" variant="light">
          <Text size="sm" fw={500}>
            {PLATFORM_SELECTION_LABELS.SELECTED_PREFIX} {hasAndroid && 'Android (Play Store)'}
            {hasAndroid && hasIOS && ' + '}
            {hasIOS && 'iOS (App Store)'}
          </Text>
          <Text size="xs" c="dimmed" className="mt-1">
            {selectedPlatforms.length} {PLATFORM_SELECTION_LABELS.TARGETS_CONFIGURED}
          </Text>
        </Alert>
      )}
    </Stack>
  );
}

