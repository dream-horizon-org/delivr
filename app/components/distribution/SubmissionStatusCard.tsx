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

import { Badge, Button, Card, Group, Progress, Stack, Text, ThemeIcon } from '@mantine/core';
import { Link } from '@remix-run/react';
import {
    IconBrandAndroid,
    IconBrandApple,
    IconCheck,
    IconClock,
    IconExternalLink,
    IconPlayerPause,
    IconX,
} from '@tabler/icons-react';
import {
    PLATFORM_LABELS,
    ROLLOUT_COMPLETE_PERCENT,
    STORE_NAMES,
    SUBMISSION_PROGRESS_COLORS,
    SUBMISSION_STATUS_COLORS,
    SUBMISSION_STATUS_LABELS,
} from '~/constants/distribution.constants';
import type { Submission } from '~/types/distribution.types';
import { Platform, SubmissionStatus } from '~/types/distribution.types';

// ============================================================================
// TYPES
// ============================================================================

type SubmissionStatusCardProps = {
  submission: Submission;
  org: string;
  distributionId: string;
  compact?: boolean;
  className?: string;
};

// ============================================================================
// LOCAL HELPER (returns JSX, must stay in component file)
// ============================================================================

function getSubmissionStatusIcon(status: SubmissionStatus) {
  if (status === SubmissionStatus.LIVE || status === SubmissionStatus.APPROVED) {
    return <IconCheck size={14} />;
  }
  if (status === SubmissionStatus.PAUSED) {
    return <IconPlayerPause size={14} />;
  }
  if (status === SubmissionStatus.REJECTED || status === SubmissionStatus.HALTED) {
    return <IconX size={14} />;
  }
  return <IconClock size={14} />;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

type PlatformIconProps = {
  platform: Platform;
};

function PlatformIcon({ platform }: PlatformIconProps) {
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
  const { submission, org, distributionId, compact = false, className } = props;

  const {
    platform,
    status,
    version,
    rolloutPercentage,
    submittedAt,
  } = submission;
  
  const versionCode = submission.platform === Platform.ANDROID && 'versionCode' in submission
    ? submission.versionCode
    : null;

  const storeName = STORE_NAMES[platform];
  const showProgress =
    status === SubmissionStatus.LIVE || status === SubmissionStatus.APPROVED;

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
                {/* track field is not in API spec */}
              </Group>
              <Text size="xs" c="dimmed">
                {storeName}
              </Text>
            </div>
          </Group>

          <Badge
            color={SUBMISSION_STATUS_COLORS[status]}
            variant="light"
            leftSection={getSubmissionStatusIcon(status)}
          >
            {SUBMISSION_STATUS_LABELS[status]}
          </Badge>
        </Group>

        {/* Version Info */}
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            Version:
          </Text>
          <Text size="sm">
            {version}{versionCode && ` (${versionCode})`}
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
                {rolloutPercentage}%
              </Text>
            </Group>
            <Progress
              value={rolloutPercentage}
              color={SUBMISSION_PROGRESS_COLORS[status]}
              size="md"
              radius="md"
              animated={rolloutPercentage < ROLLOUT_COMPLETE_PERCENT}
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
            {/* approvedAt is not in API spec */}
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
          {status === SubmissionStatus.IN_REVIEW &&
            'Awaiting store review. This typically takes 1-3 days.'}
          {status === SubmissionStatus.REJECTED &&
            'Submission was rejected. Go to Distribution Management to fix and re-submit.'}
          {status === SubmissionStatus.APPROVED &&
            'Approved by store. Use Distribution Management to start rollout.'}
          {status === SubmissionStatus.LIVE &&
            rolloutPercentage < ROLLOUT_COMPLETE_PERCENT &&
            'Rolling out. Use Distribution Management to update percentage.'}
          {status === SubmissionStatus.LIVE &&
            rolloutPercentage === ROLLOUT_COMPLETE_PERCENT &&
            'Live to 100% of users!'}
          {status === SubmissionStatus.HALTED &&
            'Rollout halted. Check Distribution Management for details.'}
        </Text>

        {/* Link to Distribution Management */}
        {status !== SubmissionStatus.IN_REVIEW && (
          <Button
            component={Link}
            to={`/dashboard/${org}/distributions/${distributionId}`}
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

