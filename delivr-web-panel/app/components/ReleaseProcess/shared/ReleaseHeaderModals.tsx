/**
 * ReleaseHeaderModals Component
 * All modals used in the release header (Edit, Activity Logs, Slack Message, Pause Confirmation)
 */

import { useEffect } from 'react';
import { Alert, Button, Group, Modal, ScrollArea, Stack, Text } from '@mantine/core';
import { useQueryClient } from 'react-query';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { CreateReleaseForm } from '~/components/ReleaseCreation/CreateReleaseForm';
import { ActivityLogsDrawer } from '../ActivityLogsDrawer';
import { AdHocNotificationModal } from '../notifications';
import { BUTTON_LABELS } from '~/constants/release-process-ui';
import type { MessageTypeEnum } from '~/types/release-process.types';
import type { UpdateReleaseBackendRequest } from '~/types/release-creation-backend';
import { usePauseResumeRelease, useArchiveRelease } from '~/hooks/useReleaseProcess';
import { getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { useConfig } from '~/contexts/ConfigContext';

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
  const archiveMutation = useArchiveRelease(org, release.id);
  const { releaseConfigs } = useConfig();
  
  // Find the release config for this release
  const releaseConfig = release?.releaseConfigId 
    ? releaseConfigs.find((c) => c.id === release.releaseConfigId)
    : null;
  
  // Refetch release data when edit modal opens to get latest upcomingRegressions
  useEffect(() => {
    if (editModalOpened) {
      // Invalidate release query to force refetch of latest data including upcomingRegressions
      queryClient.invalidateQueries(['release', org, release.id]);
    }
  }, [editModalOpened, org, release.id, queryClient]);

  // Extract Slack integration ID from release config
  const slackIntegrationId = releaseConfig?.communicationConfig?.enabled 
    ? releaseConfig.communicationConfig.integrationId || null
    : null;

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

      {/* Ad-Hoc Notification Modal */}
      <AdHocNotificationModal
        opened={slackMessageModalOpened}
        onClose={() => {
          onSlackMessageModalClose();
          onSelectedMessageTypeChange(null);
        }}
        tenantId={org}
        release={release}
        integrationId={slackIntegrationId}
        releaseConfig={releaseConfig || null}
      />

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

