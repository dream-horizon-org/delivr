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
} from '@tabler/icons-react';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { Phase, ReleaseStatus } from '~/types/release-process-enums';
import { BUTTON_LABELS } from '~/constants/release-process-ui';

interface ReleaseHeaderActionsProps {
  release: BackendReleaseResponse;
  isPaused: boolean;
  onEditClick: () => void;
  onPauseClick: () => void;
  onResumeClick: () => void;
  onActivityLogClick: () => void;
  onSlackMessageClick: () => void;
}

export function ReleaseHeaderActions({
  release,
  isPaused,
  onEditClick,
  onPauseClick,
  onResumeClick,
  onActivityLogClick,
  onSlackMessageClick,
}: ReleaseHeaderActionsProps) {
  const releaseStatus: ReleaseStatus = release.status;

  return (
    <Group gap="sm" wrap="wrap">
      <Button 
        variant="outline" 
        leftSection={<IconEdit size={16} />}
        onClick={onEditClick}
      >
        {BUTTON_LABELS.EDIT_RELEASE}
      </Button>
      
      {/* Pause/Resume - Only show if release is in progress or paused */}
      {(releaseStatus === ReleaseStatus.IN_PROGRESS || releaseStatus === ReleaseStatus.PAUSED) && (
        <Button
          variant="outline"
          color={isPaused ? 'green' : 'orange'}
          leftSection={isPaused ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />}
          onClick={isPaused ? onResumeClick : onPauseClick}
        >
          {isPaused ? BUTTON_LABELS.RESUME : BUTTON_LABELS.PAUSE}
        </Button>
      )}
      
      <Button
        variant="outline"
        leftSection={<IconHistory size={16} />}
        onClick={onActivityLogClick}
      >
        {BUTTON_LABELS.ACTIVITY_LOG}
      </Button>
      
      <Button
        variant="outline"
        leftSection={<IconMessageCircle size={16} />}
        onClick={onSlackMessageClick}
      >
        {BUTTON_LABELS.POST_SLACK_MESSAGE}
      </Button>
    </Group>
  );
}

