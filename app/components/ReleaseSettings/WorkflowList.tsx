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
  Anchor,
} from '@mantine/core';
import { Link, useNavigate } from '@remix-run/react';
import {
  IconPencil,
  IconTrash,
  IconAlertCircle,
  IconDots,
  IconEye,
  IconExternalLink,
} from '@tabler/icons-react';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { WorkflowPreviewModal } from './WorkflowPreviewModal';
import { PLATFORMS, BUILD_PROVIDERS, BUILD_ENVIRONMENTS } from '~/types/release-config-constants';
import { PLATFORM_LABELS, ENVIRONMENT_LABELS } from '~/constants/release-config-ui';
import { getBuildProviderIcon, getBuildProviderLabel } from '~/utils/ui-utils';

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
  const navigate = useNavigate();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<CICDWorkflow | null>(null);
  const [previewWorkflow, setPreviewWorkflow] = useState<CICDWorkflow | null>(null);

  const hasJenkinsIntegration = availableIntegrations.jenkins.length > 0;
  const hasGitHubIntegration = availableIntegrations.githubActions.length > 0;
  const hasAnyIntegration = hasJenkinsIntegration || hasGitHubIntegration;

  const handleEdit = (workflow: CICDWorkflow) => {
    // Navigate to edit page using client-side navigation (no reload)
    navigate(`/dashboard/${tenantId}/releases/workflows/${workflow.id}`);
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


  const getPlatformLabel = (platform: string) => {
    // Normalize to uppercase for comparison (backend may return lowercase)
    const normalizedPlatform = platform?.toUpperCase();
    return normalizedPlatform === PLATFORMS.ANDROID
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
              {getBuildProviderIcon(BUILD_PROVIDERS.JENKINS, 16)}
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
                          <ThemeIcon 
                            size={32} 
                            radius="md" 
                            variant="light" 
                            color={workflow.providerType === BUILD_PROVIDERS.JENKINS ? 'red' : 'gray'}
                          >
                            {getBuildProviderIcon(workflow.providerType, 18)}
                          </ThemeIcon>
                          <Text fw={600} size="sm" c={theme.colors.slate[9]}>
                            {workflow.displayName}
                          </Text>
                          <IconExternalLink size={14} />
                          <Anchor
                            href={workflow.workflowUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                          >
                            <IconExternalLink size={14} />
                          </Anchor>
                        </Group>
                        <Group gap="xs" mb="xs">
                          <Badge size="sm" variant="light" color="brand">
                            {getPlatformLabel(workflow.platform)}
                          </Badge>
                          <Badge
                            size="sm"
                            variant="light"
                            color="blue"
                          >
                            {getWorkflowTypeLabel(workflow.workflowType)}
                          </Badge>
                          {workflow.workflowType === BUILD_ENVIRONMENTS.AAB_BUILD && (
                            <Badge size="sm" variant="outline" color="gray">
                              .aab
                            </Badge>
                          )}
                        </Group>
                        <Group gap={4}>
                          <IconExternalLink size={14} />
                          <Anchor
                            href={workflow.workflowUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                          >
                            View Workflow
                          </Anchor>
                        </Group>
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
              {getBuildProviderIcon(BUILD_PROVIDERS.GITHUB_ACTIONS, 16)}
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
                          <ThemeIcon 
                            size={32} 
                            radius="md" 
                            variant="light" 
                            color={workflow.providerType === BUILD_PROVIDERS.JENKINS ? 'red' : 'gray'}
                          >
                            {getBuildProviderIcon(workflow.providerType, 18)}
                          </ThemeIcon>
                          <Text fw={600} size="sm" c={theme.colors.slate[9]}>
                            {workflow.displayName}
                          </Text>
                          
                          <Anchor
                            href={workflow.workflowUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                          >
                            <Group gap={4}>
                            <Text>View Workflow</Text>
                            <IconExternalLink size={14} />
                            </Group>
                          </Anchor>
                        </Group>
                        <Group gap="xs" mb="xs">
                          <Badge size="sm" variant="light" color="brand">
                            {getPlatformLabel(workflow.platform)}
                          </Badge>
                          <Badge
                            size="sm"
                            variant="light"
                            color="blue"
                          >
                            {getWorkflowTypeLabel(workflow.workflowType)}
                          </Badge>
                          {workflow.workflowType === BUILD_ENVIRONMENTS.AAB_BUILD && (
                            <Badge size="sm" variant="outline" color="gray">
                              .aab
                            </Badge>
                          )}
                        </Group>

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
