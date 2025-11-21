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
  Card, 
  Group, 
  Switch, 
  Loader,
  Alert
} from '@mantine/core';
import { IconBrandSlack, IconAlertCircle } from '@tabler/icons-react';
import type { 
  CommunicationConfig,
  SlackChannelConfig,
  SlackChannel 
} from '~/types/release-config';

interface SlackChannelConfigEnhancedProps {
  config: CommunicationConfig;
  onChange: (config: CommunicationConfig) => void;
  availableIntegrations: Array<{ id: string; name: string }>;
  organizationId: string;
}

export function SlackChannelConfigEnhanced({
  config,
  onChange,
  availableIntegrations,
  organizationId,
}: SlackChannelConfigEnhancedProps) {
  const [availableChannels, setAvailableChannels] = useState<SlackChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  const slackConfig = config.slack;
  const isEnabled = slackConfig?.enabled || false;
  const integrationId = slackConfig?.integrationId || '';

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
      const response = await fetch(`/api/v1/integrations/${integrationId}/channels?tenantId=${organizationId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setAvailableChannels(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch channels');
      }
    } catch (error) {
      console.error('[Slack] Error fetching channels:', error);
      setChannelsError(error instanceof Error ? error.message : 'Failed to fetch channels');
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const handleToggle = (enabled: boolean) => {
    onChange({
      ...config,
      slack: enabled
        ? {
            enabled: true,
            integrationId: '',
            channels: {
              releases: [],
              builds: [],
              regression: [],
              critical: [],
            },
          }
        : undefined,
    });
  };

  const handleIntegrationChange = (integrationId: string) => {
    if (slackConfig) {
      onChange({
        ...config,
        slack: {
          ...slackConfig,
          integrationId,
        },
      });
    }
  };

  const handleChannelChange = (channelType: keyof SlackChannelConfig, channelIds: string[]) => {
    if (slackConfig && slackConfig.channels) {
      onChange({
        ...config,
        slack: {
          ...slackConfig,
          channels: {
            ...slackConfig.channels,
            [channelType]: channelIds,
          },
        },
      });
    }
  };

  const channelOptions = availableChannels.map(ch => ({
    value: ch.id,
    label: `#${ch.name}`,
  }));

  const renderChannelSelects = (
    channels: SlackChannelConfig,
    onChannelChange: (type: keyof SlackChannelConfig, value: string[]) => void
  ) => (
    <Stack gap="sm">
      <MultiSelect
        label="Releases Channels"
        placeholder="Select channels"
        data={channelOptions}
        value={channels.releases || []}
        onChange={(val) => onChannelChange('releases', val)}
        searchable
        clearable
        description="Release announcements and status updates (supports multiple channels)"
      />
      <MultiSelect
        label="Builds Channels"
        placeholder="Select channels"
        data={channelOptions}
        value={channels.builds || []}
        onChange={(val) => onChannelChange('builds', val)}
        searchable
        clearable
        description="Build status and completion notifications (supports multiple channels)"
      />
      <MultiSelect
        label="Regression Channels"
        placeholder="Select channels"
        data={channelOptions}
        value={channels.regression || []}
        onChange={(val) => onChannelChange('regression', val)}
        searchable
        clearable
        description="Regression test updates (supports multiple channels)"
      />
      <MultiSelect
        label="Critical Alerts Channels"
        placeholder="Select channels"
        data={channelOptions}
        value={channels.critical || []}
        onChange={(val) => onChannelChange('critical', val)}
        searchable
        clearable
        description="Critical issues and urgent notifications (supports multiple channels)"
      />
    </Stack>
  );

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group gap="sm" className="mb-3">
        <IconBrandSlack size={20} className="text-blue-600" />
        <Text fw={600} size="sm">
          Slack Integration
        </Text>
      </Group>

      <Stack gap="md">
        <Switch
          label="Enable Slack Notifications"
          description="Send release updates and notifications to Slack"
          checked={isEnabled}
          onChange={(e) => handleToggle(e.currentTarget.checked)}
          size="md"
        />

        {isEnabled && (
          <>
            {availableIntegrations.length > 0 ? (
              <>
                <Select
                  label="Slack Workspace"
                  placeholder="Select Slack integration"
                  data={availableIntegrations.map(i => ({ value: i.id, label: i.name }))}
                  value={integrationId}
                  onChange={(val) => handleIntegrationChange(val || '')}
                  required
                  description="Choose the connected Slack workspace"
                />

                {integrationId && (
                  <>
                    {isLoadingChannels ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader size="sm" />
                        <Text size="sm" c="dimmed" className="ml-2">
                          Loading channels...
                        </Text>
                      </div>
                    ) : channelsError ? (
                      <Alert color="red" icon={<IconAlertCircle size={16} />}>
                        {channelsError}
                      </Alert>
                    ) : availableChannels.length > 0 ? (
                      <>
                        {slackConfig?.channels && (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <Text size="sm" fw={500} className="mb-3">
                              Channel Mappings
                            </Text>
                            {renderChannelSelects(
                              slackConfig.channels,
                              (type, value) => handleChannelChange(type, value)
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <Alert color="blue">
                        No channels found for this workspace.
                      </Alert>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <Text size="sm" c="orange">
                  No Slack integration found. Please connect Slack in the Integrations
                  page before configuring notifications.
                </Text>
              </div>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}

