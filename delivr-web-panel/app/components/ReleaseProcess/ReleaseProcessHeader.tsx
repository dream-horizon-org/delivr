/**
 * ReleaseProcessHeader Component
 * Unified header for release process - essential info and actions only
 * 
 * Displays:
 * - Release branch and version
 * - Current stage and status badges
 * - Action buttons: Edit, Archive, Pause/Resume, Activity Log, Post Slack Message
 * 
 * Data Source:
 * - Uses existing `GET /api/v1/apps/:appId/releases/:releaseId` (backend)
 * - Stage status from stage API responses
 */

import { Button, Group, Paper, Stack, Box } from '@mantine/core';
import { Link, useSearchParams } from '@remix-run/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useState } from 'react';
import { useQueryClient } from 'react-query';
import { useRouteLoaderData } from '@remix-run/react';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { BUTTON_LABELS } from '~/constants/release-process-ui';
import { RELEASE_MESSAGES } from '~/constants/toast-messages';
import { usePauseResumeRelease, useArchiveRelease } from '~/hooks/useReleaseProcess';
import { usePermissions } from '~/hooks/usePermissions';
import { Phase, ReleaseStatus, PauseType, TaskStage } from '~/types/release-process-enums';
import type { MessageTypeEnum } from '~/types/release-process.types';
import type { UpdateReleaseBackendRequest } from '~/types/release-creation-backend';
import { apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { isReleasePaused } from '~/utils/release-utils';
import type { OrgLayoutLoaderData } from '~/routes/dashboard.$org';
import { ReleaseHeaderTitle, ReleaseHeaderInfo } from './shared/ReleaseHeaderInfo';
import { ReleaseHeaderActions } from './shared/ReleaseHeaderActions';
import { ReleaseHeaderModals } from './shared/ReleaseHeaderModals';

interface ReleaseProcessHeaderProps {
  release: BackendReleaseResponse;
  org: string;
  releaseVersion: string;
  currentStage: TaskStage | null;
  onUpdate?: () => void;
  onRefetch?: () => Promise<any>;
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
  onRefetch,
  className,
}: ReleaseProcessHeaderProps) {
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [activityDrawerOpened, setActivityDrawerOpened] = useState(false);
  const [slackMessageModalOpened, setSlackMessageModalOpened] = useState(false);
  const [selectedMessageType, setSelectedMessageType] = useState<MessageTypeEnum | null>(null);
  const [pauseConfirmModalOpened, setPauseConfirmModalOpened] = useState(false);
  const [archiveConfirmModalOpened, setArchiveConfirmModalOpened] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const queryClient = useQueryClient();

  // Get user data from parent route loader
  const orgLayoutData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  const userId = orgLayoutData?.user?.user?.id || '';

  // Check permissions
  const { canPerformReleaseAction } = usePermissions(org, userId);
  const canPerform = canPerformReleaseAction(release.releasePilotAccountId);


  // Use API data directly - no derivation
  const releaseStatus: ReleaseStatus = release.status;
  const releasePhase: Phase | undefined = release.releasePhase;
  
  // Check if paused - use utility function which handles special cases
  // (e.g., distribution stage with completed cron but active release)
  const isPaused = isReleasePaused(release);

  // Handle update submission
  const handleUpdate = async (updateRequest: UpdateReleaseBackendRequest): Promise<void> => {
    try {
      const result = await apiPatch<{ success: boolean; release?: BackendReleaseResponse; error?: string }>(
        `/api/v1/apps/${org}/releases/${release.id}`,
        updateRequest
      );

      // Option 4: Optimistic update + background refetch
      // 1. Optimistically update cache for instant UI feedback
      if (result.data?.release) {
        const updatedRelease = result.data.release;
        queryClient.setQueryData<{ success: boolean; release?: BackendReleaseResponse; error?: string }>(
          ['release', org, release.id],
          (old) => {
            if (!old) {
              return { success: true, release: updatedRelease };
            }
            return {
              ...old,
              release: updatedRelease,
            };
          }
        );
      }

      // 2. Background invalidation to ensure consistency with server
      // Only invalidate current release - releases list will refetch on navigation (refetchOnMount: true)
      queryClient.invalidateQueries(['release', org, release.id]);
      // Invalidate all stage queries to refetch stage data
      // This ensures stage APIs are refetched when release is modified
      Object.values(TaskStage).forEach((stage) => {
        queryClient.invalidateQueries(['release-process', 'stage', org, release.id, stage]);
      });
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

  // Archive hook
  const archiveMutation = useArchiveRelease(org, release.id);

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

  // Handle edit button click - refetch before opening modal
  const handleEditClick = async () => {
    if (onRefetch) {
      setIsRefetching(true);
      try {
        await onRefetch();
      } catch (error) {
        console.error('[ReleaseProcessHeader] Failed to refetch release:', error);
        showErrorToast({ message: 'Failed to refresh release data. Opening with cached data.' });
      } finally {
        setIsRefetching(false);
      }
    }
    setEditModalOpened(true);
  };

  // Handle archive - matches Modify pattern exactly
  const handleArchive = async (): Promise<void> => {
    try {
      await archiveMutation.mutateAsync();
      
      // Optimistically update cache for instant UI feedback (same as Modify)
      queryClient.setQueryData<{ success: boolean; release?: BackendReleaseResponse; error?: string }>(
        ['release', org, release.id],
        (old) => {
          if (!old) {
            return { success: true, release: { ...release, status: ReleaseStatus.ARCHIVED } };
          }
          return {
            ...old,
            release: old.release ? { ...old.release, status: ReleaseStatus.ARCHIVED } : undefined,
          };
        }
      );

      // Background invalidation to ensure consistency with server (same as Modify)
      queryClient.invalidateQueries(['release', org, release.id]);
      // Invalidate all stage queries to refetch stage data (same as Modify)
      Object.values(TaskStage).forEach((stage) => {
        queryClient.invalidateQueries(['release-process', 'stage', org, release.id, stage]);
      });
      // Invalidate activity logs to show archive action (same as Modify)
      await queryClient.invalidateQueries(['release-process', 'activity', org, release.id]);
      
      showSuccessToast(RELEASE_MESSAGES.UPDATE_SUCCESS);

      if (onUpdate) {
        onUpdate();
      }

      setArchiveConfirmModalOpened(false);
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to archive release');
      showErrorToast({ message: errorMessage });
    }
  };

  // Handle archive button click - show confirmation modal
  const handleArchiveClick = () => {
    setArchiveConfirmModalOpened(true);
  };


  return (
    <>
      <Paper shadow="sm" p="lg" radius="md" withBorder className={className}>
        <Stack gap="md">
          {/* Release Title, Status Badges, and Platform Badges */}
          <ReleaseHeaderInfo
              release={release}
              releaseVersion={releaseVersion}
              currentStage={currentStage}
            />
          

          {/* Info Section and Action Buttons */}
          <Group justify="space-between" align="center" wrap="wrap">
            {/* Info Section - Left Side */}
            
            <ReleaseHeaderTitle release={release} />
            {/* Action Buttons - Right Side */}

            <ReleaseHeaderActions
              release={release}
              isPaused={isPaused}
              canPerformReleaseAction={canPerform}
              onEditClick={handleEditClick}
              onPauseClick={handlePauseClick}
              onResumeClick={handleResumeClick}
              onActivityLogClick={() => setActivityDrawerOpened(true)}
              onSlackMessageClick={() => setSlackMessageModalOpened(true)}
              onArchiveClick={handleArchiveClick}
              isRefetching={isRefetching}
            />
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
        archiveConfirmModalOpened={archiveConfirmModalOpened}
        selectedMessageType={selectedMessageType}
        onEditModalClose={() => setEditModalOpened(false)}
        onActivityDrawerClose={() => setActivityDrawerOpened(false)}
        onSlackMessageModalClose={() => setSlackMessageModalOpened(false)}
        onPauseConfirmModalClose={() => setPauseConfirmModalOpened(false)}
        onArchiveConfirmModalClose={() => setArchiveConfirmModalOpened(false)}
        onSelectedMessageTypeChange={setSelectedMessageType}
        onUpdate={handleUpdate}
        onPauseResume={handlePauseResume}
        onArchive={handleArchive}
        onUpdateCallback={onUpdate}
      />
    </>
  );
}
