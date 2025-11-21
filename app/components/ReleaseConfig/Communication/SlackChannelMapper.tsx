/**
 * Slack Channel Mapper Component
 * Map Slack channels for different notification types
 */

import { Stack, Text, Select, Card, Group, Switch, MultiSelect } from '@mantine/core';
import { IconBrandSlack } from '@tabler/icons-react';

interface SlackChannelMapperProps {
  enabled: boolean;
  integrationId: string;
  channels: {
    releases: string[];
    builds: string[];
    regression: string[];
    critical: string[];
  };
  onToggle: (enabled: boolean) => void;
  onChange: (channels: any) => void;
  onIntegrationChange: (integrationId: string) => void;
  availableIntegrations: Array<{ id: string; name: string }>;
  availableChannels?: Array<{ id: string; name: string }>; // Available Slack channels
}

export function SlackChannelMapper({
  enabled,
  integrationId,
  channels,
  onToggle,
  onChange,
  onIntegrationChange,
  availableIntegrations,
  availableChannels = [],
}: SlackChannelMapperProps) {
  // Channel options for MultiSelect
  const channelOptions = availableChannels.map(ch => ({
    value: ch.id,
    label: ch.name,
  }));
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
          checked={enabled}
          onChange={(e) => onToggle(e.currentTarget.checked)}
          size="md"
        />
        
        {enabled && (
          <>
            {availableIntegrations.length > 0 ? (
              <>
                <Select
                  label="Slack Workspace"
                  placeholder="Select Slack integration"
                  data={availableIntegrations.map(i => ({ value: i.id, label: i.name }))}
                  value={integrationId}
                  onChange={(val) => onIntegrationChange(val || '')}
                  required
                  description="Choose the connected Slack workspace"
                />
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Text size="sm" fw={500} className="mb-3">
                    Channel Mappings
                  </Text>
                  <Text size="xs" c="dimmed" className="mb-3">
                    Map Slack channels for different types of notifications
                  </Text>
                  
                  <Stack gap="sm">
                    <MultiSelect
                      label="Releases Channels"
                      placeholder="Select channels for release notifications"
                      data={channelOptions}
                      value={channels.releases || []}
                      onChange={(val) =>
                        onChange({ ...channels, releases: val })
                      }
                      searchable
                      clearable
                      description="Release announcements and status updates (supports multiple channels)"
                    />
                    
                    <MultiSelect
                      label="Builds Channels"
                      placeholder="Select channels for build notifications"
                      data={channelOptions}
                      value={channels.builds || []}
                      onChange={(val) =>
                        onChange({ ...channels, builds: val })
                      }
                      searchable
                      clearable
                      description="Build status and completion notifications (supports multiple channels)"
                    />
                    
                    <MultiSelect
                      label="Regression Channels"
                      placeholder="Select channels for regression updates"
                      data={channelOptions}
                      value={channels.regression || []}
                      onChange={(val) =>
                        onChange({ ...channels, regression: val })
                      }
                      searchable
                      clearable
                      description="Regression test updates (supports multiple channels)"
                    />
                    
                    <MultiSelect
                      label="Critical Alerts Channels"
                      placeholder="Select channels for critical alerts"
                      data={channelOptions}
                      value={channels.critical || []}
                      onChange={(val) =>
                        onChange({ ...channels, critical: val })
                      }
                      searchable
                      clearable
                      description="Critical issues and urgent notifications (supports multiple channels)"
                    />
                  </Stack>
                </div>
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

