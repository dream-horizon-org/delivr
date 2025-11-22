/**
 * Configuration Summary Component
 * Display complete configuration for review
 */

import { Stack, Text, Card, Group, Badge, List, Divider } from '@mantine/core';
import {
  IconSettings,
  IconTarget,
  IconTestPipe,
  IconCalendar,
  IconBell,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';

interface ConfigSummaryProps {
  config: Partial<ReleaseConfiguration>;
}

export function ConfigSummary({ config }: ConfigSummaryProps) {
  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-1">
          Review Configuration
        </Text>
        <Text size="sm" c="dimmed">
          Review your release management configuration before saving
        </Text>
      </div>
      
      {/* Basic Info */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconSettings size={20} className="text-blue-600" />
          <Text fw={600} size="sm">
            Basic Information
          </Text>
        </Group>
        
        <Stack gap="xs">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Text c="dimmed">Configuration Name:</Text>
            <Text fw={500}>{config.name || 'Not set'}</Text>
            
            <Text c="dimmed">Release Type:</Text>
            <Badge variant="light" size="sm">
              {config.releaseType || 'PLANNED'}
            </Badge>
            
            <Text c="dimmed">Default Config:</Text>
            <Text fw={500}>{config.isDefault ? 'Yes' : 'No'}</Text>
          </div>
          
          {config.description && (
            <>
              <Divider className="my-2" />
              <div>
                <Text size="xs" c="dimmed" className="mb-1">
                  Description:
                </Text>
                <Text size="sm">{config.description}</Text>
              </div>
            </>
          )}
        </Stack>
      </Card>
      
      {/* Build Pipelines */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconSettings size={20} className="text-green-600" />
          <Text fw={600} size="sm">
            Build Pipelines
          </Text>
          <Badge size="sm" variant="light">
            {config.buildPipelines?.length || 0} configured
          </Badge>
        </Group>
        
        {config.buildPipelines && config.buildPipelines.length > 0 ? (
          <List spacing="xs" size="sm">
            {config.buildPipelines.map((pipeline) => (
              <List.Item
                key={pipeline.id}
                icon={
                  pipeline.enabled ? (
                    <IconCheck size={16} className="text-green-600" />
                  ) : (
                    <IconX size={16} className="text-gray-400" />
                  )
                }
              >
                <Group gap="xs">
                  <Text size="sm">{pipeline.name}</Text>
                  <Badge size="xs" variant="outline">
                    {pipeline.platform}
                  </Badge>
                  <Badge size="xs" variant="outline">
                    {pipeline.environment}
                  </Badge>
                  <Badge size="xs" variant="light">
                    {pipeline.provider.replace('_', ' ')}
                  </Badge>
                </Group>
              </List.Item>
            ))}
          </List>
        ) : (
          <Text size="sm" c="dimmed">
            No build pipelines configured
          </Text>
        )}
      </Card>
      
      {/* Target Platforms */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconTarget size={20} className="text-orange-600" />
          <Text fw={600} size="sm">
            Target Platforms
          </Text>
        </Group>
        
        {config.defaultTargets && config.defaultTargets.length > 0 ? (
          <Group gap="xs">
            {config.defaultTargets.map((target) => (
              <Badge key={target} variant="light" size="md">
                {target.replace('_', ' ')}
              </Badge>
            ))}
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            No target platforms selected
          </Text>
        )}
      </Card>
      
      {/* Test Management */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconTestPipe size={20} className="text-purple-600" />
          <Text fw={600} size="sm">
            Test Management
          </Text>
        </Group>
        
        {config.testManagement?.enabled ? (
          <Stack gap="xs">
            <Group gap="xs">
              <Text size="sm">Provider:</Text>
              <Badge variant="light" size="sm">
                {config.testManagement.provider}
              </Badge>
            </Group>
            
            {config.testManagement.providerConfig && (
              <div className="text-sm">
                <Text c="dimmed">Settings configured</Text>
              </div>
            )}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            Test management integration disabled
          </Text>
        )}
      </Card>
      
      {/* Scheduling */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconCalendar size={20} className="text-blue-600" />
          <Text fw={600} size="sm">
            Scheduling
          </Text>
        </Group>
        
        {config.scheduling ? (
          <Stack gap="sm">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Text c="dimmed">Frequency:</Text>
              <Badge variant="light" size="sm">
                {config.scheduling.releaseFrequency}
                {config.scheduling.customFrequencyDays &&
                  ` (${config.scheduling.customFrequencyDays} days)`}
              </Badge>
              
              <Text c="dimmed">Timezone:</Text>
              <Text fw={500}>{config.scheduling.timezone}</Text>
              
              <Text c="dimmed">Release Time:</Text>
              <Text fw={500}>{config.scheduling.targetReleaseTime}</Text>
              
              <Text c="dimmed">Kickoff Time:</Text>
              <Text fw={500}>{config.scheduling.kickoffTime}</Text>
              
              <Text c="dimmed">Release Offset:</Text>
              <Text fw={500}>{config.scheduling.targetReleaseDateOffsetFromKickoff} days</Text>
              
              <Text c="dimmed">Working Days:</Text>
              <Text fw={500}>{config.scheduling.workingDays.length} days/week</Text>
              
              <Text c="dimmed">Regression Slots:</Text>
              <Badge variant="light" size="sm">
                {config.scheduling.regressionSlots.length} slots
              </Badge>
            </div>
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            Scheduling not configured
          </Text>
        )}
      </Card>
      
      {/* Communication */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconBell size={20} className="text-indigo-600" />
          <Text fw={600} size="sm">
            Communication
          </Text>
        </Group>
        
        <Stack gap="sm">
          {config.communication?.slack?.enabled ? (
            <div>
              <Group gap="xs" className="mb-2">
                <IconCheck size={16} className="text-green-600" />
                <Text size="sm" fw={500}>
                  Slack Integration Enabled
                </Text>
              </Group>
              <div className="ml-6 text-xs text-gray-600">
                <div>• Releases: {config.communication.slack.channelData.releases.map(ch => `#${ch.name}`).join(', ')}</div>
                <div>• Builds: {config.communication.slack.channelData.builds.map(ch => `#${ch.name}`).join(', ')}</div>
                <div>• Regression: {config.communication.slack.channelData.regression.map(ch => `#${ch.name}`).join(', ')}</div>
                <div>• Critical: {config.communication.slack.channelData.critical.map(ch => `#${ch.name}`).join(', ')}</div>
              </div>
            </div>
          ) : (
            <Group gap="xs">
              <IconX size={16} className="text-gray-400" />
              <Text size="sm" c="dimmed">
                Slack disabled
              </Text>
            </Group>
          )}
          
          {config.communication?.email?.enabled ? (
            <div>
              <Group gap="xs" className="mb-2">
                <IconCheck size={16} className="text-green-600" />
                <Text size="sm" fw={500}>
                  Email Notifications Enabled
                </Text>
              </Group>
              <div className="ml-6">
                <Text size="xs" c="dimmed">
                  {config.communication.email.notificationEmails.length} recipient(s)
                </Text>
              </div>
            </div>
          ) : (
            <Group gap="xs">
              <IconX size={16} className="text-gray-400" />
              <Text size="sm" c="dimmed">
                Email disabled
              </Text>
            </Group>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

