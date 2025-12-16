/**
 * SubmissionManagementCard - Full submission management actions
 * Extracted from dashboard.$org.distributions.$releaseId.tsx
 */

import { Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import { ROLLOUT_COMPLETE_PERCENT, SUBMISSION_STATUS_COLORS, SUBMISSION_STATUS_LABELS } from '~/constants/distribution.constants';
import type { Submission } from '~/types/distribution.types';
import { Platform, SubmissionStatus } from '~/types/distribution.types';

export type SubmissionManagementCardProps = {
  submission: Submission;
  onPause: () => void;
  onResume: () => void;
  onHalt: () => void;
  onRetry: () => void;
  onViewHistory: () => void;
};

export function SubmissionManagementCard(props: SubmissionManagementCardProps) {
  const { submission, onPause, onResume, onHalt, onRetry, onViewHistory } = props;

  const isPaused = submission.status === SubmissionStatus.LIVE && submission.rolloutPercentage === 0;
  const isRejected = submission.status === SubmissionStatus.REJECTED;
  const isInReview = submission.status === SubmissionStatus.IN_REVIEW;
  const isComplete = submission.status === SubmissionStatus.LIVE && submission.rolloutPercentage === ROLLOUT_COMPLETE_PERCENT;
  const showPauseResume = !isInReview && !isRejected && !isComplete;
  const showEmergencyHalt = !isComplete;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Group gap="sm" mb="xs">
              <Text fw={600} size="lg">
                {submission.version}
                {submission.platform === Platform.ANDROID && 'versionCode' in submission && ` (${submission.versionCode})`}
              </Text>
              <Badge
                color={SUBMISSION_STATUS_COLORS[submission.status]}
                variant="light"
                size="lg"
              >
                {SUBMISSION_STATUS_LABELS[submission.status]}
              </Badge>
            </Group>
            {/* Track field is not in API spec */}
            {false && (
              <Text size="sm" c="dimmed">
                Track: N/A
              </Text>
            )}
          </div>
        </Group>

        {/* Timeline */}
        {submission.submittedAt && (
          <Group gap="lg">
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Submitted:
              </Text>
              <Text size="sm">{new Date(submission.submittedAt).toLocaleString()}</Text>
            </Group>
            {/* approvedAt is not in API spec */}
          </Group>
        )}

        {/* Action Buttons */}
        <Group gap="sm" mt="md">
          {isRejected && (
            <Button onClick={onRetry} color="blue">
              Fix & Re-Submit
            </Button>
          )}

          {showPauseResume && (
            <>
              {isPaused ? (
                <Button onClick={onResume} color="green">
                  Resume Rollout
                </Button>
              ) : (
                <Button onClick={onPause} variant="light">
                  Pause Rollout
                </Button>
              )}
            </>
          )}

          {showEmergencyHalt && (
            <Button onClick={onHalt} color="red" variant="light">
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

