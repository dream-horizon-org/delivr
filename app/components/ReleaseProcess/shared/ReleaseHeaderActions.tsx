/**
 * ReleaseHeaderActions Component
 * Action buttons for release header (Edit, Pause/Resume, Activity Log, Post Slack Message)
 */

import { Button, Group } from '@mantine/core';
import {
  IconEdit,
  IconHistory,
  IconMessageCircle,
  IconPlayerPause,
  IconPlayerPlay,
  IconArchive,
} from '@tabler/icons-react';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { Phase, ReleaseStatus, PauseType } from '~/types/release-process-enums';
import { BUTTON_LABELS } from '~/constants/release-process-ui';

interface ReleaseHeaderActionsProps {
  release: BackendReleaseResponse;
  isPaused: boolean;
  canPerformReleaseAction: boolean;
  onEditClick: () => void;
  onPauseClick: () => void;
  onResumeClick: () => void;
  onActivityLogClick: () => void;
  onSlackMessageClick: () => void;
  onArchiveClick: () => void;
  isRefetching?: boolean;
}

export function ReleaseHeaderActions({
  release,
  isPaused,
  canPerformReleaseAction,
  onEditClick,
  onPauseClick,
  onResumeClick,
  onActivityLogClick,
  onSlackMessageClick,
  onArchiveClick,
  isRefetching = false,
}: ReleaseHeaderActionsProps) {
  const releaseStatus: ReleaseStatus = release.status;
  const pauseType = release.cronJob?.pauseType;

  const isResumeDisabled = isPaused && (
    pauseType === PauseType.AWAITING_STAGE_TRIGGER || 
    pauseType === PauseType.TASK_FAILURE
  );

  // Only show archive if release is not already archived
  const canArchive = releaseStatus !== ReleaseStatus.ARCHIVED;

  return (
    <Group gap="sm" wrap="wrap">
      {/* Edit - Only visible to release pilot or org owner */}
      {canPerformReleaseAction && (
        <Button 
          variant="outline" 
          leftSection={<IconEdit size={16} />}
          onClick={onEditClick}
          loading={isRefetching}
          disabled={isRefetching}
        >
          {BUTTON_LABELS.EDIT_RELEASE}
        </Button>
      )}
      
      {/* Archive - Only visible to release pilot or org owner, and only if not archived */}
      {canPerformReleaseAction && canArchive && (
        <Button 
          variant="outline" 
          color="red"
          leftSection={<IconArchive size={16} />}
          onClick={onArchiveClick}
        >
          {BUTTON_LABELS.ARCHIVE}
        </Button>
      )}
      
      {/* Pause/Resume - Only show if release is in progress or paused AND user has permission */}
      {canPerformReleaseAction && (releaseStatus === ReleaseStatus.IN_PROGRESS || releaseStatus === ReleaseStatus.PAUSED) && (
        <Button
          variant="outline"
          color={isPaused ? 'green' : 'orange'}
          leftSection={isPaused ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />}
          onClick={isPaused ? onResumeClick : onPauseClick}
          disabled={isResumeDisabled}
        >
          {isPaused ? BUTTON_LABELS.RESUME : BUTTON_LABELS.PAUSE}
        </Button>
      )}
      
      {/* Activity Log - Always visible (accessible to viewers) */}
      <Button
        variant="outline"
        leftSection={<IconHistory size={16} />}
        onClick={onActivityLogClick}
      >
        {BUTTON_LABELS.ACTIVITY_LOG}
      </Button>
      
      {/* Notify - Only visible to release pilot or org owner */}
      {canPerformReleaseAction && (
        <Button
          variant="outline"
          leftSection={<IconMessageCircle size={16} />}
          onClick={onSlackMessageClick}
        >
          {BUTTON_LABELS.NOTIFY}
        </Button>
      )}
    </Group>
  );
}

