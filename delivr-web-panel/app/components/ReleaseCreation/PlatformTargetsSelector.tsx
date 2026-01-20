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
  Box,
  Stack,
  Group,
  Text,
  Checkbox,
  TextInput,
  Badge,
  Alert,
  useMantineTheme,
} from '@mantine/core';
import { IconTarget, IconInfoCircle } from '@tabler/icons-react';
import { INFO_MESSAGES } from '~/constants/release-config-ui';
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
  disabled?: boolean; // Disable all interactions (for edit mode pre-kickoff)
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
  defaultVersion = '1.0.0',
  errors = {},
  disabled = false,
}: PlatformTargetsSelectorProps) {
  const theme = useMantineTheme();
  
  // Available targets from config (or all if no config)
  const availableTargets = useMemo(() => {
    if (config?.platformTargets && config.platformTargets.length > 0) {
      // Extract unique targets from platformTargets
      return [...new Set(config.platformTargets.map((pt) => pt.target))];
    }
    // If no config, all targets are available
    return [
      TARGET_PLATFORMS.WEB,
      TARGET_PLATFORMS.PLAY_STORE,
      TARGET_PLATFORMS.APP_STORE,
    ] as TargetPlatform[];
  }, [config?.platformTargets]);

  // Filter platformTargets to only include targets that are in the config
  // This ensures state only contains valid targets from config
  useEffect(() => {
    if (config?.platformTargets && config.platformTargets.length > 0 && platformTargets.length > 0) {
      const configTargets = config.platformTargets.map((pt) => pt.target);
      const filtered = platformTargets.filter((pt) => configTargets.includes(pt.target));
      
      // Only update if there's a difference (to avoid infinite loops)
      if (filtered.length !== platformTargets.length) {
        // If all were filtered out, keep at least the first available target
        if (filtered.length === 0 && configTargets.length > 0) {
          const firstConfigPt = config.platformTargets[0];
          onChange([{
            platform: firstConfigPt.platform as PlatformTargetWithVersion['platform'],
            target: firstConfigPt.target,
            version: defaultVersion,
          }]);
        } else if (filtered.length > 0) {
          onChange(filtered);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.platformTargets]);

  // Check if a platform-target combination is selected
  const isSelected = (target: TargetPlatform): boolean => {
    return platformTargets.some((pt) => pt.target === target);
  };

  // Get version for a specific target
  // If platformTarget exists, use its version (even if empty string - user cleared it)
  // Only use defaultVersion if platformTarget doesn't exist yet (not selected)
  const getVersionForTarget = (target: TargetPlatform): string => {
    const pt = platformTargets.find((p) => p.target === target);
    if (pt) {
      // Platform is selected - return its version (even if empty string)
      return pt.version || '';
    }
    // Platform not selected yet - return defaultVersion for display
    return defaultVersion;
  };

  // Handle target selection/deselection
  const handleTargetToggle = (target: TargetPlatform, checked: boolean) => {
    if (disabled) return; // Don't allow changes when disabled
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
      // Allow removing even the last one - validation will catch if none selected on submit
      onChange(platformTargets.filter((pt) => pt.target !== target));
    }
  };

  // Handle version change for a specific target
  const handleVersionChange = (target: TargetPlatform, version: string) => {
    if (disabled) return; // Don't allow changes when disabled
    onChange(
      platformTargets.map((pt) =>
        pt.target === target ? { ...pt, version } : pt
      )
    );
  };

  // NOTE: We no longer pre-fill from config - user must explicitly select platforms
  // This allows user to choose which platforms they want for this specific release

  // Validation: Check if at least 1 platform target is selected
  const hasMinimumSelection = platformTargets.length >= 1;
  const showMinimumError = !hasMinimumSelection && errors.platformTargets;

  // Check if both iOS and Android platforms are selected
  const hasBothPlatforms = useMemo(() => {
    const hasIOS = platformTargets.some((pt) => pt.target === TARGET_PLATFORMS.APP_STORE);
    const hasAndroid = platformTargets.some((pt) => pt.target === TARGET_PLATFORMS.PLAY_STORE);
    return hasIOS && hasAndroid;
  }, [platformTargets]);
  
  // Get version error for a specific target
  const getVersionError = (target: TargetPlatform): string | undefined => {
    // Check for version-specific error
    if (errors[`version-${target}`]) {
      return errors[`version-${target}`];
    }
    // Check for platform target array errors
    const ptIndex = platformTargets.findIndex(pt => pt.target === target);
    if (ptIndex >= 0) {
      if (errors[`platformTargets[${ptIndex}].version`]) {
        return errors[`platformTargets[${ptIndex}].version`];
      }
      if (errors[`platformTargets[${ptIndex}]`]) {
        return errors[`platformTargets[${ptIndex}]`];
      }
    }
    return undefined;
  };

  return (
    <Box>
      <Stack gap="md">
        <Group gap="sm" mb="xs">
          <IconTarget size={20} color={theme.colors.brand[6]} />
          <Box style={{ flex: 1 }}>
            <Text fw={600} size="sm" mb={4}>
              Platform Targets{' '}
              <Text component="span" c="red" fw={600}>
                *
              </Text>
            </Text>
            <Text size="xs" c={theme.colors.slate[5]}>
              Select the platforms and distribution targets for this release. At least one must be selected.
            </Text>
          </Box>
        </Group>

        {disabled && (
          <Alert icon={<IconInfoCircle size={16} />} color="yellow" variant="light">
            <Text size="xs">Platform targets cannot be modified for releases before kickoff.</Text>
          </Alert>
        )}

        {showMinimumError && (
          <Alert icon={<IconInfoCircle size={16} />} color="red" variant="light" radius="md">
            <Text size="sm">{errors.platformTargets}</Text>
          </Alert>
        )}

        {/* Multi-Platform Warning */}
        {hasBothPlatforms && (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="yellow"
            variant="light"
            radius="md"
          >
            <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
              {INFO_MESSAGES.MULTI_PLATFORM_WARNING_RELEASE}
            </Text>
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
            const versionError = getVersionError(target);

            return (
              <Box
                key={target}
                p="md"
                style={{
                  flex: '1 1 300px',
                  minWidth: '300px',
                  border: `1px solid ${selected ? theme.colors.brand[3] : theme.colors.slate[2]}`,
                  borderRadius: theme.radius.md,
                  background: selected ? theme.colors.brand[0] : 'transparent',
                }}
              >
                <Stack gap="sm">
                  <Checkbox
                    label={label}
                    checked={selected}
                    onChange={(e) =>
                      handleTargetToggle(target, e.currentTarget.checked)
                    }
                    disabled={disabled}
                  />

                  {selected && (
                    <TextInput
                      label="Version"
                      placeholder="e.g., 1.0.0"
                      value={version}
                      onChange={(e) => handleVersionChange(target, e.target.value)}
                      required
                      withAsterisk
                      error={versionError}
                      disabled={disabled}
                      description="Semantic version format (e.g., 1.0.0). This will be the version number for this platform."
                      styles={{
                        label: { fontWeight: 500, marginBottom: 6 },
                      }}
                    />
                  )}
                </Stack>
              </Box>
            );
          })}
        </Group>
      </Stack>
    </Box>
  );
}

