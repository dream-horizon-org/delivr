/**
 * Platform Selector Component
 * Two-level selection: First select platforms (Android/iOS), then select distribution targets
 * Filters targets based on connected integrations
 */

import { useState, useMemo, useEffect } from 'react';
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
  Alert,
  Button,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconBrandAndroid,
  IconBrandApple,
  IconTarget,
  IconPlug,
  IconExternalLink,
} from '@tabler/icons-react';
import { Link, useParams } from '@remix-run/react';
import type { TargetPlatform, Platform } from '~/types/release-config';
import type { PlatformSelectorProps } from '~/types/release-config-props';
import { PLATFORM_CONFIGS } from '~/constants/release-config';
import { PLATFORMS, TARGET_PLATFORMS } from '~/types/release-config-constants';
import { useConfig } from '~/contexts/ConfigContext';
import { INTEGRATION_IDS } from '~/constants/integration-ui';
import { IntegrationCategory } from '~/types/integrations';

// Map target platforms to their integration provider IDs
const TARGET_TO_INTEGRATION_MAP: Record<TargetPlatform, string> = {
  [TARGET_PLATFORMS.PLAY_STORE]: INTEGRATION_IDS.PLAY_STORE,
  [TARGET_PLATFORMS.APP_STORE]: INTEGRATION_IDS.APP_STORE,
  [TARGET_PLATFORMS.WEB]: '', // WEB doesn't require integration
};

