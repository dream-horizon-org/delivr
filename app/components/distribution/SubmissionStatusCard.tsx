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
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import { SUBMISSION_STATUS_CONFIG } from '~/constants/distribution/distribution-status-config.constants';
import {
  PLATFORM_LABELS,
  ROLLOUT_COMPLETE_PERCENT,
  STORE_NAMES,
  SUBMISSION_PROGRESS_COLORS,
  SUBMISSION_STATUS_COLORS,
  SUBMISSION_STATUS_LABELS,
} from '~/constants/distribution/distribution.constants';
import type { Submission } from '~/types/distribution/distribution.types';
import { Platform, SubmissionStatus } from '~/types/distribution/distribution.types';
import { shouldShowProgressBar } from '~/utils/distribution/distribution-state.utils';

// ============================================================================
// TYPES
// ============================================================================

export type SubmissionStatusCardProps = {
  submission: Submission;
  org: string;
  distributionId: string;
  compact?: boolean;
  className?: string;
};

// ============================================================================
// LOCAL HELPER (returns JSX, must stay in component file)
// ============================================================================

/**
 * Get status icon by directly querying SSOT configuration flags.
 * Returns JSX so must stay in component file.
 */
function getSubmissionStatusIcon(status: SubmissionStatus) {
  const config = SUBMISSION_STATUS_CONFIG[status];
  
  // Directly query SSOT flags instead of intermediate category
  if (config.flags.isActive || status === SubmissionStatus.APPROVED || status === SubmissionStatus.COMPLETED) {
    return <IconCheck size={14} />;
  }
  if (config.flags.isPaused) {
    return <IconPlayerPause size={14} />;
  }
  if (config.flags.isError || config.flags.isTerminal) {
    return <IconX size={14} />;
  }
  // Default: pending/reviewing states
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
    <ThemeIcon size="md" radius={DS_SPACING.BORDER_RADIUS} variant="light" color={isAndroid ? DS_COLORS.PLATFORM.ANDROID : DS_COLORS.PLATFORM.IOS}>
      {isAndroid ? <IconBrandAndroid size={18} /> : <IconBrandApple size={18} />}
    </ThemeIcon>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmissionStatusCard({ submission, org, distributionId, compact = false, className }: SubmissionStatusCardProps) {

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
  
  // Show progress bar - Query SSOT utility function
  const showProgress = shouldShowProgressBar(status, rolloutPercentage);

  return (
    <Card
      shadow="sm"
      padding={compact ? DS_SPACING.MD : DS_SPACING.LG}
      radius={DS_SPACING.BORDER_RADIUS}
      withBorder
      className={className}
      data-testid={`submission-status-card-${platform.toLowerCase()}`}
    >
      <Stack gap={compact ? DS_SPACING.SM : DS_SPACING.MD}>
        {/* Header */}
        <Group justify="space-between">
          <Group gap={DS_SPACING.SM}>
            <PlatformIcon platform={platform} />
            <div>
              <Group gap={DS_SPACING.XS}>
                <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} size={compact ? DS_TYPOGRAPHY.SIZE.SM : DS_TYPOGRAPHY.SIZE.MD}>
                  {PLATFORM_LABELS[platform]}
                </Text>
                {/* track field is not in API spec */}
              </Group>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                {storeName}
              </Text>
            </div>
          </Group>

          <Badge
            color={SUBMISSION_STATUS_COLORS[status]}
            variant="light"
            leftSection={getSubmissionStatusIcon(status)}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            {SUBMISSION_STATUS_LABELS[status]}
          </Badge>
        </Group>

        {/* Version Info */}
        <Group gap={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
            Version:
          </Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM}>
            {version}{versionCode && ` (${versionCode})`}
          </Text>
        </Group>

        {/* Progress Bar (if applicable) */}
        {showProgress && (
          <div>
            <Group justify="space-between" mb={DS_SPACING.XS}>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                Rollout Progress
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
                {rolloutPercentage}%
              </Text>
            </Group>
            <Progress
              value={rolloutPercentage}
              color={SUBMISSION_PROGRESS_COLORS[status]}
              size="md"
              radius={DS_SPACING.BORDER_RADIUS}
              animated={rolloutPercentage < ROLLOUT_COMPLETE_PERCENT}
            />
          </div>
        )}

        {/* Timeline */}
        {submittedAt && (
          <Stack gap={DS_SPACING.XXS}>
            <Group gap={DS_SPACING.XS}>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} w={70}>
                Submitted:
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.XS}>{new Date(submittedAt).toLocaleDateString()}</Text>
            </Group>
            {/* approvedAt is not in API spec */}
            <Group gap={DS_SPACING.XS}>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} w={70}>
                Last updated:
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.XS}>{new Date(submission.updatedAt).toLocaleString()}</Text>
            </Group>
          </Stack>
        )}

        {/* Status Message */}
        <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
          {/* Android Statuses */}
          {status === SubmissionStatus.SUBMITTED &&
            'Submitted to Play Store. Awaiting review and processing.'}
          {status === SubmissionStatus.IN_PROGRESS &&
            rolloutPercentage < ROLLOUT_COMPLETE_PERCENT &&
            'Rolling out on Play Store. Use Distribution Management to update percentage or pause.'}
          {status === SubmissionStatus.IN_PROGRESS &&
            rolloutPercentage === ROLLOUT_COMPLETE_PERCENT &&
            'Rollout at 100%. Will complete automatically.'}
          {status === SubmissionStatus.COMPLETED &&
            'Rollout complete! Live to 100% of users.'}
          {status === SubmissionStatus.HALTED &&
            'Rollout paused. Use Distribution Management to resume.'}
          {status === SubmissionStatus.USER_ACTION_PENDING &&
            'Action required! Check Play Store Console and resubmit if needed.'}
          {status === SubmissionStatus.SUSPENDED &&
            'Submission suspended. No further actions available.'}
          
          {/* iOS Statuses */}
          {status === SubmissionStatus.IN_REVIEW &&
            'Awaiting App Store review. This typically takes 1-3 days.'}
          {status === SubmissionStatus.REJECTED &&
            'Submission was rejected. Go to Distribution Management to fix and re-submit.'}
          {status === SubmissionStatus.APPROVED &&
            'Approved by Apple. Use Distribution Management to release.'}
          {status === SubmissionStatus.LIVE &&
            rolloutPercentage < ROLLOUT_COMPLETE_PERCENT &&
            'Live on App Store. Use Distribution Management to manage phased release.'}
          {status === SubmissionStatus.LIVE &&
            rolloutPercentage === ROLLOUT_COMPLETE_PERCENT &&
            'Live to 100% of users!'}
          {status === SubmissionStatus.PAUSED &&
            'Phased release paused. Use Distribution Management to resume.'}
          {status === SubmissionStatus.CANCELLED &&
            'Submission cancelled. Use Distribution Management to resubmit.'}
        </Text>

        {/* Link to Distribution Management */}
        {status !== SubmissionStatus.IN_REVIEW && status !== SubmissionStatus.SUBMITTED && (
          <Button
            component={Link}
            to={`/dashboard/${org}/distributions/${distributionId}`}
            variant="subtle"
            size="sm"
            rightSection={<IconExternalLink size={14} />}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            Manage in Distribution
          </Button>
        )}
      </Stack>
    </Card>
  );
}

