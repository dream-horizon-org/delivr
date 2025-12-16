/**
 * Workflow List Component
 * Displays and manages CI/CD workflows (Jenkins and GitHub Actions)
 */

import { useState } from 'react';
import {
  Card,
  Text,
  Button,
  Badge,
  Group,
  Stack,
  ActionIcon,
  Menu,
  Modal,
  Alert,
  Paper,
  Box,
  ThemeIcon,
  SimpleGrid,
  Center,
  useMantineTheme,
} from '@mantine/core';
import { Link } from '@remix-run/react';
import {
  IconPencil,
  IconTrash,
  IconServer,
  IconBrandGithub,
  IconAlertCircle,
  IconDots,
  IconEye,
} from '@tabler/icons-react';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { WorkflowPreviewModal } from './WorkflowPreviewModal';
import { PLATFORMS, BUILD_PROVIDERS, BUILD_ENVIRONMENTS } from '~/types/release-config-constants';
import { PLATFORM_LABELS, ENVIRONMENT_LABELS, PROVIDER_LABELS } from '~/constants/release-config-ui';

export interface WorkflowListProps {
  workflows: CICDWorkflow[];
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    githubActions: Array<{ id: string; name: string }>;
  };
  tenantId: string;
  onRefresh: () => void;
  onCreate: (workflow: any) => Promise<void>;
  onUpdate?: (workflowId: string, workflow: any) => Promise<void>;
  onDelete?: (workflowId: string) => Promise<void>;
}

