/**
 * Workflow Preview Modal Component
 * Shows all details about a CI/CD workflow
 */

import { Modal, Stack, Text, Card, Group, Badge, Divider, ScrollArea, useMantineTheme, ThemeIcon } from '@mantine/core';
import {
  IconRocket,
  IconBrandAndroid,
  IconBrandApple,
  IconServer,
  IconBrandGithub,
  IconLink,
  IconCalendar,
} from '@tabler/icons-react';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { PLATFORMS, BUILD_PROVIDERS } from '~/types/release-config-constants';
import { PLATFORM_LABELS, ENVIRONMENT_LABELS, PROVIDER_LABELS } from '~/constants/release-config-ui';
import { workflowTypeToEnvironment } from '~/types/workflow-mappings';

interface WorkflowPreviewModalProps {
  opened: boolean;
  onClose: () => void;
  workflow: CICDWorkflow;
}

export function WorkflowPreviewModal({
  opened,
  onClose,
  workflow,
}: WorkflowPreviewModalProps) {
  const theme = useMantineTheme();

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case PLATFORMS.ANDROID:
        return <IconBrandAndroid size={18} />;
      case PLATFORMS.IOS:
        return <IconBrandApple size={18} />;
      default:
        return null;
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case BUILD_PROVIDERS.JENKINS:
        return <IconServer size={18} />;
      case BUILD_PROVIDERS.GITHUB_ACTIONS:
        return <IconBrandGithub size={18} />;
      default:
        return <IconRocket size={18} />;
    }
  };

  const getProviderLabel = (provider: string): string => {
    switch (provider) {
      case BUILD_PROVIDERS.JENKINS:
        return PROVIDER_LABELS.JENKINS;
      case BUILD_PROVIDERS.GITHUB_ACTIONS:
        return PROVIDER_LABELS.GITHUB_ACTIONS;
      default:
        return provider;
    }
  };

  const getWorkflowTypeLabel = (workflowType: string) => {
    const environment = workflowTypeToEnvironment[workflowType];
    if (environment) {
      return ENVIRONMENT_LABELS[environment] || workflowType;
    }
    return workflowType;
  };

  const getWorkflowTypeColor = (workflowType: string) => {
    const type = workflowType.toLowerCase();
    if (type.includes('pre')) return 'blue';
    if (type.includes('regression')) return 'purple';
    if (type.includes('testflight')) return 'orange';
    if (type.includes('aab')) return 'teal';
    if (type.includes('production')) return 'green';
    return 'gray';
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size={32} radius="md" variant="light" color="brand">
            <IconRocket size={18} />
          </ThemeIcon>
          <Text fw={600} size="lg" c={theme.colors.slate[9]}>
            {workflow.displayName}
          </Text>
        </Group>
      }
      size="lg"
      radius="md"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        {/* Basic Information */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <ThemeIcon size={24} radius="md" variant="light" color="brand">
              <IconRocket size={16} />
            </ThemeIcon>
            <Text fw={600} size="sm" c={theme.colors.slate[8]}>
              Basic Information
            </Text>
          </Group>

          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" c={theme.colors.slate[5]}>
                Name:
              </Text>
              <Text fw={500} size="sm" c={theme.colors.slate[9]}>
                {workflow.displayName}
              </Text>
            </Group>

            <Divider />

            <Group justify="space-between">
              <Text size="sm" c={theme.colors.slate[5]}>
                Platform:
              </Text>
              <Badge
                variant="light"
                color="brand"
                leftSection={getPlatformIcon(workflow.platform)}
                size="md"
              >
                {PLATFORM_LABELS[workflow.platform] || workflow.platform}
              </Badge>
            </Group>

            <Divider />

            <Group justify="space-between">
              <Text size="sm" c={theme.colors.slate[5]}>
                Environment:
              </Text>
              <Badge
                variant="light"
                color={getWorkflowTypeColor(workflow.workflowType)}
                size="md"
              >
                {getWorkflowTypeLabel(workflow.workflowType)}
              </Badge>
            </Group>

            <Divider />

            <Group justify="space-between">
              <Text size="sm" c={theme.colors.slate[5]}>
                Provider:
              </Text>
              <Badge
                variant="light"
                color={workflow.providerType === BUILD_PROVIDERS.JENKINS ? 'red' : 'gray'}
                leftSection={getProviderIcon(workflow.providerType)}
                size="md"
              >
                {getProviderLabel(workflow.providerType)}
              </Badge>
            </Group>
          </Stack>
        </Card>

        {/* Workflow URL */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <ThemeIcon size={24} radius="md" variant="light" color="blue">
              <IconLink size={16} />
            </ThemeIcon>
            <Text fw={600} size="sm" c={theme.colors.slate[8]}>
              Workflow URL
            </Text>
          </Group>

          <Text
            size="sm"
            c={theme.colors.blue[7]}
            style={{
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              lineHeight: 1.5,
            }}
          >
            {workflow.workflowUrl}
          </Text>
        </Card>

        {/* Parameters */}
        {workflow.parameters && Object.keys(workflow.parameters).length > 0 && (
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group gap="sm" mb="md">
              <ThemeIcon size={24} radius="md" variant="light" color="purple">
                <IconRocket size={16} />
              </ThemeIcon>
              <Text fw={600} size="sm" c={theme.colors.slate[8]}>
                Parameters
              </Text>
            </Group>

            <Stack gap="xs">
              {Object.entries(workflow.parameters).map(([key, value]) => (
                <Group key={key} justify="space-between">
                  <Text size="sm" c={theme.colors.slate[5]}>
                    {key}:
                  </Text>
                  <Text
                    fw={500}
                    size="sm"
                    c={theme.colors.slate[9]}
                    style={{
                      fontFamily: 'monospace',
                      maxWidth: '60%',
                      wordBreak: 'break-all',
                      textAlign: 'right',
                    }}
                  >
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Card>
        )}

        {/* Provider Identifiers */}
        {workflow.providerIdentifiers &&
          Object.keys(workflow.providerIdentifiers).length > 0 && (
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Group gap="sm" mb="md">
                <ThemeIcon size={24} radius="md" variant="light" color="cyan">
                  <IconRocket size={16} />
                </ThemeIcon>
                <Text fw={600} size="sm" c={theme.colors.slate[8]}>
                  Provider Identifiers
                </Text>
              </Group>

              <Stack gap="xs">
                {Object.entries(workflow.providerIdentifiers).map(([key, value]) => (
                  <Group key={key} justify="space-between">
                    <Text size="sm" c={theme.colors.slate[5]}>
                      {key}:
                    </Text>
                    <Text
                      fw={500}
                      size="sm"
                      c={theme.colors.slate[9]}
                      style={{
                        fontFamily: 'monospace',
                        maxWidth: '60%',
                        wordBreak: 'break-all',
                        textAlign: 'right',
                      }}
                    >
                      {String(value)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Card>
          )}

        {/* Metadata */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <ThemeIcon size={24} radius="md" variant="light" color="gray">
              <IconCalendar size={16} />
            </ThemeIcon>
            <Text fw={600} size="sm" c={theme.colors.slate[8]}>
              Metadata
            </Text>
          </Group>

          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" c={theme.colors.slate[5]}>
                Created:
              </Text>
              <Text fw={500} size="sm" c={theme.colors.slate[9]}>
                {new Date(workflow.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Group>

            <Divider />

            <Group justify="space-between">
              <Text size="sm" c={theme.colors.slate[5]}>
                Last Updated:
              </Text>
              <Text fw={500} size="sm" c={theme.colors.slate[9]}>
                {new Date(workflow.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Modal>
  );
}

