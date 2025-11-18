/**
 * Slack Channel Mapper Component
 * Map Slack channels for different notification types
 */

import { Stack, Text, TextInput, Select, Card, Group, Switch } from '@mantine/core';
import { IconBrandSlack } from '@tabler/icons-react';

interface SlackChannelMapperProps {
  enabled: boolean;
  integrationId: string;
  channels: {
    releases: string;
    builds: string;
    regression: string;
    critical: string;
  };
  onToggle: (enabled: boolean) => void;
  onChange: (channels: any) => void;
  onIntegrationChange: (integrationId: string) => void;
  availableIntegrations: Array<{ id: string; name: string }>;
}

export function SlackChannelMapper({
  enabled,
  integrationId,
  channels,
  onToggle,
  onChange,
  onIntegrationChange,
  availableIntegrations,
}: SlackChannelMapperProps) {
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
                    <TextInput
                      label="Releases Channel"
                      placeholder="#releases"
                      value={channels.releases}
                      onChange={(e) =>
                        onChange({ ...channels, releases: e.target.value })
                      }
                      required
                      description="Release announcements and status updates"
                    />
                    
                    <TextInput
                      label="Builds Channel"
                      placeholder="#builds"
                      value={channels.builds}
                      onChange={(e) =>
                        onChange({ ...channels, builds: e.target.value })
                      }
                      required
                      description="Build status and completion notifications"
                    />
                    
                    <TextInput
                      label="Regression Channel"
                      placeholder="#regression"
                      value={channels.regression}
                      onChange={(e) =>
                        onChange({ ...channels, regression: e.target.value })
                      }
                      required
                      description="Regression test updates"
                    />
                    
                    <TextInput
                      label="Critical Alerts Channel"
                      placeholder="#critical-alerts"
                      value={channels.critical}
                      onChange={(e) =>
                        onChange({ ...channels, critical: e.target.value })
                      }
                      required
                      description="Critical issues and urgent notifications"
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

