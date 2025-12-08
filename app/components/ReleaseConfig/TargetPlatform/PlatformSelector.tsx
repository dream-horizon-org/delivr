/**
 * Platform Selector Component
 * Two-level selection: First select platforms (Android/iOS), then select distribution targets
 */

import { useState } from 'react';
import {
  Stack,
  Text,
  Paper,
  Checkbox,
  Group,
  Badge,
  Collapse,
  Box,
  ThemeIcon,
  UnstyledButton,
  useMantineTheme,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconBrandAndroid,
  IconBrandApple,
  IconTarget,
} from '@tabler/icons-react';
import type { TargetPlatform } from '~/types/release-config';
import type { PlatformSelectorProps } from '~/types/release-config-props';
import { PLATFORM_CONFIGS } from '~/constants/release-config';
import { PLATFORMS, TARGET_PLATFORMS } from '~/types/release-config-constants';

export function PlatformSelector({ selectedPlatforms, onChange }: PlatformSelectorProps) {
  const theme = useMantineTheme();
  
  // Track which platforms are expanded
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(
    new Set([PLATFORMS.ANDROID, PLATFORMS.IOS])
  );

  // Platform icons
  const platformIcons: Record<string, React.ElementType> = {
    [PLATFORMS.ANDROID]: IconBrandAndroid,
    [PLATFORMS.IOS]: IconBrandApple,
  };

  // Platform colors
  const platformColors: Record<string, string> = {
    [PLATFORMS.ANDROID]: 'green',
    [PLATFORMS.IOS]: 'blue',
  };

  // Determine which platforms are selected based on their targets
  const isPlatformSelected = (platformId: typeof PLATFORMS.ANDROID | typeof PLATFORMS.IOS) => {
    const platform = PLATFORM_CONFIGS.find((p) => p.id === platformId);
    if (!platform) return false;
    return platform.targets.some((target) => selectedPlatforms.includes(target.id));
  };

  const handlePlatformToggle = (platformId: typeof PLATFORMS.ANDROID | typeof PLATFORMS.IOS) => {
    const platform = PLATFORM_CONFIGS.find((p) => p.id === platformId);
    if (!platform) return;

    const availableTargets = platform.targets.filter((t) => t.available).map((t) => t.id);
    const isCurrentlySelected = isPlatformSelected(platformId);

    if (isCurrentlySelected) {
      onChange(
        selectedPlatforms.filter((p) => !(availableTargets as readonly TargetPlatform[]).includes(p))
      );
    } else {
      const newTargets = [
        ...selectedPlatforms,
        ...availableTargets.filter((t) => !selectedPlatforms.includes(t)),
      ];
      onChange(newTargets);
    }
  };

  const handleTargetToggle = (targetId: TargetPlatform) => {
    if (selectedPlatforms.includes(targetId)) {
      onChange(selectedPlatforms.filter((p) => p !== targetId));
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

  return (
    <Stack gap="md">
      {/* Platform Cards */}
      {PLATFORM_CONFIGS.map((platform) => {
        const isExpanded = expandedPlatforms.has(platform.id);
        const isSelected = isPlatformSelected(platform.id);
        const PlatformIcon = platformIcons[platform.id] || IconTarget;
        const platformColor = platformColors[platform.id] || 'brand';

        return (
          <Paper
            key={platform.id}
            p="md"
            radius="md"
            withBorder
            style={{
              borderColor: isSelected ? theme.colors[platformColor][4] : theme.colors.slate[2],
              backgroundColor: isSelected ? theme.colors[platformColor][0] : '#ffffff',
              transition: 'all 150ms ease',
            }}
          >
            {/* Platform Header */}
            <UnstyledButton
              onClick={() => platform.available && toggleExpanded(platform.id)}
              w="100%"
            >
              <Group justify="space-between">
                <Group gap="md">
                  {/* Expand/Collapse Icon */}
                  <Box
                    style={{
                      color: theme.colors.slate[4],
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {isExpanded ? (
                      <IconChevronDown size={18} />
                    ) : (
                      <IconChevronRight size={18} />
                    )}
                  </Box>

                  {/* Platform Checkbox */}
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handlePlatformToggle(platform.id)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!platform.available}
                    color={platformColor}
                    size="md"
                  />

                  {/* Platform Icon */}
                  <ThemeIcon
                    size={40}
                    radius="md"
                    variant={isSelected ? 'filled' : 'light'}
                    color={platformColor}
                  >
                    <PlatformIcon size={22} />
                  </ThemeIcon>

                  {/* Platform Name */}
                  <Text fw={600} size="md" c={theme.colors.slate[8]}>
                    {platform.name}
                  </Text>
                </Group>
              </Group>
            </UnstyledButton>

            {/* Distribution Targets */}
            <Collapse in={isExpanded}>
              <Box
                mt="md"
                ml={72}
                pl="md"
                style={{
                  borderLeft: `2px solid ${theme.colors.slate[2]}`,
                }}
              >
                <Stack gap="xs">
                  {platform.targets.map((target) => {
                    const isTargetSelected = selectedPlatforms.includes(target.id);

                    return (
                      <Paper
                        key={target.id}
                        p="sm"
                        radius="sm"
                        withBorder
                        style={{
                          backgroundColor: isTargetSelected
                            ? theme.colors[platformColor][0]
                            : theme.colors.slate[0],
                          borderColor: isTargetSelected
                            ? theme.colors[platformColor][3]
                            : theme.colors.slate[2],
                          cursor: target.available ? 'pointer' : 'not-allowed',
                          transition: 'all 150ms ease',
                        }}
                        onClick={() => target.available && handleTargetToggle(target.id)}
                      >
                        <Group gap="sm">
                          <Checkbox
                            checked={isTargetSelected}
                            onChange={() => handleTargetToggle(target.id)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={!target.available}
                            color={platformColor}
                            size="sm"
                          />
                          <Text size="sm" fw={500} c={theme.colors.slate[8]}>
                            {target.name}
                          </Text>
                        </Group>
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>
            </Collapse>
          </Paper>
        );
      })}

      {/* No Selection Warning */}
      {selectedPlatforms.length === 0 && (
        <Paper
          p="md"
          radius="md"
          style={{
            backgroundColor: theme.colors.red[0],
            border: `1px solid ${theme.colors.red[2]}`,
          }}
        >
          <Group gap="sm">
            <ThemeIcon size={32} radius="md" variant="light" color="red">
              <IconTarget size={18} />
            </ThemeIcon>
            <Text size="sm" fw={500} c={theme.colors.red[8]}>
              Please select at least one distribution target to continue
            </Text>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
