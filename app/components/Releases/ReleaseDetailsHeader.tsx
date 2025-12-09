/**
 * Release Details Header Component
 * Displays release title, branch, status badge, and action buttons
 */

import { memo, useState } from 'react';
import { Link } from '@remix-run/react';
import { Paper, Title, Text, Badge, Group, Button, Modal, ScrollArea } from '@mantine/core';
import { useQueryClient } from 'react-query';
import { IconArrowLeft, IconEdit } from '@tabler/icons-react';
import { getStatusColor, getReleaseActiveStatus, getActiveStatusColor } from '~/utils/release-utils';
import type { BackendReleaseResponse } from '~/.server/services/ReleaseManagement';
import { CreateReleaseForm } from '~/components/ReleaseCreation/CreateReleaseForm';
import { apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { invalidateReleases } from '~/utils/cache-invalidation';
import { showSuccessToast } from '~/utils/toast';
import { RELEASE_MESSAGES } from '~/constants/toast-messages';
import type { UpdateReleaseBackendRequest } from '~/types/release-creation-backend';

interface ReleaseDetailsHeaderProps {
  release: BackendReleaseResponse;
  org: string;
  onUpdate?: () => void;
}

export const ReleaseDetailsHeader = memo(function ReleaseDetailsHeader({ release, org, onUpdate }: ReleaseDetailsHeaderProps) {
  const [editModalOpened, setEditModalOpened] = useState(false);
  const queryClient = useQueryClient();

  // Get active status
  const activeStatus = getReleaseActiveStatus(release);
  const activeStatusColor = getActiveStatusColor(activeStatus);

  // Handle update submission
  const handleUpdate = async (updateRequest: UpdateReleaseBackendRequest): Promise<void> => {
    try {
      const result = await apiPatch<{ success: boolean; release?: BackendReleaseResponse; error?: string }>(
        `/api/v1/tenants/${org}/releases/${release.id}`,
        updateRequest
      );

      // apiPatch returns { success, data } - if it doesn't throw, success is true
      // The apiRequest function throws if success is false, so if we reach here, it succeeded
      console.log('[ReleaseDetailsHeader] Update result:', result);

      // Invalidate releases query to refetch all releases
      await invalidateReleases(queryClient, org);

      showSuccessToast(RELEASE_MESSAGES.UPDATE_SUCCESS);
      
    // Call parent's refetch callback to refresh release data
    if (onUpdate) {
      onUpdate();
      }
      
      setEditModalOpened(false);
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to update release');
      console.error('[ReleaseDetailsHeader] Update error:', errorMessage, error);
      throw new Error(errorMessage);
    }
  };

  return (
    <>
      <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
        <Group justify="space-between" align="flex-start">
          <Group>
            <Link to={`/dashboard/${org}/releases`}>
              <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}>
                Back
              </Button>
            </Link>
            <div>
              {release.branch ? (
                <Title order={2} className="mb-1 font-mono">
                  {release.branch}
                </Title>
              ) : (
                <Title order={2} className="mb-1">
                  No branch
                </Title>
              )}
              {release.platformTargetMappings && release.platformTargetMappings.length > 0 && (
                <Group gap="xs" mt="xs">
                  {release.platformTargetMappings.map((mapping: any, idx: number) => (
                    <Badge key={idx} size="md" variant="light" color="blue">
                      {mapping.platform}: {mapping.version || 'N/A'}
                    </Badge>
                  ))}
                </Group>
              )}
            </div>
          </Group>
          
          <Group>
            <Badge color={getStatusColor(release.status)} variant="light" size="lg">
              {release.status.replace('_', ' ')}
            </Badge>
            <Badge color={activeStatusColor} variant="light" size="lg">
              {activeStatus}
            </Badge>
            <Button 
              variant="outline" 
              leftSection={<IconEdit size={16} />}
              onClick={() => setEditModalOpened(true)}
            >
              Edit Release
            </Button>
          </Group>
        </Group>
      </Paper>

      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title="Edit Release"
        size="90%"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        <CreateReleaseForm
          org={org}
          userId={release.createdBy || ''}
          onSubmit={async () => {}} // Not used in edit mode
          existingRelease={release}
          isEditMode={true}
          onUpdate={handleUpdate}
          onCancel={() => setEditModalOpened(false)}
      />
      </Modal>
    </>
  );
});

