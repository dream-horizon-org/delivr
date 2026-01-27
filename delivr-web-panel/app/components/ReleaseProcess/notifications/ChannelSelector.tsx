import { useState, useEffect } from 'react';
import { Stack, Text, MultiSelect, Alert, Loader, Center, useMantineTheme } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { SlackChannel } from '~/types/release-config';
import type { SlackChannelRef } from '~/types/release-process.types';
import { AD_HOC_NOTIFICATION_LABELS } from '~/constants/release-process-ui';
import { apiGet, getApiErrorMessage } from '~/utils/api-client';

interface ChannelSelectorProps {
  integrationId: string | null;
  tenantId: string;
  selectedChannels: SlackChannelRef[];
  onChange: (channels: SlackChannelRef[]) => void;
}

export function ChannelSelector({
  integrationId,
  tenantId,
  selectedChannels,
  onChange,
}: ChannelSelectorProps) {
  const theme = useMantineTheme();
  const [availableChannels, setAvailableChannels] = useState<SlackChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  // Fetch channels when integrationId is available
  useEffect(() => {
    if (integrationId) {
      fetchChannels(integrationId);
    } else {
      setAvailableChannels([]);
    }
  }, [integrationId, tenantId]);

  const fetchChannels = async (integrationId: string) => {
    setIsLoadingChannels(true);
    setChannelsError(null);

    try {
      const result = await apiGet<SlackChannel[]>(
        `/api/v1/communication/slack/${integrationId}/channels?tenantId=${tenantId}`
      );

      if (result.success && result.data) {
        setAvailableChannels(result.data);
      } else {
        throw new Error('Failed to fetch channels');
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to fetch Slack channels');
      setChannelsError(errorMessage);
      setAvailableChannels([]);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  // Show loading state
  if (isLoadingChannels) {
    return (
      <Stack gap="md">
        <div>
          <Text size="sm" fw={600} mb="xs">
            {AD_HOC_NOTIFICATION_LABELS.CHANNELS_SECTION_TITLE}
          </Text>
          <Text size="xs" c="dimmed">
            {AD_HOC_NOTIFICATION_LABELS.CHANNELS_DESCRIPTION}
          </Text>
        </div>
        <Center py="md">
          <Loader size="sm" />
        </Center>
      </Stack>
    );
  }

  // Show error state
  if (channelsError) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
        <Text size="sm">{channelsError}</Text>
      </Alert>
    );
  }

  // Show no integration configured state
  if (!integrationId) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light">
        <Text size="sm">{AD_HOC_NOTIFICATION_LABELS.NO_CHANNELS_CONFIGURED}</Text>
      </Alert>
    );
  }

  // Show no channels available state
  if (availableChannels.length === 0) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light">
        <Text size="sm">No Slack channels available. Please check your Slack integration configuration.</Text>
      </Alert>
    );
  }

  // Convert channels to MultiSelect data format
  const channelOptions = availableChannels.map(channel => ({
    value: channel.id,
    label: `#${channel.name}`,
  }));

  // Get selected channel IDs for the MultiSelect value
  const selectedChannelIds = selectedChannels.map(ch => ch.id);

  // Handle selection change - convert IDs back to channel objects
  const handleChange = (selectedIds: string[]) => {
    const selectedChannelObjects = selectedIds
      .map(id => availableChannels.find(ch => ch.id === id))
      .filter((ch): ch is SlackChannel => ch !== undefined)
      .map(ch => ({ id: ch.id, name: ch.name }));
    
    onChange(selectedChannelObjects);
  };

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={600} mb="xs">
          {AD_HOC_NOTIFICATION_LABELS.CHANNELS_SECTION_TITLE}
        </Text>
        <Text size="xs" c="dimmed">
          {AD_HOC_NOTIFICATION_LABELS.CHANNELS_DESCRIPTION}
        </Text>
      </div>

      <MultiSelect
        data={channelOptions}
        value={selectedChannelIds}
        onChange={handleChange}
        placeholder="Select channels..."
        searchable
        clearable
        maxDropdownHeight={200}
        styles={{
          pill: {
            backgroundColor: theme.colors.brand[1], // Light teal background
            color: theme.colors.brand[7],           // Dark teal text
            fontWeight: 500,
          },
        }}
      />
    </Stack>
  );
}