export function PlatformSelector({ platformTargets, onChange }: PlatformSelectorProps) {
  const theme = useMantineTheme();
  const { isIntegrationConnected } = useConfig();
  const params = useParams<{ org: string }>();
  
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

  // Filter targets based on connected integrations
  const getAvailableTargetsForPlatform = useMemo(() => {
    return (platformId: typeof PLATFORMS.ANDROID | typeof PLATFORMS.IOS) => {
      const platform = PLATFORM_CONFIGS.find((p) => p.id === platformId);
      if (!platform) return [];

      return platform.targets.filter((target) => {
        // Check if integration is connected for this target
        const integrationId = TARGET_TO_INTEGRATION_MAP[target.id as TargetPlatform];
        if (!integrationId) {
          return target.available; // If no mapping, use default availability
        }

        return target.available && isIntegrationConnected(integrationId);
      });
    };
  }, [isIntegrationConnected]);

  // Check if platform has any available targets
  const hasAvailableTargets = (platformId: typeof PLATFORMS.ANDROID | typeof PLATFORMS.IOS) => {
    return getAvailableTargetsForPlatform(platformId).length > 0;
  };

  // Get missing integrations for a platform
  const getMissingIntegrations = (platformId: typeof PLATFORMS.ANDROID | typeof PLATFORMS.IOS) => {
    const platform = PLATFORM_CONFIGS.find((p) => p.id === platformId);
    if (!platform) return [];

    return platform.targets
      .filter((target) => {
        const integrationId = TARGET_TO_INTEGRATION_MAP[target.id as TargetPlatform];
        return integrationId && !isIntegrationConnected(integrationId);
      })
      .map((target) => {
        const integrationId = TARGET_TO_INTEGRATION_MAP[target.id as TargetPlatform];
        return {
          target: target.name,
          integrationId,
        };
      });
  };

  // Get all available platform-target combinations
  const allAvailablePlatformTargets = useMemo(() => {
    const available: Array<{ platform: Platform; target: TargetPlatform }> = [];
    PLATFORM_CONFIGS.forEach((platform) => {
      const platformTargets = getAvailableTargetsForPlatform(platform.id);
      platformTargets.forEach((target) => {
        available.push({ platform: platform.id as Platform, target: target.id as TargetPlatform });
      });
    });
    return available;
  }, [getAvailableTargetsForPlatform]);

  // Filter out invalid platform-target combinations when integrations change
  useEffect(() => {
    // Filter to only include platform-targets that are currently available
    const validPlatformTargets = platformTargets.filter((pt) =>
      allAvailablePlatformTargets.some(
        (apt) => apt.platform === pt.platform && apt.target === pt.target
      )
    );

    // Only call onChange if there are invalid combinations to remove
    if (validPlatformTargets.length !== platformTargets.length) {
      onChange(validPlatformTargets);
    }
  }, [allAvailablePlatformTargets, platformTargets, onChange]);

  // Check if a platform-target combination is selected
  const isSelected = (platformId: Platform, targetId: TargetPlatform): boolean => {
    return platformTargets.some(
      (pt) => pt.platform === platformId && pt.target === targetId
    );
  };

  // Determine which platforms have any selected targets
  const isPlatformSelected = (platformId: Platform) => {
    return platformTargets.some((pt) => pt.platform === platformId);
  };

  const handlePlatformToggle = (platformId: Platform) => {
    const availableTargets = getAvailableTargetsForPlatform(platformId);
    const availableTargetIds = availableTargets.map((t) => t.id as TargetPlatform);
    const hasAnySelected = isPlatformSelected(platformId);

    if (hasAnySelected) {
      // Remove all platform-target combinations for this platform
      onChange(
        platformTargets.filter((pt) => pt.platform !== platformId)
      );
    } else {
      // Add all available platform-target combinations for this platform
      const newPlatformTargets = availableTargetIds
        .map((target) => ({ platform: platformId, target }))
        .filter((pt) => !isSelected(pt.platform, pt.target));
      
      onChange([...platformTargets, ...newPlatformTargets]);
    }
  };

  const handleTargetToggle = (platformId: Platform, targetId: TargetPlatform) => {
    const isCurrentlySelected = isSelected(platformId, targetId);
    
    if (isCurrentlySelected) {
      // Remove this platform-target combination
      onChange(
        platformTargets.filter(
          (pt) => !(pt.platform === platformId && pt.target === targetId)
        )
      );
    } else {
      // Add this platform-target combination
      onChange([...platformTargets, { platform: platformId, target: targetId }]);
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
        const isPlatformSelectedValue = isPlatformSelected(platform.id);
        const PlatformIcon = platformIcons[platform.id] || IconTarget;
        const platformColor = platformColors[platform.id] || 'brand';
        const availableTargets = getAvailableTargetsForPlatform(platform.id);
        const platformDisabled = !hasAvailableTargets(platform.id);
        const missingIntegrations = getMissingIntegrations(platform.id);

        return (
          <Paper
            key={platform.id}
            p="md"
            radius="md"
            withBorder
            style={{
              borderColor: isPlatformSelectedValue 
                ? theme.colors[platformColor][4] 
                : platformDisabled 
                  ? theme.colors.red[2] 
                  : theme.colors.slate[2],
              backgroundColor: isPlatformSelectedValue 
                ? theme.colors[platformColor][0] 
                : platformDisabled 
                  ? theme.colors.red[0] 
                  : '#ffffff',
              transition: 'all 150ms ease',
              opacity: platformDisabled ? 0.7 : 1,
            }}
          >
            {/* Platform Header */}
            <UnstyledButton
              onClick={() => !platformDisabled && platform.available && toggleExpanded(platform.id)}
              w="100%"
              disabled={platformDisabled}
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
                    checked={isPlatformSelectedValue}
                    onChange={() => !platformDisabled && handlePlatformToggle(platform.id)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!platform.available || platformDisabled}
                    color={platformColor}
                    size="md"
                  />

                  {/* Platform Icon */}
                  <ThemeIcon
                    size={40}
                    radius="md"
                    variant={isPlatformSelectedValue ? 'filled' : 'light'}
                    color={platformColor}
                  >
                    <PlatformIcon size={22} />
                  </ThemeIcon>

                  {/* Platform Name */}
                  <Text fw={600} size="md" c={theme.colors.slate[8]}>
                    {platform.name}
                  </Text>

                  {/* Disabled Badge */}
                  {platformDisabled && (
                    <Badge color="red" variant="light" size="sm">
                      Integration Required
                    </Badge>
                  )}
                </Group>
              </Group>
            </UnstyledButton>

            {/* Missing Integration Message */}
            {platformDisabled && missingIntegrations.length > 0 && (
              <Alert
                icon={<IconPlug size={16} />}
                color="orange"
                variant="light"
                mt="md"
                title="Integration Required"
              >
                <Stack gap="xs">
                  <Text size="sm">
                    {missingIntegrations.length === 1
                      ? `Connect ${missingIntegrations[0].target} integration to enable this platform.`
                      : `Connect ${missingIntegrations.map((m) => m.target).join(' or ')} integration(s) to enable this platform.`}
                  </Text>
                  <Button
                    component={Link}
                    to={`/dashboard/${params.org}/integrations?tab=${IntegrationCategory.APP_DISTRIBUTION}`}
                    variant="light"
                    size="xs"
                    leftSection={<IconExternalLink size={14} />}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Go to Integrations
                  </Button>
                </Stack>
              </Alert>
            )}

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
                  {availableTargets.map((target) => {
                    const isTargetSelected = isSelected(platform.id as Platform, target.id as TargetPlatform);

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
                        onClick={() => target.available && handleTargetToggle(platform.id as Platform, target.id as TargetPlatform)}
                      >
                        <Group gap="sm">
                          <Checkbox
                            checked={isTargetSelected}
                            onChange={() => handleTargetToggle(platform.id as Platform, target.id as TargetPlatform)}
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
      {platformTargets.length === 0 && (
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
