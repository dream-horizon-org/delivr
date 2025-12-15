/**
 * ReleaseProcessActionsSidebar Component
 * Actions sidebar beside the header (same height as header)
 * Contains all action buttons: Edit, Pause/Resume, Activity Log, Post Slack Message
 */

import { Button, Group, Modal, Paper, ScrollArea, Stack, Text } from '@mantine/core';
import {
  IconEdit,
  IconHistory,
  IconMessageCircle,
  IconPlayerPause,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useQueryClient } from 'react-query';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { CreateReleaseForm } from '~/components/ReleaseCreation/CreateReleaseForm';
import {
  BUTTON_LABELS,
} from '~/constants/release-process-ui';
import { RELEASE_MESSAGES } from '~/constants/toast-messages';
import { useActivityLogs, useSendNotification, usePauseResumeRelease } from '~/hooks/useReleaseProcess';
import { Phase, ReleaseStatus } from '~/types/release-process-enums';
import type { MessageTypeEnum, ActivityLog } from '~/types/release-process.types';
import type { UpdateReleaseBackendRequest } from '~/types/release-creation-backend';
import { apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { invalidateReleases } from '~/utils/cache-invalidation';
import { showErrorToast, showSuccessToast } from '~/utils/toast';

interface ReleaseProcessActionsSidebarProps {
  release: BackendReleaseResponse;
  org: string;
  onUpdate?: () => void;
  className?: string;
}

export function ReleaseProcessActionsSidebar({
  release,
  org,
  onUpdate,
  className,
}: ReleaseProcessActionsSidebarProps) {
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [activityLogModalOpened, setActivityLogModalOpened] = useState(false);
  const [slackMessageModalOpened, setSlackMessageModalOpened] = useState(false);
  const [pauseConfirmModalOpened, setPauseConfirmModalOpened] = useState(false);
  const queryClient = useQueryClient();

  // Use API data directly
  const releaseStatus: ReleaseStatus = release.status;
  const releasePhase: Phase | undefined = release.releasePhase;
  const isPaused =
    releaseStatus === ReleaseStatus.PAUSED ||
    releasePhase === Phase.PAUSED_BY_USER ||
    releasePhase === Phase.PAUSED_BY_FAILURE;

  // Activity logs hook
  const { data: activityLogs, isLoading: isLoadingLogs } = useActivityLogs(org, release.id);

  // Send notification hook
  const sendNotificationMutation = useSendNotification(org, release.id);

  // Handle update submission
  const handleUpdate = async (updateRequest: UpdateReleaseBackendRequest): Promise<void> => {
    try {
      const result = await apiPatch<{ success: boolean; release?: BackendReleaseResponse; error?: string }>(
        `/api/v1/tenants/${org}/releases/${release.id}`,
        updateRequest
      );

      await invalidateReleases(queryClient, org);
      showSuccessToast(RELEASE_MESSAGES.UPDATE_SUCCESS);

      if (onUpdate) {
        onUpdate();
      }

      setEditModalOpened(false);
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to update release');
      // Error is already handled by toast notification in calling code
      throw new Error(errorMessage);
    }
  };

  // Pause/Resume hook
  const pauseResumeMutation = usePauseResumeRelease(org, release.id);

  // Handle pause/resume
  const handlePauseResume = async () => {
    try {
      const action = isPaused ? 'resume' : 'pause';
      await pauseResumeMutation.mutateAsync({ action });
      
      showSuccessToast({
        message: isPaused ? 'Release resumed successfully' : 'Release paused successfully',
      });

      if (onUpdate) {
        onUpdate();
      }

      setPauseConfirmModalOpened(false);
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to pause/resume release');
      showErrorToast({ message: errorMessage });
    }
  };

  // Handle pause button click - show confirmation modal
  const handlePauseClick = () => {
    setPauseConfirmModalOpened(true);
  };

  // Handle resume button click - direct action
  const handleResumeClick = () => {
    handlePauseResume();
  };

  // Handle send notification (Slack message)
  const handleSendNotification = async (messageType: MessageTypeEnum) => {
    try {
      await sendNotificationMutation.mutateAsync({
        messageType,
      });
      showSuccessToast({ message: 'Notification sent successfully' });
      setSlackMessageModalOpened(false);
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to send notification');
      showErrorToast({ message: errorMessage });
    }
  };

  return (
    <>
      <Paper shadow="sm" p="md" radius="md" withBorder className={className} style={{ width: '200px' }}>
        <Stack gap="xs">
          <Button
            variant="outline"
            fullWidth
            leftSection={<IconEdit size={16} />}
            onClick={() => setEditModalOpened(true)}
          >
            {BUTTON_LABELS.EDIT_RELEASE}
          </Button>

          {/* Pause/Resume */}
          {(releaseStatus === ReleaseStatus.IN_PROGRESS || releaseStatus === ReleaseStatus.PAUSED) && (
            <Button
              variant="outline"
              fullWidth
              color={isPaused ? 'green' : 'orange'}
              leftSection={isPaused ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />}
              onClick={isPaused ? handleResumeClick : handlePauseClick}
            >
              {isPaused ? BUTTON_LABELS.RESUME : BUTTON_LABELS.PAUSE}
            </Button>
          )}

          <Button
            variant="outline"
            fullWidth
            leftSection={<IconHistory size={16} />}
            onClick={() => setActivityLogModalOpened(true)}
          >
            {BUTTON_LABELS.ACTIVITY_LOG}
          </Button>

          <Button
            variant="outline"
            fullWidth
            leftSection={<IconMessageCircle size={16} />}
            onClick={() => setSlackMessageModalOpened(true)}
          >
            {BUTTON_LABELS.POST_SLACK_MESSAGE}
          </Button>
        </Stack>
      </Paper>

      {/* Edit Release Modal */}
      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title={BUTTON_LABELS.EDIT_RELEASE}
        size="xl"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        <CreateReleaseForm
          org={org}
          userId={release.createdBy || ''}
          onSubmit={async () => {}}
          existingRelease={release}
          isEditMode={true}
          onUpdate={handleUpdate}
          onCancel={() => setEditModalOpened(false)}
        />
      </Modal>

      {/* Activity Log Modal */}
      <Modal
        opened={activityLogModalOpened}
        onClose={() => setActivityLogModalOpened(false)}
        title={BUTTON_LABELS.ACTIVITY_LOG}
        size="lg"
      >
        <ScrollArea h={400}>
          {isLoadingLogs ? (
            <Text c="dimmed">Loading activity logs...</Text>
          ) : activityLogs?.activityLogs && activityLogs.activityLogs.length > 0 ? (
            <Stack gap="sm">
              {activityLogs.activityLogs.map((log: ActivityLog) => (
                <Paper key={log.id} p="sm" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={500}>
                      {log.type}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(log.updatedAt).toLocaleString()}
                    </Text>
                  </Group>
                  {log.updatedBy && (
                    <Text size="xs" c="dimmed" mt="xs">
                      By: {log.updatedBy}
                    </Text>
                  )}
                </Paper>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed">No activity logs available</Text>
          )}
        </ScrollArea>
      </Modal>

      {/* Post Slack Message Modal */}
      <Modal
        opened={slackMessageModalOpened}
        onClose={() => setSlackMessageModalOpened(false)}
        title={BUTTON_LABELS.POST_SLACK_MESSAGE}
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Select a message type to send to Slack:
          </Text>
          <Group>
            <Button
              variant="outline"
              onClick={() => handleSendNotification('REGRESSION_COMPLETE' as MessageTypeEnum)}
            >
              Regression Build Ready
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSendNotification('RELEASE_APPROVED' as MessageTypeEnum)}
            >
              Post-Regression Build Ready
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Pause Confirmation Modal */}
      <Modal
        opened={pauseConfirmModalOpened}
        onClose={() => setPauseConfirmModalOpened(false)}
        title="Confirm Pause"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to pause this release? The release process will stop until you resume it.
          </Text>
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setPauseConfirmModalOpened(false)}>
              Cancel
            </Button>
            <Button color="orange" onClick={handlePauseResume}>
              Pause Release
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}


