/**
 * Platform Targets Selector Component
 * 
 * Allows users to select platform-target combinations with per-platform version input.
 * Pre-fills from config if available, with visual indication.
 * 
 * Follows cursor rules: No 'any' or 'unknown' types, uses constants
 */

import { useEffect, useMemo } from 'react';
import {
  Card,
  Stack,
  Group,
  Text,
  Checkbox,
  TextInput,
  Badge,
  Alert,
} from '@mantine/core';
import { IconTarget, IconInfoCircle } from '@tabler/icons-react';
import type { PlatformTargetWithVersion } from '~/types/release-creation-backend';
import type { ReleaseConfiguration, TargetPlatform, Platform } from '~/types/release-config';
import { PLATFORMS, TARGET_PLATFORMS } from '~/types/release-config-constants';
import { PLATFORM_LABELS, TARGET_PLATFORM_LABELS } from '~/constants/release-config-ui';
import { convertConfigTargetsToPlatformTargets } from '~/utils/release-creation-converter';

interface PlatformTargetsSelectorProps {
  platformTargets: PlatformTargetWithVersion[];
  onChange: (platformTargets: PlatformTargetWithVersion[]) => void;
  config?: ReleaseConfiguration; // For pre-filling
  defaultVersion?: string; // Default version if not in config
  errors?: Record<string, string>;
}

/**
 * Available platform-target combinations
 * Maps each target to its required platform
 */
const PLATFORM_TARGET_MAPPING: Record<
  typeof TARGET_PLATFORMS[keyof typeof TARGET_PLATFORMS],
  typeof PLATFORMS[keyof typeof PLATFORMS] | 'WEB'
> = {
  [TARGET_PLATFORMS.WEB]: 'WEB',
  [TARGET_PLATFORMS.PLAY_STORE]: PLATFORMS.ANDROID,
  [TARGET_PLATFORMS.APP_STORE]: PLATFORMS.IOS,
} as const;

/**
 * Get display label for platform-target combination
 */
function getPlatformTargetLabel(
  platform: PlatformTargetWithVersion['platform'],
  target: PlatformTargetWithVersion['target']
): string {
  if (target === TARGET_PLATFORMS.WEB) {
    return `${PLATFORM_LABELS.WEB} → ${TARGET_PLATFORM_LABELS.WEB}`;
  }
  if (target === TARGET_PLATFORMS.PLAY_STORE) {
    return `${PLATFORM_LABELS.ANDROID} → ${TARGET_PLATFORM_LABELS.PLAY_STORE}`;
  }
  if (target === TARGET_PLATFORMS.APP_STORE) {
    return `${PLATFORM_LABELS.IOS} → ${TARGET_PLATFORM_LABELS.APP_STORE}`;
  }
  return `${platform} → ${target}`;
}

export function PlatformTargetsSelector({
  platformTargets,
  onChange,
  config,
  defaultVersion = 'v1.0.0',
  errors = {},
}: PlatformTargetsSelectorProps) {
  // Available targets from config (or all if no config)
  const availableTargets = useMemo(() => {
    if (config) {
      return config.targets;
    }
    // If no config, all targets are available
    return [
      TARGET_PLATFORMS.WEB,
      TARGET_PLATFORMS.PLAY_STORE,
      TARGET_PLATFORMS.APP_STORE,
    ] as TargetPlatform[];
  }, [config]);

  // Check if a platform-target combination is selected
  const isSelected = (target: TargetPlatform): boolean => {
    return platformTargets.some((pt) => pt.target === target);
  };

  // Get version for a specific target
  const getVersionForTarget = (target: TargetPlatform): string => {
    const pt = platformTargets.find((p) => p.target === target);
    return pt?.version || defaultVersion;
  };

  // Handle target selection/deselection
  const handleTargetToggle = (target: TargetPlatform, checked: boolean) => {
    if (checked) {
      // Add platform-target combination
      const platform = PLATFORM_TARGET_MAPPING[target];
      if (!platform) return;

      const newPlatformTarget: PlatformTargetWithVersion = {
        platform: platform as PlatformTargetWithVersion['platform'],
        target,
        version: getVersionForTarget(target) || defaultVersion,
      };

      onChange([...platformTargets, newPlatformTarget]);
    } else {
      // Remove platform-target combination
      // But ensure at least 1 remains
      if (platformTargets.length <= 1) {
        return; // Prevent removing the last one
      }
      onChange(platformTargets.filter((pt) => pt.target !== target));
    }
  };

  // Handle version change for a specific target
  const handleVersionChange = (target: TargetPlatform, version: string) => {
    onChange(
      platformTargets.map((pt) =>
        pt.target === target ? { ...pt, version } : pt
      )
    );
  };

  // Pre-fill from config on mount or when config changes
  useEffect(() => {
    if (config && platformTargets.length === 0) {
      const versions: Record<Platform, string> = {
        ANDROID: defaultVersion,
        IOS: defaultVersion,
      };
      const preFilled = convertConfigTargetsToPlatformTargets(
        config.targets,
        versions
      );
      onChange(preFilled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, defaultVersion]); // Only run when config or defaultVersion changes

  // Validation: Check if at least 1 platform target is selected
  const hasMinimumSelection = platformTargets.length >= 1;
  const showMinimumError = !hasMinimumSelection && errors.platformTargets;

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Stack gap="md">
        <Group gap="sm">
          <IconTarget size={20} className="text-blue-600" />
          <Text fw={600} size="sm">
            Platform Targets
          </Text>
          {config && (
            <Badge size="xs" variant="light" color="blue">
              From Config
            </Badge>
          )}
        </Group>

        {showMinimumError && (
          <Alert icon={<IconInfoCircle size={16} />} color="red" variant="light">
            <Text size="xs">{errors.platformTargets}</Text>
          </Alert>
        )}

        <Group gap="md" align="flex-start" wrap="wrap">
          {availableTargets.map((target) => {
            const selected = isSelected(target);
            const platform = PLATFORM_TARGET_MAPPING[target];
            const version = getVersionForTarget(target);
            const label = getPlatformTargetLabel(
              platform as PlatformTargetWithVersion['platform'],
              target
            );

            return (
              <Card
                key={target}
                padding="md"
                withBorder
                className={selected ? 'border-blue-300' : ''}
                style={{ flex: '1 1 300px', minWidth: '300px' }}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="center">
                    <Checkbox
                      label={label}
                      checked={selected}
                      onChange={(e) =>
                        handleTargetToggle(target, e.currentTarget.checked)
                      }
                      disabled={!selected && platformTargets.length === 0}
                    />
                    {config && selected && (
                      <Badge size="xs" variant="light" color="gray">
                        Pre-filled
                      </Badge>
                    )}
                  </Group>

                  {selected && (
                    <TextInput
                      label="Version"
                      placeholder="e.g., v6.5.0"
                      value={version}
                      onChange={(e) => handleVersionChange(target, e.target.value)}
                      required
                      error={errors[`version-${target}`]}
                      description="Version format: vX.Y.Z (e.g., v6.5.0)"
                      pattern="^v?\d+\.\d+\.\d+"
                    />
                  )}
                </Stack>
              </Card>
            );
          })}
        </Group>
      </Stack>
    </Card>
  );
}

