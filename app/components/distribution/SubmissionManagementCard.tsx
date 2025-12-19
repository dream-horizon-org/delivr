/**
 * SubmissionManagementCard - Full submission management actions
 * Displays submission status and provides action buttons based on current state
 */

import { Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import { DS_COLORS, DS_SPACING, DS_TYPOGRAPHY } from '~/constants/distribution/distribution-design.constants';
import { SUBMISSION_STATUS_COLORS, SUBMISSION_STATUS_LABELS } from '~/constants/distribution/distribution.constants';
import type { Submission } from '~/types/distribution/distribution.types';
import { Platform } from '~/types/distribution/distribution.types';
import {
  canManageRollout,
  isSubmissionInErrorState,
  isSubmissionPaused,
} from '~/utils/distribution/distribution-state.utils';

export interface SubmissionManagementCardProps {
  submission: Submission;
  onPause: () => void;
  onResume: () => void;
  onHalt: () => void;
  onRetry: () => void;
  onViewHistory: () => void;
}

export function SubmissionManagementCard({
  submission,
  onPause,
  onResume,
  onHalt,
  onRetry,
  onViewHistory,
}: SubmissionManagementCardProps) {
  // Status-based flags
  const isAndroid = submission.platform === Platform.ANDROID;
  const isIOS = submission.platform === Platform.IOS;
  
  // Derive UI state using SSOT utility functions (clean, testable logic)
  const canShowPauseResume = canManageRollout(
    submission.status,
    submission.platform,
    submission.rolloutPercentage
  );
  const isPaused = isSubmissionPaused(submission.status);
  const isRejected = isSubmissionInErrorState(submission.status);

  // Action visibility
  const canHalt = false; // Deprecated: Use pause/resume instead
  const canRetry = isRejected;

  // Version display with code for Android
  const versionDisplay = submission.platform === Platform.ANDROID && 'versionCode' in submission
    ? `${submission.version} (${submission.versionCode})`
    : submission.version;

  return (
    <Card shadow="sm" padding={DS_SPACING.LG} radius="md" withBorder>
      <Stack gap={DS_SPACING.MD}>
        {/* Header */}
        <Group gap={DS_SPACING.SM} mb={DS_SPACING.XS}>
          <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} size="lg">
            {versionDisplay}
          </Text>
          <Badge
            color={SUBMISSION_STATUS_COLORS[submission.status]}
            variant="light"
            size="lg"
          >
            {SUBMISSION_STATUS_LABELS[submission.status]}
          </Badge>
        </Group>

        {/* Submission timestamp */}
        {submission.submittedAt && (
          <Group gap={DS_SPACING.XS}>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
              Submitted:
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM}>
              {new Date(submission.submittedAt).toLocaleString()}
            </Text>
          </Group>
        )}

        {/* Action Buttons */}
        <Group gap={DS_SPACING.SM} mt={DS_SPACING.MD}>
          {canRetry && (
            <Button onClick={onRetry} color={DS_COLORS.ACTION.PRIMARY}>
              Fix & Re-Submit
            </Button>
          )}

          {canShowPauseResume && (
            isPaused ? (
              <Button onClick={onResume} color={DS_COLORS.STATUS.SUCCESS}>
                Resume Rollout
              </Button>
            ) : (
              <Button onClick={onPause} variant="light">
                Pause Rollout
              </Button>
            )
          )}

          {canHalt && (
            <Button onClick={onHalt} color={DS_COLORS.STATUS.ERROR} variant="light">
              Emergency Halt
            </Button>
          )}

          <Button onClick={onViewHistory} variant="subtle">
            View History
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

