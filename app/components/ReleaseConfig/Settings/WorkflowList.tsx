/**
 * Workflow List Component
 * Displays and manages CI/CD workflows (Jenkins and GitHub Actions)
 */

import { useState } from 'react';
import { Card, Text, Button, Badge, Group, Stack, ActionIcon, Menu, Modal, Alert } from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconServer, IconBrandGithub, IconAlertCircle } from '@tabler/icons-react';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { WorkflowCreateModal } from './WorkflowCreateModal';
import { PLATFORMS, BUILD_ENVIRONMENTS, BUILD_PROVIDERS } from '~/types/release-config-constants';
import { PLATFORM_LABELS, ENVIRONMENT_LABELS, PROVIDER_LABELS } from '~/constants/release-config-ui';

export interface WorkflowListProps {
  workflows: CICDWorkflow[];
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    github: Array<{ id: string; name: string }>;
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
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<CICDWorkflow | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<CICDWorkflow | null>(null);

  const hasJenkinsIntegration = availableIntegrations.jenkins.length > 0;
  const hasGitHubIntegration = availableIntegrations.github.length > 0;
  const hasAnyIntegration = hasJenkinsIntegration || hasGitHubIntegration;

  const handleCreate = async (workflowData: any) => {
    await onCreate(workflowData);
    setCreateModalOpened(false);
    onRefresh();
  };

  const handleEdit = (workflow: CICDWorkflow) => {
    setEditingWorkflow(workflow);
    setCreateModalOpened(true);
  };

  const handleUpdate = async (workflowData: any) => {
    if (editingWorkflow && onUpdate) {
      await onUpdate(editingWorkflow.id, workflowData);
      setCreateModalOpened(false);
      setEditingWorkflow(null);
      onRefresh();
    }
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
      <IconServer size={20} className="text-red-600" />
    ) : (
      <IconBrandGithub size={20} />
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

  const getEnvironmentLabel = (workflowType: string) => {
    const mapping: Record<string, string> = {
      PRE_REGRESSION_BUILD: ENVIRONMENT_LABELS.PRE_REGRESSION,
      REGRESSION_BUILD: ENVIRONMENT_LABELS.REGRESSION,
      TEST_FLIGHT_BUILD: ENVIRONMENT_LABELS.TESTFLIGHT,
      AUTOMATION_BUILD: 'Automation',
      CUSTOM: 'Custom',
    };
    return mapping[workflowType] || workflowType;
  };

  // Group workflows by provider
  const workflowsByProvider = {
    jenkins: workflows.filter(w => w.providerType === BUILD_PROVIDERS.JENKINS),
    github: workflows.filter(w => w.providerType === BUILD_PROVIDERS.GITHUB_ACTIONS),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Text size="lg" fw={600} className="mb-1">
            CI/CD Pipelines
          </Text>
          <Text size="sm" c="dimmed">
            Manage your Jenkins and GitHub Actions workflows
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setEditingWorkflow(null);
            setCreateModalOpened(true);
          }}
          disabled={!hasAnyIntegration}
        >
          Add Workflow
        </Button>
      </div>

      {/* No Integrations Alert */}
      {!hasAnyIntegration && (
        <Alert
          icon={<IconAlertCircle size={18} />}
          color="yellow"
          variant="light"
          title="No CI/CD Integrations Connected"
        >
          <Text size="sm" className="mb-2">
            To create workflows, you need to connect at least one CI/CD provider:
          </Text>
          <ul className="list-disc list-inside text-sm mb-2">
            {!hasJenkinsIntegration && <li>Jenkins</li>}
            {!hasGitHubIntegration && <li>GitHub Actions</li>}
          </ul>
          <Text size="sm">
            Go to <strong>Settings → Integrations</strong> to connect a provider.
          </Text>
        </Alert>
      )}

      {/* Jenkins Workflows */}
      {hasJenkinsIntegration && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <IconServer size={20} className="text-red-600" />
            <Text fw={600} size="md">
              Jenkins Workflows ({workflowsByProvider.jenkins.length})
            </Text>
          </div>
          {workflowsByProvider.jenkins.length === 0 ? (
            <Card withBorder className="bg-gray-50">
              <Text size="sm" c="dimmed" className="text-center py-4">
                No Jenkins workflows configured. Click "Add Workflow" to create one.
              </Text>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflowsByProvider.jenkins.map((workflow) => (
                <Card key={workflow.id} shadow="sm" padding="lg" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <div className="flex-1">
                        <Group gap="xs" className="mb-2">
                          {getProviderIcon(workflow.providerType)}
                          <Text fw={600} size="md">
                            {workflow.displayName}
                          </Text>
                        </Group>
                        <div className="space-y-1">
                          <Group gap="xs">
                            <Badge size="sm" color="blue">
                              {getPlatformLabel(workflow.platform)}
                            </Badge>
                            <Badge size="sm" color="grape">
                              {getEnvironmentLabel(workflow.workflowType)}
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed" className="font-mono break-all">
                            {workflow.workflowUrl}
                          </Text>
                        </div>
                      </div>
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconPencil size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconPencil size={16} />}
                            onClick={() => handleEdit(workflow)}
                          >
                            Edit
                          </Menu.Item>
                          {onDelete && (
                            <Menu.Item
                              leftSection={<IconTrash size={16} />}
                              color="red"
                              onClick={() => handleDeleteClick(workflow)}
                            >
                              Delete
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GitHub Actions Workflows */}
      {hasGitHubIntegration && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <IconBrandGithub size={20} />
            <Text fw={600} size="md">
              GitHub Actions Workflows ({workflowsByProvider.github.length})
            </Text>
          </div>
          {workflowsByProvider.github.length === 0 ? (
            <Card withBorder className="bg-gray-50">
              <Text size="sm" c="dimmed" className="text-center py-4">
                No GitHub Actions workflows configured. Click "Add Workflow" to create one.
              </Text>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflowsByProvider.github.map((workflow) => (
                <Card key={workflow.id} shadow="sm" padding="lg" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <div className="flex-1">
                        <Group gap="xs" className="mb-2">
                          {getProviderIcon(workflow.providerType)}
                          <Text fw={600} size="md">
                            {workflow.displayName}
                          </Text>
                        </Group>
                        <div className="space-y-1">
                          <Group gap="xs">
                            <Badge size="sm" color="blue">
                              {getPlatformLabel(workflow.platform)}
                            </Badge>
                            <Badge size="sm" color="grape">
                              {getEnvironmentLabel(workflow.workflowType)}
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed" className="font-mono break-all">
                            {workflow.workflowUrl}
                          </Text>
                        </div>
                      </div>
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconPencil size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconPencil size={16} />}
                            onClick={() => handleEdit(workflow)}
                          >
                            Edit
                          </Menu.Item>
                          {onDelete && (
                            <Menu.Item
                              leftSection={<IconTrash size={16} />}
                              color="red"
                              onClick={() => handleDeleteClick(workflow)}
                            >
                              Delete
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <WorkflowCreateModal
        opened={createModalOpened}
        onClose={() => {
          setCreateModalOpened(false);
          setEditingWorkflow(null);
        }}
        onSave={editingWorkflow ? handleUpdate : handleCreate}
        availableIntegrations={availableIntegrations}
        tenantId={tenantId}
        existingWorkflow={editingWorkflow}
        workflows={workflows}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setWorkflowToDelete(null);
        }}
        title="Delete Workflow"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete the workflow{' '}
            <strong>{workflowToDelete?.displayName}</strong>? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="subtle"
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
    </div>
  );
}

