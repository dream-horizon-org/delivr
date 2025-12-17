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

import { Button, Group, Paper, Stack, Box } from '@mantine/core';
import { Link, useSearchParams } from '@remix-run/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useState } from 'react';
import { useQueryClient } from 'react-query';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { BUTTON_LABELS } from '~/constants/release-process-ui';
import { RELEASE_MESSAGES } from '~/constants/toast-messages';
import { usePauseResumeRelease } from '~/hooks/useReleaseProcess';
import { Phase, ReleaseStatus, PauseType } from '~/types/release-process-enums';
import type { TaskStage } from '~/types/release-process-enums';
import type { MessageTypeEnum } from '~/types/release-process.types';
import type { UpdateReleaseBackendRequest } from '~/types/release-creation-backend';
import { apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { invalidateReleases } from '~/utils/cache-invalidation';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { ReleaseHeaderTitle, ReleaseHeaderInfo } from './shared/ReleaseHeaderInfo';
import { ReleaseHeaderActions } from './shared/ReleaseHeaderActions';
import { ReleaseHeaderModals } from './shared/ReleaseHeaderModals';

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
  const [activityDrawerOpened, setActivityDrawerOpened] = useState(false);
  const [slackMessageModalOpened, setSlackMessageModalOpened] = useState(false);
  const [selectedMessageType, setSelectedMessageType] = useState<MessageTypeEnum | null>(null);
  const [pauseConfirmModalOpened, setPauseConfirmModalOpened] = useState(false);
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Get returnTo params from URL to restore filters and tab when going back
  const returnTo = searchParams.get('returnTo');
  const backUrl = returnTo 
    ? `/dashboard/${org}/releases?${returnTo}`
    : `/dashboard/${org}/releases`;

  // Use API data directly - no derivation
  const releaseStatus: ReleaseStatus = release.status;
  const releasePhase: Phase | undefined = release.releasePhase;
  
  // Check if paused - use pauseType from cronJob (primary check)
  // Backend keeps cronStatus=RUNNING and uses pauseType to control pause state
  const pauseType = release.cronJob?.pauseType;
  const isPaused = !!(pauseType && pauseType !== PauseType.NONE);

  // Handle update submission
  const handleUpdate = async (updateRequest: UpdateReleaseBackendRequest): Promise<void> => {
    try {
      const result = await apiPatch<{ success: boolean; release?: BackendReleaseResponse; error?: string }>(
        `/api/v1/tenants/${org}/releases/${release.id}`,
        updateRequest
      );

      await invalidateReleases(queryClient, org);
      // Invalidate activity logs to show update action
      await queryClient.invalidateQueries(['release-process', 'activity', org, release.id]);
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


  return (
    <>
      <Paper shadow="sm" p="lg" radius="md" withBorder className={className}>
        <Stack gap="md">
          {/* Top Section: Back Button */}
          <Group gap="xs" style={{ marginBottom: '-8px' }}>
            <Link to={backUrl}>
              <Button 
                variant="subtle" 
                size="xs"
                leftSection={<IconArrowLeft size={14} />}
                style={{ padding: '4px 8px', height: 'auto' }}
              >
                {BUTTON_LABELS.BACK}
              </Button>
            </Link>
          </Group>

          {/* Release Title, Status Badges, and Platform Badges */}
          <ReleaseHeaderTitle release={release} />

          {/* Info Section and Action Buttons */}
          <Group justify="space-between" align="center" wrap="nowrap">
            {/* Info Section - Left Side */}
            <Box style={{ flex: '1 1 auto', minWidth: 0 }}>
              <ReleaseHeaderInfo
                release={release}
                releaseVersion={releaseVersion}
                currentStage={currentStage}
              />
            </Box>

            {/* Action Buttons - Right Side */}
            <Box style={{ flex: '0 0 auto' }}>
              <ReleaseHeaderActions
                release={release}
                isPaused={isPaused}
                onEditClick={() => setEditModalOpened(true)}
                onPauseClick={handlePauseClick}
                onResumeClick={handleResumeClick}
                onActivityLogClick={() => setActivityDrawerOpened(true)}
                onSlackMessageClick={() => setSlackMessageModalOpened(true)}
              />
            </Box>
          </Group>
        </Stack>
      </Paper>

      {/* All Modals */}
      <ReleaseHeaderModals
        release={release}
        org={org}
        editModalOpened={editModalOpened}
        activityDrawerOpened={activityDrawerOpened}
        slackMessageModalOpened={slackMessageModalOpened}
        pauseConfirmModalOpened={pauseConfirmModalOpened}
        selectedMessageType={selectedMessageType}
        onEditModalClose={() => setEditModalOpened(false)}
        onActivityDrawerClose={() => setActivityDrawerOpened(false)}
        onSlackMessageModalClose={() => setSlackMessageModalOpened(false)}
        onPauseConfirmModalClose={() => setPauseConfirmModalOpened(false)}
        onSelectedMessageTypeChange={setSelectedMessageType}
        onUpdate={handleUpdate}
        onPauseResume={handlePauseResume}
        onUpdateCallback={onUpdate}
      />
    </>
  );
}
