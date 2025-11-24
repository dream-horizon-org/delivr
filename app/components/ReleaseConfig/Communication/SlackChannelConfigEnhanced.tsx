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
import { apiGet, getApiErrorMessage } from '~/utils/api-client';
import type { 
  CommunicationConfig,
  SlackChannelConfig,
  SlackChannel 
} from '~/types/release-config';
import type { SlackChannelConfigEnhancedProps } from '~/types/release-config-props';
import { SLACK_LABELS, ICON_SIZES } from '~/constants/release-config-ui';

export function SlackChannelConfigEnhanced({
  config,
  onChange,
  availableIntegrations,
  tenantId,
}: SlackChannelConfigEnhancedProps) {
  const [availableChannels, setAvailableChannels] = useState<SlackChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  const slackConfig = config?.slack;
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
      const result = await apiGet<SlackChannel[]>(
        `/api/v1/integrations/${integrationId}/channels?tenantId=${tenantId}`
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
      slack: enabled
        ? {
            enabled: true,
            integrationId: '',
            channelData: {
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
    if (slackConfig && slackConfig.channelData) {
      // Convert channel IDs to channel objects with id and name
      const channelObjects = channelIds.map(id => {
        const channel = availableChannels.find(ch => ch.id === id);
        return channel || { id, name: id }; // Fallback if channel not found
      });
      
      onChange({
        ...config,
        slack: {
          ...slackConfig,
          channelData: {
            ...slackConfig.channelData,
            [channelType]: channelObjects,
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
        label={SLACK_LABELS.RELEASES_LABEL}
        placeholder={SLACK_LABELS.SELECT_CHANNELS_PLACEHOLDER}
        data={channelOptions}
        value={channels.releases?.map(ch => ch.id) || []}
        onChange={(val) => onChannelChange('releases', val)}
        searchable
        clearable
        description={SLACK_LABELS.RELEASES_DESCRIPTION}
      />
      <MultiSelect
        label={SLACK_LABELS.BUILDS_LABEL}
        placeholder={SLACK_LABELS.SELECT_CHANNELS_PLACEHOLDER}
        data={channelOptions}
        value={channels.builds?.map(ch => ch.id) || []}
        onChange={(val) => onChannelChange('builds', val)}
        searchable
        clearable
        description={SLACK_LABELS.BUILDS_DESCRIPTION}
      />
      <MultiSelect
        label={SLACK_LABELS.REGRESSION_LABEL}
        placeholder={SLACK_LABELS.SELECT_CHANNELS_PLACEHOLDER}
        data={channelOptions}
        value={channels.regression?.map(ch => ch.id) || []}
        onChange={(val) => onChannelChange('regression', val)}
        searchable
        clearable
        description={SLACK_LABELS.REGRESSION_DESCRIPTION}
      />
      <MultiSelect
        label={SLACK_LABELS.CRITICAL_LABEL}
        placeholder={SLACK_LABELS.SELECT_CHANNELS_PLACEHOLDER}
        data={channelOptions}
        value={channels.critical?.map(ch => ch.id) || []}
        onChange={(val) => onChannelChange('critical', val)}
        searchable
        clearable
        description={SLACK_LABELS.CRITICAL_DESCRIPTION}
      />
    </Stack>
  );

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group gap="sm" className="mb-3">
        <IconBrandSlack size={ICON_SIZES.MEDIUM} className="text-blue-600" />
        <Text fw={600} size="sm">
          {SLACK_LABELS.INTEGRATION_TITLE}
        </Text>
      </Group>

      <Stack gap="md">
        <Switch
          label={SLACK_LABELS.ENABLE_NOTIFICATIONS}
          description={SLACK_LABELS.ENABLE_DESCRIPTION}
          checked={isEnabled}
          onChange={(e) => handleToggle(e.currentTarget.checked)}
          size="md"
        />

        {isEnabled && (
          <>
            {availableIntegrations.length > 0 ? (
              <>
                <Select
                  label={SLACK_LABELS.WORKSPACE_LABEL}
                  placeholder={SLACK_LABELS.WORKSPACE_PLACEHOLDER}
                  data={availableIntegrations.map(i => ({ value: i.id, label: i.name }))}
                  value={integrationId}
                  onChange={(val) => handleIntegrationChange(val || '')}
                  required
                  description={SLACK_LABELS.WORKSPACE_DESCRIPTION}
                />

                {integrationId && (
                  <>
                    {isLoadingChannels ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader size="sm" />
                        <Text size="sm" c="dimmed" className="ml-2">
                          {SLACK_LABELS.LOADING_CHANNELS}
                        </Text>
                      </div>
                    ) : channelsError ? (
                      <Alert color="red" icon={<IconAlertCircle size={ICON_SIZES.SMALL} />}>
                        {channelsError}
                      </Alert>
                    ) : availableChannels.length > 0 ? (
                      <>
                        {slackConfig?.channelData && (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <Text size="sm" fw={500} className="mb-3">
                              {SLACK_LABELS.CHANNEL_MAPPINGS_TITLE}
                            </Text>
                            {renderChannelSelects(
                              slackConfig.channelData,
                              (type, value) => handleChannelChange(type, value)
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <Alert color="blue">
                        {SLACK_LABELS.NO_CHANNELS_MESSAGE}
                      </Alert>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <Text size="sm" c="orange">
                  {SLACK_LABELS.NO_WORKSPACE_MESSAGE}
                </Text>
              </div>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}

