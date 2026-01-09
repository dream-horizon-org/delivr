/**
 * Workflow Preview Modal Component
 * Shows all details about a CI/CD workflow
 */

import { Modal, Stack, Text, Card, Group, Badge, Divider, ScrollArea, useMantineTheme, ThemeIcon, Anchor } from '@mantine/core';
import {
  IconRocket,
  IconLink,
  IconCalendar,
} from '@tabler/icons-react';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { BUILD_PROVIDERS } from '~/types/release-config-constants';
import { PLATFORM_LABELS, ENVIRONMENT_LABELS } from '~/constants/release-config-ui';
import { workflowTypeToEnvironment } from '~/types/workflow-mappings';
import { getPlatformIcon, getBuildProviderIcon, getBuildProviderLabel, formatDateTime } from '~/utils/ui-utils';

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
                leftSection={getPlatformIcon(workflow.platform, 18)}
                size="md"
              >
                {PLATFORM_LABELS[workflow.platform?.toUpperCase() as keyof typeof PLATFORM_LABELS] || workflow.platform}
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
                leftSection={getBuildProviderIcon(workflow.providerType, 18)}
                size="md"
              >
                {getBuildProviderLabel(workflow.providerType)}
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

          <Anchor
            href={workflow.workflowUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            c={theme.colors.blue[7]}
            style={{
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              lineHeight: 1.5,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            {workflow.workflowUrl}
          </Anchor>
        </Card>

        {/* Parameters */}
        {workflow.parameters && (
          (Array.isArray(workflow.parameters) && workflow.parameters.length > 0) ||
          (!Array.isArray(workflow.parameters) && Object.keys(workflow.parameters).length > 0)
        ) && (
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
              {Array.isArray(workflow.parameters) ? (
                // Handle array format (WorkflowParameter[])
                workflow.parameters.map((param, index) => {
                  const paramName = typeof param === 'object' && param !== null && 'name' in param 
                    ? param.name 
                    : `Parameter ${index}`;
                  const paramValue = typeof param === 'object' && param !== null && 'defaultValue' in param
                    ? param.defaultValue
                    : param;
                  
                  return (
                    <Group key={index} justify="space-between">
                      <Text size="sm" c={theme.colors.slate[5]}>
                        {paramName}
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
                        {typeof paramValue === 'object' ? JSON.stringify(paramValue) : String(paramValue ?? 'N/A')}
                      </Text>
                    </Group>
                  );
                })
              ) : (
                // Handle object format (Record<string, any>)
                Object.entries(workflow.parameters).map(([key, value]) => (
                  <Group key={key} justify="space-between">
                    <Text size="sm" c={theme.colors.slate[5]}>
                      {key} →
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
                      {typeof value === 'object' ? JSON.stringify(value) : String(value ?? 'N/A')}
                    </Text>
                  </Group>
                ))
              )}
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
                {formatDateTime(workflow.createdAt)}
              </Text>
            </Group>

            <Divider />

            <Group justify="space-between">
              <Text size="sm" c={theme.colors.slate[5]}>
                Last Updated:
              </Text>
              <Text fw={500} size="sm" c={theme.colors.slate[9]}>
                {formatDateTime(workflow.updatedAt)}
              </Text>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Modal>
  );
}

