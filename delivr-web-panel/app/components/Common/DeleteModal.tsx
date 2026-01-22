/**
 * Reusable Delete Modal Component
 * Handles deletion for different entity types (org, app, deployment, profile)
 * Uses state-based modal pattern instead of route-based
 */

import { Modal, Text, Group, Button } from '@mantine/core';
import { useDeleteOrg } from '~/components/Pages/components/DeleteAction/hooks/useDeleteOrg';
import { useDeleteAppForOrg } from '~/components/Pages/components/DeleteAction/hooks/useDeleteAppForOrg';
import { useDeleteDeployment } from '~/components/Pages/components/DeploymentsSearch/hooks/useDeleteDeployment';
import { useNavigate } from '@remix-run/react';
import { ACTION_EVENTS, actions } from '~/utils/event-emitter';

export type DeleteType = 'org' | 'app' | 'deployment' | 'profile';

export interface DeleteModalData {
  type: DeleteType;
  // Org delete data
  orgId?: string;
  orgName?: string;
  // App delete data
  appId?: string;
  appName?: string;
  tenant?: string;
  // Deployment delete data
  deploymentName?: string;
  appIdForDeployment?: string;
  tenantForDeployment?: string;
}

interface DeleteModalProps {
  opened: boolean;
  onClose: () => void;
  data: DeleteModalData | null;
  onSuccess?: () => void;
}

/**
 * Get modal title based on delete type
 */
function getModalTitle(type: DeleteType): string {
  switch (type) {
    case 'org':
      return 'Delete Project';
    case 'app':
      return 'Delete Application';
    case 'deployment':
      return 'Delete Deployment';
    case 'profile':
      return 'Delete Account';
    default:
      return 'Delete';
  }
}

/**
 * Delete Modal Component
 */
export function DeleteModal({ opened, onClose, data, onSuccess }: DeleteModalProps) {
  if (!data) {
    return null;
  }

  const handleSuccess = () => {
    // Trigger refetch events for orgs if needed
    if (data.type === 'org' || data.type === 'app') {
      actions.trigger(ACTION_EVENTS.REFETCH_ORGS);
    }
    onSuccess?.();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={getModalTitle(data.type)}
      centered
    >
      <DeleteModalContent data={data} onSuccess={handleSuccess} onCancel={onClose} />
    </Modal>
  );
}

/**
 * Delete Modal Content Component
 * Renders the appropriate delete UI based on type
 */
function DeleteModalContent({
  data,
  onSuccess,
  onCancel,
}: {
  data: DeleteModalData;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  switch (data.type) {
    case 'org':
      return (
        <DeleteOrgContent
          orgId={data.orgId || ''}
          orgName={data.orgName || ''}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );
    case 'app':
      return (
        <DeleteAppContent
          appId={data.appId || ''}
          appName={data.appName || ''}
          tenant={data.tenant || ''}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );
    case 'deployment':
      return (
        <DeleteDeploymentContent
          deploymentName={data.deploymentName || ''}
          appId={data.appIdForDeployment || ''}
          tenant={data.tenantForDeployment || ''}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      );
    case 'profile':
      return <DeleteUserContent onSuccess={onSuccess} onCancel={onCancel} />;
    default:
      return <Text>Unknown delete type</Text>;
  }
}

// ============================================================================
// Delete Content Components
// ============================================================================

interface DeleteOrgContentProps {
  orgId: string;
  orgName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function DeleteOrgContent({ orgId, orgName, onSuccess, onCancel }: DeleteOrgContentProps) {
  const { mutate, isLoading } = useDeleteOrg();

  const handleDelete = () => {
    mutate(
      { tenant: orgId },
      {
        onSuccess,
      }
    );
  };

  return (
    <>
      <Text>Are you sure you want to delete this project ({orgName})?</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button color="red" loading={isLoading} onClick={handleDelete}>
          Delete
        </Button>
      </Group>
    </>
  );
}

interface DeleteAppContentProps {
  appId: string;
  appName: string;
  tenant: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function DeleteAppContent({ appId, appName, tenant, onSuccess, onCancel }: DeleteAppContentProps) {
  const { mutate, isLoading } = useDeleteAppForOrg();

  const handleDelete = () => {
    mutate(
      {
        tenant,
        appId,
      },
      {
        onSuccess,
      }
    );
  };

  return (
    <>
      <Text>Are you sure you want to delete this app ({appName})?</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button color="red" loading={isLoading} onClick={handleDelete}>
          Delete
        </Button>
      </Group>
    </>
  );
}

interface DeleteDeploymentContentProps {
  deploymentName: string;
  appId: string;
  tenant: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function DeleteDeploymentContent({
  deploymentName,
  appId,
  tenant,
  onSuccess,
  onCancel,
}: DeleteDeploymentContentProps) {
  const { mutate, isLoading } = useDeleteDeployment();
  const navigate = useNavigate();

  const handleDelete = () => {
    mutate(
      {
        appId,
        tenant,
        deploymentName,
      },
      {
        onSuccess: () => {
          onSuccess();
          // Navigate back to avoid staying on deleted deployment page
          navigate(-1);
        },
      }
    );
  };

  return (
    <>
      <Text>
        Are you sure you want to delete the <strong>{deploymentName}</strong> deployment?
      </Text>
      <Text size="sm" c="dimmed" mt="xs">
        This action cannot be undone. The deployment will be removed, but existing releases will remain in storage.
      </Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button color="red" loading={isLoading} onClick={handleDelete}>
          Delete
        </Button>
      </Group>
    </>
  );
}

interface DeleteUserContentProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function DeleteUserContent({ onSuccess, onCancel }: DeleteUserContentProps) {
  return (
    <>
      <Text>Are you sure you want to delete your account?</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onCancel}>
          Cancel
        </Button>
        <Button color="red" onClick={onSuccess}>
          Delete
        </Button>
      </Group>
    </>
  );
}

