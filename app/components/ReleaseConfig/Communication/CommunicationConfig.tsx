/**
 * Complete Communication Configuration Component
 * Main container for Slack and email notification configuration
 */

import { Stack, Text } from '@mantine/core';
import type { CommunicationConfig as CommunicationConfigType } from '~/types/release-config';
import { SlackChannelMapper } from './SlackChannelMapper';
import { EmailNotificationConfig } from './EmailNotificationConfig';

interface CommunicationConfigProps {
  config: CommunicationConfigType;
  onChange: (config: CommunicationConfigType) => void;
  availableIntegrations: {
    slack: Array<{ id: string; name: string }>;
  };
}

export function CommunicationConfig({
  config,
  onChange,
  availableIntegrations,
}: CommunicationConfigProps) {
  const handleSlackToggle = (enabled: boolean) => {
    onChange({
      ...config,
      slack: enabled
        ? {
            enabled: true,
            integrationId: config.slack?.integrationId || '',
            channels: config.slack?.channels || {
              releases: '#releases',
              builds: '#builds',
              regression: '#regression',
              critical: '#critical-alerts',
            },
          }
        : undefined,
    });
  };
  
  const handleSlackIntegrationChange = (integrationId: string) => {
    if (config.slack) {
      onChange({
        ...config,
        slack: {
          ...config.slack,
          integrationId,
        },
      });
    }
  };
  
  const handleSlackChannelsChange = (channels: any) => {
    if (config.slack) {
      onChange({
        ...config,
        slack: {
          ...config.slack,
          channels,
        },
      });
    }
  };
  
  const handleEmailToggle = (enabled: boolean) => {
    onChange({
      ...config,
      email: enabled
        ? {
            enabled: true,
            notificationEmails: config.email?.notificationEmails || [],
          }
        : undefined,
    });
  };
  
  const handleEmailChange = (emails: string[]) => {
    if (config.email) {
      onChange({
        ...config,
        email: {
          ...config.email,
          notificationEmails: emails,
        },
      });
    }
  };
  
  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-1">
          Communication Channels
        </Text>
        <Text size="sm" c="dimmed">
          Configure Slack notifications and email alerts for your team
        </Text>
      </div>
      
      <SlackChannelMapper
        enabled={config.slack?.enabled || false}
        integrationId={config.slack?.integrationId || ''}
        channels={
          config.slack?.channels || {
            releases: '',
            builds: '',
            regression: '',
            critical: '',
          }
        }
        onToggle={handleSlackToggle}
        onChange={handleSlackChannelsChange}
        onIntegrationChange={handleSlackIntegrationChange}
        availableIntegrations={availableIntegrations.slack}
      />
      
      <EmailNotificationConfig
        enabled={config.email?.enabled || false}
        emails={config.email?.notificationEmails || []}
        onToggle={handleEmailToggle}
        onChange={handleEmailChange}
      />
    </Stack>
  );
}

