/**
 * ReleaseProcessHeader Component
 * Unified header for release process - essential info and actions only
 * 
 * Displays:
 * - Release branch and version
 * - Current stage and status badges
 * - Action buttons: Edit, Pause/Resume, Activity Log, Post Slack Message
 * 
 * Data Source:
 * - Uses existing `GET /api/v1/tenants/:tenantId/releases/:releaseId` (backend)
 * - Stage status from stage API responses
 */

import { Badge, Button, Group, Modal, Paper, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { Link, useSearchParams } from '@remix-run/react';
import { IconArrowLeft, IconCloudUpload, IconCode, IconEdit, IconGitBranch, IconHistory, IconMessageCircle, IconPlayerPause, IconPlayerPlay, IconTag } from '@tabler/icons-react';
import { useState } from 'react';
import { useQueryClient } from 'react-query';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { CreateReleaseForm } from '~/components/ReleaseCreation/CreateReleaseForm';
import { ActivityLogsDrawer } from './ActivityLogsDrawer';
import {
  BUTTON_LABELS,
  HEADER_LABELS,
  getPhaseColor,
  getPhaseLabel,
  getReleaseStatusColor,
  getReleaseStatusLabel,
  STAGE_LABELS,
} from '~/constants/release-process-ui';
import { RELEASE_MESSAGES } from '~/constants/toast-messages';
import { useSendNotification } from '~/hooks/useReleaseProcess';
import { Phase, ReleaseStatus } from '~/types/release-process-enums';
import type { TaskStage } from '~/types/release-process-enums';
import type { MessageTypeEnum, ActivityLog } from '~/types/release-process.types';
import type { UpdateReleaseBackendRequest } from '~/types/release-creation-backend';
import { apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { invalidateReleases } from '~/utils/cache-invalidation';
import { showErrorToast, showSuccessToast } from '~/utils/toast';

interface ReleaseProcessHeaderProps {
  release: BackendReleaseResponse;
  org: string;
  releaseVersion: string;
  currentStage: TaskStage | null;
  onUpdate?: () => void;
  className?: string;
}

interface PlatformTargetMapping {
  platform: string;
  target: string;
  version?: string | null;
}

export function ReleaseProcessHeader({
  release,
  org,
  releaseVersion,
  currentStage,
  onUpdate,
  className,
}: ReleaseProcessHeaderProps) {
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [activityLogModalOpened, setActivityLogModalOpened] = useState(false);
  const [searchParams] = useSearchParams();
  
  // Get returnTo params from URL to restore filters and tab when going back
  const returnTo = searchParams.get('returnTo');
  const backUrl = returnTo 
    ? `/dashboard/${org}/releases?${returnTo}`
    : `/dashboard/${org}/releases`;
  const [activityDrawerOpened, setActivityDrawerOpened] = useState(false);
  const [slackMessageModalOpened, setSlackMessageModalOpened] = useState(false);
  const [pauseConfirmModalOpened, setPauseConfirmModalOpened] = useState(false);
  const queryClient = useQueryClient();

  // Use API data directly - no derivation
  const releaseStatus: ReleaseStatus = release.status;
  const releasePhase: Phase | undefined = release.releasePhase;
  const isPaused =
    releaseStatus === ReleaseStatus.PAUSED ||
    releasePhase === Phase.PAUSED_BY_USER ||
    releasePhase === Phase.PAUSED_BY_FAILURE;

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

  // Handle pause/resume
  const handlePauseResume = async () => {
    try {
      const newCronStatus = isPaused ? 'RUNNING' : 'PAUSED';
      const result = await apiPatch<{ success: boolean; release?: BackendReleaseResponse; error?: string }>(
        `/api/v1/tenants/${org}/releases/${release.id}`,
        {
          cronJob: {
            ...release.cronJob,
            cronStatus: newCronStatus,
          },
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update release status');
      }

      await invalidateReleases(queryClient, org);
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

  // Type-safe platform mappings
  const platformMappings: PlatformTargetMapping[] = (release.platformTargetMappings || []) as PlatformTargetMapping[];

  return (
    <>
      <Paper shadow="sm" p="lg" radius="md" withBorder className={className}>
        <Stack gap="md">
          {/* Top Section: Back Button */}
          <Group>
            <Link to={backUrl}>
              <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}>
                {BUTTON_LABELS.BACK}
              </Button>
            </Link>
          </Group>

          {/* Release Title, Status Badges, and Platform Badges */}
          <Group justify="space-between" align="center" wrap="wrap">
            <Group gap="md" align="center">
              {release.branch ? (
                <Title order={2} className="font-mono">
                  {release.branch}
                </Title>
              ) : (
                <Title order={2}>
                  {HEADER_LABELS.NO_BRANCH}
                </Title>
              )}

              {/* Status Badges - Next to Title */}
              <Group gap="sm">
                {releasePhase && (
                  <Badge
                    color={getPhaseColor(releasePhase)}
                    variant="light"
                    size="md"
                    style={{ fontSize: '0.7rem' }}
                  >
                    {getPhaseLabel(releasePhase)}
                  </Badge>
                )}
                {releaseStatus && (
                  <Badge
                    color={getReleaseStatusColor(releaseStatus)}
                    variant="light"
                    size="md"
                    style={{ fontSize: '0.7rem' }}
                  >
                    {getReleaseStatusLabel(releaseStatus)}
                  </Badge>
                )}
              </Group>
            </Group>

            {/* Platform Badges - Right Side */}
            {platformMappings.length > 0 && (
              <Group gap="xs">
                {platformMappings.map((mapping, idx) => (
                  <Badge key={idx} size="md" variant="light" color="blue">
                    {mapping.platform} {HEADER_LABELS.PLATFORM_SEPARATOR} {mapping.target}
                    {mapping.version && <span style={{ fontWeight: 700 }}> ({mapping.version})</span>}
                  </Badge>
                ))}
              </Group>
            )}
          </Group>

          {/* Info Section and Action Buttons */}
          <Group justify="space-between" align="center" wrap="wrap">
            <Group gap="xl">
              <Group gap="xs">
                <IconTag size={18} className="text-brand-600" />
                <div>
                  <Text size="xs" c="dimmed">
                    {HEADER_LABELS.RELEASE_VERSION}
                  </Text>
                  <Text fw={600} size="sm">
                    {releaseVersion}
                  </Text>
                </div>
              </Group>

              {release.branch && (
                <Group gap="xs">
                  <IconGitBranch size={18} className="text-slate-600" />
                  <div>
                    <Text size="xs" c="dimmed">
                      {HEADER_LABELS.RELEASE_BRANCH}
                    </Text>
                    <Text fw={600} size="sm" className="font-mono">
                      {release.branch}
                    </Text>
                  </div>
                </Group>
              )}

              {currentStage && (
                <Group gap="xs">
                  <div>
                    <Text size="xs" c="dimmed">
                      {HEADER_LABELS.CURRENT_STAGE}
                    </Text>
                    <Text fw={600} size="sm">
                      {STAGE_LABELS[currentStage]}
                    </Text>
                  </div>
                </Group>
              )}
            </Group>

            {/* Action Buttons - Right Side */}
            <Group gap="sm" wrap="wrap">
              <Button 
                variant="outline" 
                leftSection={<IconEdit size={16} />}
                onClick={() => setEditModalOpened(true)}
              >
                {BUTTON_LABELS.EDIT_RELEASE}
              </Button>
              
              {/* Pause/Resume - Only show if release is in progress or paused */}
              {(releaseStatus === ReleaseStatus.IN_PROGRESS || releaseStatus === ReleaseStatus.PAUSED) && (
                <Button
                  variant="outline"
                  color={isPaused ? 'green' : 'orange'}
                  leftSection={isPaused ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />}
                  onClick={isPaused ? handleResumeClick : handlePauseClick}
                >
                  {isPaused ? BUTTON_LABELS.RESUME : BUTTON_LABELS.PAUSE}
                </Button>
              )}
              
              <Button
                variant="outline"
                leftSection={<IconHistory size={16} />}
                onClick={() => setActivityDrawerOpened(true)}
              >
                {BUTTON_LABELS.ACTIVITY_LOG}
              </Button>
              
              <Button
                variant="outline"
                leftSection={<IconMessageCircle size={16} />}
                onClick={() => setSlackMessageModalOpened(true)}
              >
                {BUTTON_LABELS.POST_SLACK_MESSAGE}
              </Button>
            </Group>
          </Group>
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

      {/* Activity Logs Drawer */}
      <ActivityLogsDrawer
        opened={activityDrawerOpened}
        onClose={() => setActivityDrawerOpened(false)}
        tenantId={org}
        releaseId={release.id}
      />

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