export function WorkflowList({
  workflows,
  availableIntegrations,
  tenantId,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
}: WorkflowListProps) {
  const theme = useMantineTheme();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<CICDWorkflow | null>(null);
  const [previewWorkflow, setPreviewWorkflow] = useState<CICDWorkflow | null>(null);

  const hasJenkinsIntegration = availableIntegrations.jenkins.length > 0;
  const hasGitHubIntegration = availableIntegrations.githubActions.length > 0;
  const hasAnyIntegration = hasJenkinsIntegration || hasGitHubIntegration;

  const handleEdit = (workflow: CICDWorkflow) => {
    // Navigate to edit page
    window.location.href = `/dashboard/${tenantId}/releases/workflows/${workflow.id}`;
  };

  const handleDeleteClick = (workflow: CICDWorkflow) => {
    setWorkflowToDelete(workflow);
    setDeleteModalOpened(true);
  };

  const handleDeleteConfirm = async () => {
    if (workflowToDelete && onDelete) {
      await onDelete(workflowToDelete.id);
      setDeleteModalOpened(false);
      setWorkflowToDelete(null);
      onRefresh();
    }
  };

  const getProviderIcon = (providerType: string) => {
    return providerType === BUILD_PROVIDERS.JENKINS ? (
      <ThemeIcon size={32} radius="md" variant="light" color="red">
        <IconServer size={18} />
      </ThemeIcon>
    ) : (
      <ThemeIcon size={32} radius="md" variant="light" color="gray">
        <IconBrandGithub size={18} />
      </ThemeIcon>
    );
  };

  const getProviderLabel = (providerType: string) => {
    return providerType === BUILD_PROVIDERS.JENKINS
      ? PROVIDER_LABELS.JENKINS
      : PROVIDER_LABELS.GITHUB_ACTIONS;
  };

  const getPlatformLabel = (platform: string) => {
    return platform === PLATFORMS.ANDROID
      ? PLATFORM_LABELS.ANDROID
      : PLATFORM_LABELS.IOS;
  };

  const getWorkflowTypeLabel = (workflowType: string) => {
    // Map backend workflow types to frontend environment labels
    const mapping: Record<string, string> = {
      PRE_REGRESSION_BUILD: ENVIRONMENT_LABELS.PRE_REGRESSION,
      REGRESSION_BUILD: ENVIRONMENT_LABELS.REGRESSION,
      TEST_FLIGHT_BUILD: ENVIRONMENT_LABELS.TESTFLIGHT,
      AAB_BUILD: ENVIRONMENT_LABELS.AAB_BUILD,
      PRE_REGRESSION: ENVIRONMENT_LABELS.PRE_REGRESSION,
      REGRESSION: ENVIRONMENT_LABELS.REGRESSION,
      TESTFLIGHT: ENVIRONMENT_LABELS.TESTFLIGHT,
      PRODUCTION: 'Production',
    };
    return mapping[workflowType] || workflowType;
  };

  const getWorkflowTypeColor = (workflowType: string) => {
    const mapping: Record<string, string> = {
      PRE_REGRESSION: 'blue',
      REGRESSION: 'purple',
      TESTFLIGHT: 'orange',
      PRODUCTION: 'green',
      AAB_BUILD: 'teal',
    };
    return mapping[workflowType] || 'gray';
  };

  // Group workflows by provider
  const workflowsByProvider = {
    jenkins: workflows.filter((w) => w.providerType === BUILD_PROVIDERS.JENKINS),
    github: workflows.filter((w) => w.providerType === BUILD_PROVIDERS.GITHUB_ACTIONS),
  };

  return (
    <Stack gap="lg">

      {/* No Integrations Alert */}
      {!hasAnyIntegration && (
        <Alert
          icon={<IconAlertCircle size={18} />}
          color="yellow"
          variant="light"
          radius="md"
          title="No CI/CD Integrations Connected"
        >
          <Text size="sm" mb="xs">
            To create workflows, you need to connect at least one CI/CD provider:
          </Text>
          <Stack gap="xs" mb="xs">
            {!hasJenkinsIntegration && (
              <Text size="sm" c={theme.colors.slate[6]}>
                • Jenkins
              </Text>
            )}
            {!hasGitHubIntegration && (
              <Text size="sm" c={theme.colors.slate[6]}>
                • GitHub Actions
              </Text>
            )}
          </Stack>
          <Text size="sm" c={theme.colors.slate[6]}>
            Go to <strong>Organization → Integrations</strong> to connect a provider.
          </Text>
        </Alert>
      )}

      {/* Jenkins Workflows */}
      {hasJenkinsIntegration && (
        <Box>
          <Group gap="sm" mb="md">
            <ThemeIcon size={28} radius="md" variant="light" color="red">
              <IconServer size={16} />
            </ThemeIcon>
            <Text fw={600} size="md" c={theme.colors.slate[8]}>
              Jenkins Workflows ({workflowsByProvider.jenkins.length})
            </Text>
          </Group>
          {workflowsByProvider.jenkins.length === 0 ? (
            <Paper
              p="md"
              radius="md"
              style={{
                backgroundColor: theme.colors.slate[0],
                border: `1px solid ${theme.colors.slate[2]}`,
              }}
            >
              <Center py="md">
                <Text size="sm" c={theme.colors.slate[5]} ta="center">
                  No Jenkins workflows configured. Click "Add Workflow" to create one.
                </Text>
              </Center>
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {workflowsByProvider.jenkins.map((workflow) => (
                <Card key={workflow.id} shadow="sm" padding="md" radius="md" withBorder>
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                      <Box style={{ flex: 1 }}>
                        <Group gap="sm" mb="sm">
                          {getProviderIcon(workflow.providerType)}
                          <Text fw={600} size="sm" c={theme.colors.slate[9]}>
                            {workflow.displayName}
                          </Text>
                        </Group>
                        <Group gap="xs" mb="xs">
                          <Badge size="sm" variant="light" color="brand">
                            {getPlatformLabel(workflow.platform)}
                          </Badge>
                          <Badge
                            size="sm"
                            variant="light"
                            color={getWorkflowTypeColor(workflow.workflowType)}
                          >
                            {getWorkflowTypeLabel(workflow.workflowType)}
                          </Badge>
                          {(workflow.workflowType === 'AAB_BUILD' || workflow.workflowType === BUILD_ENVIRONMENTS.AAB_BUILD) && (
                            <Badge size="sm" variant="outline" color="gray">
                              .aab
                            </Badge>
                          )}
                        </Group>
                        <Text
                          size="xs"
                          c={theme.colors.slate[5]}
                          style={{
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            lineHeight: 1.4,
                          }}
                        >
                          {workflow.workflowUrl}
                        </Text>
                      </Box>
                      <Menu
                        shadow="md"
                        width={180}
                        radius="md"
                        position="bottom-end"
                        styles={{
                          dropdown: {
                            padding: theme.spacing.xs,
                            border: `1px solid ${theme.colors.slate[2]}`,
                          },
                          item: {
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            borderRadius: theme.radius.sm,
                            fontSize: theme.fontSizes.sm,
                          },
                        }}
                      >
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="brand" size="md">
                            <IconDots size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEye size={16} stroke={1.5} />}
                            onClick={() => setPreviewWorkflow(workflow)}
                          >
                            View
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconPencil size={16} stroke={1.5} />}
                            onClick={() => handleEdit(workflow)}
                          >
                            Edit
                          </Menu.Item>
                          {onDelete && (
                            <>
                              <Menu.Divider />
                              <Menu.Item
                                leftSection={<IconTrash size={16} stroke={1.5} />}
                                onClick={() => handleDeleteClick(workflow)}
                                color="red"
                              >
                                Delete
                              </Menu.Item>
                            </>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Box>
      )}

      {/* GitHub Actions Workflows */}
      {hasGitHubIntegration && (
        <Box>
          <Group gap="sm" mb="md">
            <ThemeIcon size={28} radius="md" variant="light" color="gray">
              <IconBrandGithub size={16} />
            </ThemeIcon>
            <Text fw={600} size="md" c={theme.colors.slate[8]}>
              GitHub Actions Workflows ({workflowsByProvider.github.length})
            </Text>
          </Group>
          {workflowsByProvider.github.length === 0 ? (
            <Paper
              p="md"
              radius="md"
              style={{
                backgroundColor: theme.colors.slate[0],
                border: `1px solid ${theme.colors.slate[2]}`,
              }}
            >
              <Center py="md">
                <Text size="sm" c={theme.colors.slate[5]} ta="center">
                  No GitHub Actions workflows configured. Click "Add Workflow" to create one.
                </Text>
              </Center>
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {workflowsByProvider.github.map((workflow) => (
                <Card key={workflow.id} shadow="sm" padding="md" radius="md" withBorder>
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                      <Box style={{ flex: 1 }}>
                        <Group gap="sm" mb="sm">
                          {getProviderIcon(workflow.providerType)}
                          <Text fw={600} size="sm" c={theme.colors.slate[9]}>
                            {workflow.displayName}
                          </Text>
                        </Group>
                        <Group gap="xs" mb="xs">
                          <Badge size="sm" variant="light" color="brand">
                            {getPlatformLabel(workflow.platform)}
                          </Badge>
                          <Badge
                            size="sm"
                            variant="light"
                            color={getWorkflowTypeColor(workflow.workflowType)}
                          >
                            {getWorkflowTypeLabel(workflow.workflowType)}
                          </Badge>
                          {(workflow.workflowType === 'AAB_BUILD' || workflow.workflowType === BUILD_ENVIRONMENTS.AAB_BUILD) && (
                            <Badge size="sm" variant="outline" color="gray">
                              .aab
                            </Badge>
                          )}
                        </Group>
                        <Text
                          size="xs"
                          c={theme.colors.slate[5]}
                          style={{
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            lineHeight: 1.4,
                          }}
                        >
                          {workflow.workflowUrl}
                        </Text>
                      </Box>
                      <Menu
                        shadow="md"
                        width={180}
                        radius="md"
                        position="bottom-end"
                        styles={{
                          dropdown: {
                            padding: theme.spacing.xs,
                            border: `1px solid ${theme.colors.slate[2]}`,
                          },
                          item: {
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            borderRadius: theme.radius.sm,
                            fontSize: theme.fontSizes.sm,
                          },
                        }}
                      >
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="brand" size="md">
                            <IconDots size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEye size={16} stroke={1.5} />}
                            onClick={() => setPreviewWorkflow(workflow)}
                          >
                            View
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconPencil size={16} stroke={1.5} />}
                            onClick={() => handleEdit(workflow)}
                          >
                            Edit
                          </Menu.Item>
                          {onDelete && (
                            <>
                              <Menu.Divider />
                              <Menu.Item
                                leftSection={<IconTrash size={16} stroke={1.5} />}
                                onClick={() => handleDeleteClick(workflow)}
                                color="red"
                              >
                                Delete
                              </Menu.Item>
                            </>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Box>
      )}

      {/* Note: Create/Edit now uses full page form at /dashboard/{org}/releases/create-workflow */}

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setWorkflowToDelete(null);
        }}
        title="Delete Workflow"
        centered
        radius="md"
      >
        <Stack gap="md">
          <Text size="sm" c={theme.colors.slate[6]}>
            Are you sure you want to delete the workflow{' '}
            <Text component="span" fw={600} c={theme.colors.slate[9]}>
              {workflowToDelete?.displayName}
            </Text>
            ? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => {
                setDeleteModalOpened(false);
                setWorkflowToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Preview Modal */}
      {previewWorkflow && (
        <WorkflowPreviewModal
          opened={!!previewWorkflow}
          onClose={() => setPreviewWorkflow(null)}
          workflow={previewWorkflow}
        />
      )}
    </Stack>
  );
}
