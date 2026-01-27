/**
 * Enhanced Slack Channel Configuration Component
 * Supports both global and stage-wise channel configuration
 */

import { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Select,
  MultiSelect,
  Paper,
  Group,
  Switch,
  Loader,
  Box,
  ThemeIcon,
  Center,
  useMantineTheme,
} from '@mantine/core';
import { IconBrandSlack, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { apiGet, getApiErrorMessage } from '~/utils/api-client';
import type {
  CommunicationConfig,
  SlackChannelConfig,
  SlackChannel,
} from '~/types/release-config';
import type { SlackChannelConfigEnhancedProps } from '~/types/release-config-props';

export function SlackChannelConfigEnhanced({
  config,
  onChange,
  availableIntegrations,
  appId,
}: SlackChannelConfigEnhancedProps) {
  const theme = useMantineTheme();
  const [availableChannels, setAvailableChannels] = useState<SlackChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  // Use flat structure: config.enabled, config.integrationId, config.channelData
  const isEnabled = config?.enabled || false;
  const integrationId = config?.integrationId || '';

  // Fetch channels when integration is selected
  useEffect(() => {
    if (isEnabled && integrationId) {
      fetchChannels(integrationId);
    }
  }, [isEnabled, integrationId]);

  const fetchChannels = async (integrationId: string) => {
    setIsLoadingChannels(true);
    setChannelsError(null);

    try {
      const result = await apiGet<SlackChannel[]>(
        `/api/v1/communication/slack/${integrationId}/channels?appId=${appId}`
      );

      if (result.success && result.data) {
        setAvailableChannels(result.data);
      } else {
        throw new Error('Failed to fetch channels');
      }
    } catch (error) {
      setChannelsError(getApiErrorMessage(error, 'Failed to fetch channels'));
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const handleToggle = (enabled: boolean) => {
    onChange({
      ...config,
      enabled,
      integrationId: enabled ? (availableIntegrations[0]?.id || '') : (config?.integrationId || ''),
      channelData: enabled
        ? (config?.channelData || {
            releases: [],
            builds: [],
            regression: [],
            critical: [],
          })
        : (config?.channelData || {
            releases: [],
            builds: [],
            regression: [],
            critical: [],
          }),
    });
  };

  const handleIntegrationChange = (newIntegrationId: string) => {
    onChange({
      ...config,
      integrationId: newIntegrationId,
      enabled: config?.enabled ?? true,
      channelData: config?.channelData || {
        releases: [],
        builds: [],
        regression: [],
        critical: [],
      },
    });
  };

  const handleChannelChange = (channelType: keyof SlackChannelConfig, channelIds: string[]) => {
    if (config) {
      const channelObjects = channelIds.map((id) => {
        const channel = availableChannels.find((ch) => ch.id === id);
        return channel || { id, name: id };
      });

      onChange({
        ...config,
        channelData: {
          ...(config.channelData || {
            releases: [],
            builds: [],
            regression: [],
            critical: [],
          }),
          [channelType]: channelObjects,
        },
      });
    }
  };

  const channelOptions = availableChannels.map((ch) => ({
    value: ch.id,
    label: `#${ch.name}`,
  }));

  return (
    <Paper p="lg" radius="md" withBorder>
      <Stack gap="lg">
        {/* Header */}
        <Group gap="sm" mb="xs">
          <ThemeIcon 
            size={36} 
            radius="md" 
            variant={isEnabled ? 'filled' : 'light'} 
            color={isEnabled ? 'blue' : 'gray'}
          >
            <IconBrandSlack size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Group gap="xs">
              <Text fw={600} size="md" c={theme.colors.slate[8]}>
                Slack Notifications
              </Text>
              {isEnabled && (
                <ThemeIcon size={20} radius="xl" color="blue">
                  <IconCheck size={12} />
                </ThemeIcon>
              )}
            </Group>
            <Text size="xs" c={theme.colors.slate[5]}>
              Configure Slack channels for release notifications
            </Text>
          </Box>
          <Switch
            checked={isEnabled}
            onChange={(e) => handleToggle(e.currentTarget.checked)}
            size="md"
            color="blue"
          />
        </Group>

        {isEnabled && (
          <Stack gap="md">
            {availableIntegrations.length > 0 ? (
              <>
                <Select
                  label="Slack Workspace"
                  placeholder="Select a workspace"
                  data={availableIntegrations.map((i) => ({ value: i.id, label: i.displayName || i.name }))}
                  value={integrationId}
                  onChange={(val) => handleIntegrationChange(val || '')}
                  required
                  description="Select the Slack workspace to use for notifications"
                  size="sm"
                />

                {integrationId && (
                  <>
                    {isLoadingChannels ? (
                      <Center py="xl">
                        <Group gap="sm">
                          <Loader size="sm" />
                          <Text size="sm" c={theme.colors.slate[5]}>
                            Loading channels...
                          </Text>
                        </Group>
                      </Center>
                    ) : channelsError ? (
                      <Paper
                        p="md"
                        radius="md"
                        style={{
                          backgroundColor: theme.colors.red[0],
                          border: `1px solid ${theme.colors.red[2]}`,
                        }}
                      >
                        <Group gap="sm">
                          <ThemeIcon size={24} radius="md" variant="light" color="red">
                            <IconAlertCircle size={14} />
                          </ThemeIcon>
                          <Text size="sm" c={theme.colors.red[8]}>
                            {channelsError}
                          </Text>
                        </Group>
                      </Paper>
                    ) : availableChannels.length > 0 ? (
                      <>
                        {config?.channelData && (
                          <Paper
                            p="md"
                            radius="md"
                            style={{
                              backgroundColor: theme.colors.slate[0],
                              border: `1px solid ${theme.colors.slate[2]}`,
                            }}
                          >
                            <Text size="sm" fw={600} c={theme.colors.slate[8]} mb="md">
                              Channel Mappings
                            </Text>
                            <Stack gap="md">
                              <MultiSelect
                                label="Release Notifications"
                                placeholder="Select channels"
                                data={channelOptions}
                                value={config.channelData.releases?.map((ch) => ch.id) || []}
                                onChange={(val) => handleChannelChange('releases', val)}
                                searchable
                                clearable
                                description="Channels to notify for new releases"
                                size="sm"
                                required
                              />
                              <MultiSelect
                                label="Build Notifications"
                                placeholder="Select channels"
                                data={channelOptions}
                                value={config.channelData.builds?.map((ch) => ch.id) || []}
                                onChange={(val) => handleChannelChange('builds', val)}
                                searchable
                                clearable
                                description="Channels to notify for build updates"
                                size="sm"
                                required
                              />
                              <MultiSelect
                                label="Regression Notifications"
                                placeholder="Select channels"
                                data={channelOptions}
                                value={config.channelData.regression?.map((ch) => ch.id) || []}
                                onChange={(val) => handleChannelChange('regression', val)}
                                searchable
                                clearable
                                description="Channels to notify for regression testing"
                                size="sm"
                                required
                              />
                              <MultiSelect
                                label="Critical Notifications"
                                placeholder="Select channels"
                                data={channelOptions}
                                value={config.channelData.critical?.map((ch) => ch.id) || []}
                                onChange={(val) => handleChannelChange('critical', val)}
                                searchable
                                clearable
                                description="Channels to notify for critical issues"
                                size="sm"
                                required
                              />
                            </Stack>
                          </Paper>
                        )}
                      </>
                    ) : (
                      <Paper
                        p="md"
                        radius="md"
                        style={{
                          backgroundColor: theme.colors.blue[0],
                          border: `1px solid ${theme.colors.blue[2]}`,
                        }}
                      >
                        <Text size="sm" c={theme.colors.blue[7]}>
                          No channels available in this workspace
                        </Text>
                      </Paper>
                    )}
                  </>
                )}
              </>
            ) : (
              <Paper
                p="md"
                radius="md"
                style={{
                  backgroundColor: theme.colors.yellow[0],
                  border: `1px solid ${theme.colors.yellow[2]}`,
                }}
              >
                <Group gap="sm">
                  <ThemeIcon size={24} radius="md" variant="light" color="yellow">
                    <IconAlertCircle size={14} />
                  </ThemeIcon>
                  <Text size="sm" c={theme.colors.yellow[8]}>
                    No Slack workspaces available
                  </Text>
                </Group>
              </Paper>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
