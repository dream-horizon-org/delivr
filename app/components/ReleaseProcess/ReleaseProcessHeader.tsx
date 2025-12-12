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
import { Link } from '@remix-run/react';
import { IconArrowLeft, IconEdit, IconGitBranch, IconHistory, IconMessageCircle, IconPlayerPause, IconPlayerPlay, IconTag } from '@tabler/icons-react';
import { useState } from 'react';
import { useQueryClient } from 'react-query';
import type { BackendReleaseResponse } from '~/.server/services/ReleaseManagement';
import { CreateReleaseForm } from '~/components/ReleaseCreation/CreateReleaseForm';
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
import { useActivityLogs, useSendNotification } from '~/hooks/useReleaseProcess';
import { Phase, ReleaseStatus } from '~/types/release-process-enums';
import type { TaskStage } from '~/types/release-process-enums';
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
  const [slackMessageModalOpened, setSlackMessageModalOpened] = useState(false);
  const [pauseConfirmModalOpened, setPauseConfirmModalOpened] = useState(false);
  const queryClient = useQueryClient();
//   console.log('[ReleaseProcessHeader] release:', release);
  // Use API data directly - no derivation
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

      console.log('[ReleaseProcessHeader] Update result:', result);

      await invalidateReleases(queryClient, org);
      showSuccessToast(RELEASE_MESSAGES.UPDATE_SUCCESS);
      
      if (onUpdate) {
        onUpdate();
      }
      
      setEditModalOpened(false);
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to update release');
      console.error('[ReleaseProcessHeader] Update error:', errorMessage, error);
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
      
      // Close confirmation modal if it was open
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

  // Handle resume button click - direct action (no confirmation needed)
  const handleResumeClick = () => {
    handlePauseResume();
  };

  // Handle send notification (Slack message)
  const handleSendNotification = async (messageType: string) => {
    try {
      await sendNotificationMutation.mutateAsync({
        messageType: messageType as any, // TODO: Use proper MessageTypeEnum type
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
          {/* Top Section: Navigation, Title, Status Badges, Actions */}
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Group gap="md" align="flex-start">
              <Link to={`/dashboard/${org}/releases`}>
                <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}>
                  {BUTTON_LABELS.BACK}
                </Button>
              </Link>
              
              <div>
                {release.branch ? (
                  <Title order={2} className="mb-2 font-mono">
                    {release.branch}
                  </Title>
                ) : (
                  <Title order={2} className="mb-2">
                    {HEADER_LABELS.NO_BRANCH}
                  </Title>
                )}
                
                {/* Platform Badges - Only show in title section */}
                {platformMappings.length > 0 && (
                  <Group gap="xs" mt="xs">
                    {platformMappings.map((mapping, idx) => (
                      <Badge key={idx} size="md" variant="light" color="blue">
                        {mapping.platform} {HEADER_LABELS.PLATFORM_SEPARATOR} {mapping.target}
                        {mapping.version && ` (${mapping.version})`}
                      </Badge>
                    ))}
                  </Group>
                )}
              </div>
            </Group>
            
            {/* Status Badges and Actions */}
            <Group gap="sm">
              {/* Show releasePhase if present (primary badge - most detailed) */}
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
              {/* Show releaseStatus if present and adds context (e.g., PAUSED, SUBMITTED, COMPLETED) */}
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

          {/* Main Info Section: Version, Branch, Stage - Compact */}
          <Group gap="lg" wrap="wrap">
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

          {/* Action Buttons */}
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
              onClick={() => setActivityLogModalOpened(true)}
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
        </Stack>
      </Paper>

      {/* Edit Release Modal */}
      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title={BUTTON_LABELS.EDIT_RELEASE}
        size="90%"
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
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {isLoadingLogs ? (
          <Text c="dimmed">Loading activity logs...</Text>
        ) : activityLogs?.activityLogs && activityLogs.activityLogs.length > 0 ? (
          <Stack gap="sm">
            {activityLogs.activityLogs.map((log) => (
              <div key={log.id} style={{ padding: '8px', borderBottom: '1px solid var(--mantine-color-slate-2)' }}>
                <Text size="sm" fw={500}>
                  {log.type}
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(log.updatedAt).toLocaleString()}
                </Text>
                {log.updatedBy && (
                  <Text size="xs" c="dimmed">
                    By: {log.updatedBy}
                  </Text>
                )}
              </div>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed">No activity logs available</Text>
        )}
      </Modal>

      {/* Slack Message Modal - Send predefined notification */}
      <Modal
        opened={slackMessageModalOpened}
        onClose={() => setSlackMessageModalOpened(false)}
        title={BUTTON_LABELS.POST_SLACK_MESSAGE}
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Send a notification to the Slack channel for this release
          </Text>
          <Group gap="sm">
            <Button
              variant="outline"
              onClick={() => handleSendNotification('RELEASE_KICKOFF')}
              loading={sendNotificationMutation.isLoading}
              disabled={sendNotificationMutation.isLoading}
            >
              Release Kickoff
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSendNotification('REGRESSION_COMPLETE')}
              loading={sendNotificationMutation.isLoading}
              disabled={sendNotificationMutation.isLoading}
            >
              Regression Complete
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSendNotification('RELEASE_SUBMITTED')}
              loading={sendNotificationMutation.isLoading}
              disabled={sendNotificationMutation.isLoading}
            >
              Release Submitted
            </Button>
          </Group>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setSlackMessageModalOpened(false)}>
              {BUTTON_LABELS.CANCEL}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Pause Confirmation Modal */}
      <Modal
        opened={pauseConfirmModalOpened}
        onClose={() => setPauseConfirmModalOpened(false)}
        title="Confirm Pause Release"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to pause this release? The release process will be stopped and can be resumed later.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              onClick={() => setPauseConfirmModalOpened(false)}
            >
              {BUTTON_LABELS.CANCEL}
            </Button>
            <Button
              color="orange"
              leftSection={<IconPlayerPause size={16} />}
              onClick={handlePauseResume}
            >
              {BUTTON_LABELS.PAUSE}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
