/**
 * ReleaseHeaderModals Component
 * All modals used in the release header (Edit, Activity Logs, Slack Message, Pause Confirmation)
 */

import { useEffect } from 'react';
import { Alert, Button, Group, Modal, ScrollArea, Select, Stack, Text } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { useQueryClient } from 'react-query';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { CreateReleaseForm } from '~/components/ReleaseCreation/CreateReleaseForm';
import { ActivityLogsDrawer } from '../ActivityLogsDrawer';
import { BUTTON_LABELS } from '~/constants/release-process-ui';
import type { MessageTypeEnum } from '~/types/release-process.types';
import type { UpdateReleaseBackendRequest } from '~/types/release-creation-backend';
import { useSendNotification, usePauseResumeRelease, useArchiveRelease } from '~/hooks/useReleaseProcess';
import { getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';

interface ReleaseHeaderModalsProps {
  release: BackendReleaseResponse;
  org: string;
  editModalOpened: boolean;
  activityDrawerOpened: boolean;
  slackMessageModalOpened: boolean;
  pauseConfirmModalOpened: boolean;
  archiveConfirmModalOpened: boolean;
  selectedMessageType: MessageTypeEnum | null;
  onEditModalClose: () => void;
  onActivityDrawerClose: () => void;
  onSlackMessageModalClose: () => void;
  onPauseConfirmModalClose: () => void;
  onArchiveConfirmModalClose: () => void;
  onSelectedMessageTypeChange: (value: MessageTypeEnum | null) => void;
  onUpdate: (updateRequest: UpdateReleaseBackendRequest) => Promise<void>;
  onPauseResume: () => Promise<void>;
  onArchive: () => Promise<void>;
  onUpdateCallback?: () => void;
}

export function ReleaseHeaderModals({
  release,
  org,
  editModalOpened,
  activityDrawerOpened,
  slackMessageModalOpened,
  pauseConfirmModalOpened,
  archiveConfirmModalOpened,
  selectedMessageType,
  onEditModalClose,
  onActivityDrawerClose,
  onSlackMessageModalClose,
  onPauseConfirmModalClose,
  onArchiveConfirmModalClose,
  onSelectedMessageTypeChange,
  onUpdate,
  onPauseResume,
  onArchive,
  onUpdateCallback,
}: ReleaseHeaderModalsProps) {
  const queryClient = useQueryClient();
  const sendNotificationMutation = useSendNotification(org, release.id);
  const archiveMutation = useArchiveRelease(org, release.id);
  
  // Refetch release data when edit modal opens to get latest upcomingRegressions
  useEffect(() => {
    if (editModalOpened) {
      // Invalidate release query to force refetch of latest data including upcomingRegressions
      queryClient.invalidateQueries(['release', org, release.id]);
    }
  }, [editModalOpened, org, release.id, queryClient]);

  const handleSendNotification = async () => {
    if (!selectedMessageType) {
      showErrorToast({ message: 'Please select a message type' });
      return;
    }

    try {
      await sendNotificationMutation.mutateAsync({
        messageType: selectedMessageType,
      });
      showSuccessToast({ message: 'Notification sent successfully' });
      onSlackMessageModalClose();
      onSelectedMessageTypeChange(null);
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to send notification');
      showErrorToast({ message: errorMessage });
    }
  };

  return (
    <>
      {/* Edit Release Modal */}
      <Modal
        opened={editModalOpened}
        onClose={onEditModalClose}
        title={"Modify release"}
        size="2xl"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        <CreateReleaseForm
          org={org}
          userId={release.createdBy || ''}
          onSubmit={async () => {}}
          existingRelease={release}
          isEditMode={true}
          onUpdate={onUpdate}
          onCancel={onEditModalClose}
        />
      </Modal>

      {/* Activity Logs Drawer */}
      <ActivityLogsDrawer
        opened={activityDrawerOpened}
        onClose={onActivityDrawerClose}
        tenantId={org}
        releaseId={release.id}
      />

      {/* Post Slack Message Modal */}
      <Modal
        opened={slackMessageModalOpened}
        onClose={() => {
          onSlackMessageModalClose();
          onSelectedMessageTypeChange(null);
        }}
        title={BUTTON_LABELS.NOTIFY}
        size="md"
      >
        <Stack gap="md">
          {/* Coming Soon Banner */}
          <Alert
            icon={<IconClock size={16} />}
            color="blue"
            variant="light"
            title="Coming Soon"
          >
            <Text size="sm" mb="xs" fw={500}>
              Slack Notification Feature
            </Text>
            <Text size="sm" c="dimmed">
              We're working on bringing you the ability to send custom notifications to Slack channels 
              directly from the release process. This feature will allow you to:
            </Text>
            <Stack gap="xs" mt="sm">
              <Text size="sm" c="dimmed">
                • Send test results summaries to your team
              </Text>
              <Text size="sm" c="dimmed">
                • Post pre-kickoff reminders and updates
              </Text>
              <Text size="sm" c="dimmed">
                • Keep stakeholders informed about release progress
              </Text>
            </Stack>
            <Text size="sm" c="dimmed" mt="sm">
              Stay tuned for updates!
            </Text>
          </Alert>

          {/* Original UI - Commented Out */}
          {/* <Text size="sm" c="dimmed">
            Select a message type to send to Slack:
          </Text>
          <Select
            label="Message Type"
            placeholder="Choose a message type"
            data={[
              {
                value: BUTTON_LABELS.SLACK_MESSAGE_TYPES.TEST_RESULTS_SUMMARY.value,
                label: BUTTON_LABELS.SLACK_MESSAGE_TYPES.TEST_RESULTS_SUMMARY.label,
              },
              {
                value: BUTTON_LABELS.SLACK_MESSAGE_TYPES.PRE_KICKOFF_REMINDER.value,
                label: BUTTON_LABELS.SLACK_MESSAGE_TYPES.PRE_KICKOFF_REMINDER.label,
              },
            ]}
            value={selectedMessageType}
            onChange={(value) => onSelectedMessageTypeChange(value as MessageTypeEnum | null)}
            required
          />
          {selectedMessageType && (
            <Text size="xs" c="dimmed">
              {selectedMessageType === BUTTON_LABELS.SLACK_MESSAGE_TYPES.TEST_RESULTS_SUMMARY.value
                ? BUTTON_LABELS.SLACK_MESSAGE_TYPES.TEST_RESULTS_SUMMARY.description
                : BUTTON_LABELS.SLACK_MESSAGE_TYPES.PRE_KICKOFF_REMINDER.description}
            </Text>
          )}
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                onSlackMessageModalClose();
                onSelectedMessageTypeChange(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendNotification}
              loading={sendNotificationMutation.isLoading}
              disabled={!selectedMessageType}
            >
              Send Message
            </Button>
          </Group> */}

          {/* Close Button */}
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                onSlackMessageModalClose();
                onSelectedMessageTypeChange(null);
              }}
            >
              Close
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Pause Confirmation Modal */}
      <Modal
        opened={pauseConfirmModalOpened}
        onClose={onPauseConfirmModalClose}
        title="Confirm Pause"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to pause this release? The release process will stop until you resume it.
          </Text>
          <Group justify="flex-end">
            <Button variant="outline" onClick={onPauseConfirmModalClose}>
              Cancel
            </Button>
            <Button color="orange" onClick={onPauseResume}>
              Pause Release
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Archive Confirmation Modal - Same pattern as Pause Confirmation */}
      <Modal
        opened={archiveConfirmModalOpened}
        onClose={onArchiveConfirmModalClose}
        title="Archive Release"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to archive this release? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="outline" onClick={onArchiveConfirmModalClose}>
              Cancel
            </Button>
            <Button 
              color="red" 
              onClick={onArchive}
              loading={archiveMutation.isLoading}
            >
              Archive Release
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

