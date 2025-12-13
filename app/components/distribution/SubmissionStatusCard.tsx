/**
 * SubmissionStatusCard - Read-Only Status Display
 * 
 * Purpose: Display submission status on Release Page Distribution Tab (LIMITED VIEW)
 * 
 * Features:
 * - Platform and version info
 * - Status badge
 * - Timestamp
 * - Progress bar (read-only)
 * - Link to Distribution Management for full control
 * 
 * NO ACTION BUTTONS - This is intentionally limited for Release Page
 * For full management, use SubmissionManagementCard on Distribution Management Page
 */

import { Badge, Card, Group, Progress, Stack, Text, ThemeIcon, Button } from '@mantine/core';
import { Link } from '@remix-run/react';
import {
  IconBrandAndroid,
  IconBrandApple,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconX,
} from '@tabler/icons-react';
import {
  PLATFORM_LABELS,
  SUBMISSION_STATUS_COLORS,
  SUBMISSION_STATUS_LABELS,
} from '~/constants/distribution.constants';
import { Platform, SubmissionStatus } from '~/types/distribution.types';
import type { Submission } from '~/types/distribution.types';

// ============================================================================
// TYPES
// ============================================================================

type SubmissionStatusCardProps = {
  submission: Submission;
  org: string;
  releaseId: string;
  compact?: boolean;
  className?: string;
};

// ============================================================================
// LOCAL HELPERS
// ============================================================================

function getSubmissionStatusIcon(status: SubmissionStatus) {
  if (status === SubmissionStatus.LIVE || status === SubmissionStatus.APPROVED) {
    return <IconCheck size={14} />;
  }
  if (status === SubmissionStatus.REJECTED || status === SubmissionStatus.HALTED) {
    return <IconX size={14} />;
  }
  return <IconClock size={14} />;
}

function getProgressBarColor(status: SubmissionStatus): string {
  switch (status) {
    case SubmissionStatus.LIVE:
    case SubmissionStatus.APPROVED:
      return 'green';
    case SubmissionStatus.IN_REVIEW:
      return 'blue';
    case SubmissionStatus.REJECTED:
    case SubmissionStatus.HALTED:
      return 'red';
    default:
      return 'gray';
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PlatformIcon({ platform }: { platform: Platform }) {
  const isAndroid = platform === Platform.ANDROID;

  return (
    <ThemeIcon size="md" radius="md" variant="light" color={isAndroid ? 'green' : 'blue'}>
      {isAndroid ? <IconBrandAndroid size={18} /> : <IconBrandApple size={18} />}
    </ThemeIcon>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmissionStatusCard(props: SubmissionStatusCardProps) {
  const { submission, org, releaseId, compact = false, className } = props;

  const {
    platform,
    submissionStatus,
    versionName,
    versionCode,
    track,
    exposurePercent,
    submittedAt,
    approvedAt,
  } = submission;

  const storeName = platform === Platform.ANDROID ? 'Play Store' : 'App Store';
  const showProgress =
    submissionStatus === SubmissionStatus.LIVE || submissionStatus === SubmissionStatus.APPROVED;

  return (
    <Card
      shadow="sm"
      padding={compact ? 'md' : 'lg'}
      radius="md"
      withBorder
      className={className}
      data-testid={`submission-status-card-${platform.toLowerCase()}`}
    >
      <Stack gap={compact ? 'sm' : 'md'}>
        {/* Header */}
        <Group justify="space-between">
          <Group gap="sm">
            <PlatformIcon platform={platform} />
            <div>
              <Group gap="xs">
                <Text fw={600} size={compact ? 'sm' : 'md'}>
                  {PLATFORM_LABELS[platform]}
                </Text>
                {track && <Badge size="xs" variant="outline">{track}</Badge>}
              </Group>
              <Text size="xs" c="dimmed">
                {storeName}
              </Text>
            </div>
          </Group>

          <Badge
            color={SUBMISSION_STATUS_COLORS[submissionStatus]}
            variant="light"
            leftSection={getSubmissionStatusIcon(submissionStatus)}
          >
            {SUBMISSION_STATUS_LABELS[submissionStatus]}
          </Badge>
        </Group>

        {/* Version Info */}
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            Version:
          </Text>
          <Text size="sm">
            {versionName} ({versionCode})
          </Text>
        </Group>

        {/* Progress Bar (if applicable) */}
        {showProgress && (
          <div>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">
                Rollout Progress
              </Text>
              <Text size="xs" fw={600}>
                {exposurePercent}%
              </Text>
            </Group>
            <Progress
              value={exposurePercent}
              color={getProgressBarColor(submissionStatus)}
              size="md"
              radius="md"
              animated={exposurePercent < 100}
            />
          </div>
        )}

        {/* Timeline */}
        {submittedAt && (
          <Stack gap={4}>
            <Group gap="xs">
              <Text size="xs" c="dimmed" w={70}>
                Submitted:
              </Text>
              <Text size="xs">{new Date(submittedAt).toLocaleDateString()}</Text>
            </Group>
            {approvedAt && (
              <Group gap="xs">
                <Text size="xs" c="dimmed" w={70}>
                  Approved:
                </Text>
                <Text size="xs">{new Date(approvedAt).toLocaleDateString()}</Text>
              </Group>
            )}
            <Group gap="xs">
              <Text size="xs" c="dimmed" w={70}>
                Last updated:
              </Text>
              <Text size="xs">{new Date(submission.updatedAt).toLocaleString()}</Text>
            </Group>
          </Stack>
        )}

        {/* Status Message */}
        <Text size="sm" c="dimmed">
          {submissionStatus === SubmissionStatus.IN_REVIEW &&
            'Awaiting store review. This typically takes 1-3 days.'}
          {submissionStatus === SubmissionStatus.REJECTED &&
            'Submission was rejected. Go to Distribution Management to fix and re-submit.'}
          {submissionStatus === SubmissionStatus.APPROVED &&
            'Approved by store. Use Distribution Management to start rollout.'}
          {submissionStatus === SubmissionStatus.LIVE &&
            exposurePercent < 100 &&
            'Rolling out. Use Distribution Management to update percentage.'}
          {submissionStatus === SubmissionStatus.LIVE &&
            exposurePercent === 100 &&
            'Live to 100% of users!'}
          {submissionStatus === SubmissionStatus.HALTED &&
            'Rollout halted. Check Distribution Management for details.'}
        </Text>

        {/* Link to Distribution Management */}
        {submissionStatus !== SubmissionStatus.IN_REVIEW && (
          <Button
            component={Link}
            to={`/dashboard/${org}/distributions/${releaseId}`}
            variant="subtle"
            size="sm"
            rightSection={<IconExternalLink size={14} />}
          >
            Manage in Distribution
          </Button>
        )}
      </Stack>
    </Card>
  );
}

