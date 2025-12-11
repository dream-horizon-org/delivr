/**
 * Configuration Preview Modal Component
 * Shows all details about a release configuration
 */

import { Modal, Stack, Text, Card, Group, Badge, List, Divider, ScrollArea } from '@mantine/core';
import {
  IconSettings,
  IconTarget,
  IconTestPipe,
  IconCalendar,
  IconBell,
  IconCheck,
  IconX,
  IconTicket,
  IconBrandAndroid,
  IconBrandApple,
  IconDeviceMobile,
  IconCode,
  IconGitBranch,
} from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';
import { PLATFORMS, BUILD_ENVIRONMENTS, BUILD_PROVIDERS } from '~/types/release-config-constants';
import { SECTION_TITLES, FIELD_LABELS, BUILD_UPLOAD_LABELS, INFO_MESSAGES } from '~/constants/release-config-ui';

interface ConfigurationPreviewModalProps {
  opened: boolean;
  onClose: () => void;
  config: ReleaseConfiguration;
}

export function ConfigurationPreviewModal({
  opened,
  onClose,
  config,
}: ConfigurationPreviewModalProps) {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case PLATFORMS.ANDROID: return <IconBrandAndroid size={16} />;
      case PLATFORMS.IOS: return <IconBrandApple size={16} />;
      default: return <IconDeviceMobile size={16} />;
    }
  };

  const getProviderLabel = (provider: string): string => {
    switch (provider) {
      case BUILD_PROVIDERS.JENKINS:
        return 'Jenkins';
      case BUILD_PROVIDERS.GITHUB_ACTIONS:
        return 'GitHub Actions';
      case BUILD_PROVIDERS.MANUAL_UPLOAD:
        return 'Manual Upload';
      default:
        return provider;
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconSettings size={20} />
          <Text fw={600} size="lg">
            {config.name}
          </Text>
          {config.isDefault && (
            <Badge size="sm" variant="light" color="yellow">
              Default
            </Badge>
          )}
        </Group>
      }
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        {/* Basic Information */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" className="mb-3">
            <IconSettings size={20} className="text-blue-600" />
            <Text fw={600} size="sm">
              {SECTION_TITLES.BASIC_INFORMATION}
            </Text>
          </Group>
          
          <Stack gap="xs">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Text c="dimmed">{FIELD_LABELS.CONFIGURATION_NAME}:</Text>
              <Text fw={500}>{config.name || INFO_MESSAGES.NOT_SET}</Text>
              
              <Text c="dimmed">{FIELD_LABELS.RELEASE_TYPE}:</Text>
              <Badge variant="light" size="sm">
                {config.releaseType || INFO_MESSAGES.PLANNED}
              </Badge>
              
              <Text c="dimmed">{FIELD_LABELS.DEFAULT_CONFIG}:</Text>
              <Text fw={500}>{config.isDefault ? INFO_MESSAGES.YES : INFO_MESSAGES.NO}</Text>
              
              {config.baseBranch && (
                <>
                  <Text c="dimmed">Base Branch:</Text>
                  <Group gap="xs">
                    <IconGitBranch size={14} />
                    <Text fw={500}>{config.baseBranch}</Text>
                  </Group>
                </>
              )}
            </div>
            
            {config.description && (
              <>
                <Divider className="my-2" />
                <div>
                  <Text size="xs" c="dimmed" className="mb-1">
                    {FIELD_LABELS.DESCRIPTION}:
                  </Text>
                  <Text size="sm">{config.description}</Text>
                </div>
              </>
            )}
          </Stack>
        </Card>

        {/* Platforms & Targets */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" className="mb-3">
            <IconTarget size={20} className="text-purple-600" />
            <Text fw={600} size="sm">
              Platforms & Targets
            </Text>
          </Group>
          
          <Stack gap="sm">
            <div>
              <Text size="xs" c="dimmed" className="mb-2">
                Platforms:
              </Text>
              <Group gap="xs">
                {config.platforms?.map((platform) => (
                  <Badge
                    key={platform}
                    variant="light"
                    color="blue"
                    leftSection={getPlatformIcon(platform)}
                    size="md"
                  >
                    {platform}
                  </Badge>
                )) || <Text size="sm" c="dimmed">None configured</Text>}
              </Group>
            </div>
            
            <Divider />
            
            <div>
              <Text size="xs" c="dimmed" className="mb-2">
                Target Platforms:
              </Text>
              <Group gap="xs">
                {config.targets?.map((target) => (
                  <Badge
                    key={target}
                    variant="outline"
                    color="gray"
                    size="sm"
                  >
                    {target.replace(/_/g, ' ')}
                  </Badge>
                )) || <Text size="sm" c="dimmed">None configured</Text>}
              </Group>
            </div>
          </Stack>
        </Card>

        {/* Build Upload Method */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" className="mb-3">
            <IconCode size={20} className="text-green-600" />
            <Text fw={600} size="sm">
              {SECTION_TITLES.BUILD_UPLOAD_METHOD}
            </Text>
          </Group>
          
          <Stack gap="sm">
            <div className="flex items-center gap-2">
              <Badge size="lg" variant="light" color={!config.hasManualBuildUpload ? 'grape' : 'blue'}>
                {!config.hasManualBuildUpload ? BUILD_UPLOAD_LABELS.CI_CD : BUILD_UPLOAD_LABELS.MANUAL}
              </Badge>
            </div>
            
            {!config.hasManualBuildUpload && config.ciConfig?.workflows && config.ciConfig.workflows.length > 0 && (
              <>
                <Divider />
                <div>
                  <Text size="sm" fw={500} className="mb-2">
                    {FIELD_LABELS.CONFIGURED_WORKFLOWS} ({config.ciConfig.workflows.length})
                  </Text>
                  <List spacing="xs" size="sm">
                    {config.ciConfig.workflows.map((pipeline) => (
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
                          <Text size="sm" fw={500}>{pipeline.name}</Text>
                          <Badge size="xs" variant="light">
                            {pipeline.platform}
                          </Badge>
                          <Badge size="xs" variant="light" color="blue">
                            {pipeline.environment}
                          </Badge>
                          <Badge size="xs" variant="outline">
                            {getProviderLabel(pipeline.provider)}
                          </Badge>
                        </Group>
                      </List.Item>
                    ))}
                  </List>
                </div>
              </>
            )}
          </Stack>
        </Card>

        {/* Test Management */}
        {config.testManagementConfig?.enabled && (
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group gap="sm" className="mb-3">
              <IconTestPipe size={20} className="text-orange-600" />
              <Text fw={600} size="sm">
                Test Management
              </Text>
            </Group>
            
            <Stack gap="xs">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Text c="dimmed">Provider:</Text>
                <Text fw={500}>{config.testManagementConfig.provider || 'Checkmate'}</Text>
                
                {config.testManagementConfig.providerConfig?.passThresholdPercent && (
                  <>
                    <Text c="dimmed">Pass Threshold:</Text>
                    <Text fw={500}>{config.testManagementConfig.providerConfig.passThresholdPercent}%</Text>
                  </>
                )}
              </div>
            </Stack>
          </Card>
        )}

        {/* Project Management */}
        {config.projectManagementConfig?.enabled && (
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group gap="sm" className="mb-3">
              <IconTicket size={20} className="text-indigo-600" />
              <Text fw={600} size="sm">
                Project Management
              </Text>
            </Group>
            
            <Stack gap="xs">
              {config.projectManagementConfig.platformConfigurations && 
               config.projectManagementConfig.platformConfigurations.length > 0 && (
                <div>
                  <Text size="xs" c="dimmed" className="mb-2">
                    Platform Configurations:
                  </Text>
                  {config.projectManagementConfig.platformConfigurations.map((pc: any, idx: number) => (
                    <div key={idx} className="mb-2 p-2 bg-gray-50 rounded">
                      <Text size="sm" fw={500} className="mb-1">{pc.platform}</Text>
                      <div className="text-xs text-gray-600">
                        {pc.projectKey && <div>Project: {pc.projectKey}</div>}
                        {pc.issueType && <div>Issue Type: {pc.issueType}</div>}
                        {pc.completedStatus && <div>Completed Status: {pc.completedStatus}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Stack>
          </Card>
        )}

        {/* Communication */}
        {config.communicationConfig?.slack?.enabled && (
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group gap="sm" className="mb-3">
              <IconBell size={20} className="text-pink-600" />
              <Text fw={600} size="sm">
                Communication (Slack)
              </Text>
            </Group>
            
            <Stack gap="xs">
              {config.communicationConfig.slack.channelData && (
                <div className="text-sm">
                  {Object.entries(config.communicationConfig.slack.channelData).map(([key, channels]: [string, any]) => (
                    channels && Array.isArray(channels) && channels.length > 0 && (
                      <div key={key} className="mb-2">
                        <Text size="xs" c="dimmed" className="mb-1 capitalize">
                          {key}:
                        </Text>
                        <Group gap="xs">
                          {channels.map((channel: any) => (
                            <Badge key={channel.id} size="sm" variant="light">
                              {channel.name}
                            </Badge>
                          ))}
                        </Group>
                      </div>
                    )
                  ))}
                </div>
              )}
            </Stack>
          </Card>
        )}

        {/* Scheduling */}
        {config.releaseSchedule && (
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group gap="sm" className="mb-3">
              <IconCalendar size={20} className="text-teal-600" />
              <Text fw={600} size="sm">
                Scheduling
              </Text>
            </Group>
            
            <Stack gap="xs">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Text c="dimmed">Frequency:</Text>
                <Text fw={500} className="uppercase">
                  {config.releaseSchedule.releaseFrequency}
                </Text>
                
                {config.releaseSchedule.kickoffTime && (
                  <>
                    <Text c="dimmed">Kickoff Time:</Text>
                    <Text fw={500}>{config.releaseSchedule.kickoffTime}</Text>
                  </>
                )}
                
                {config.releaseSchedule.timezone && (
                  <>
                    <Text c="dimmed">Timezone:</Text>
                    <Text fw={500}>{config.releaseSchedule.timezone}</Text>
                  </>
                )}
                
                {config.releaseSchedule.regressionSlots && (
                  <>
                    <Text c="dimmed">Regression Slots:</Text>
                    <Text fw={500}>{config.releaseSchedule.regressionSlots.length}</Text>
                  </>
                )}
              </div>
            </Stack>
          </Card>
        )}

        {/* Metadata */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" className="mb-3">
            <IconSettings size={20} className="text-gray-600" />
            <Text fw={600} size="sm">
              Metadata
            </Text>
          </Group>
          
          <Stack gap="xs">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Text c="dimmed">Status:</Text>
              <Badge 
                variant="light" 
                color={config.isActive ? 'green' : 'red'}
                size="sm"
              >
                {config.isActive ? 'ACTIVE' : 'ARCHIVED'}
              </Badge>
              
              <Text c="dimmed">Created:</Text>
              <Text fw={500} size="sm">
                {new Date(config.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              
              <Text c="dimmed">Last Updated:</Text>
              <Text fw={500} size="sm">
                {new Date(config.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </div>
          </Stack>
        </Card>
      </Stack>
    </Modal>
  );
}

