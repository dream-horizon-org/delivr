/**
 * SubmissionCard - Displays submission details
 * 
 * Features:
 * - Platform and store info
 * - Version and track details
 * - Status with timeline
 * - Clickable for navigation
 */

import { Badge, Card, Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import {
  IconBrandAndroid,
  IconBrandApple,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconPlayerPause,
  IconX,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import {
  DISTRIBUTION_UI_LABELS,
  FORM_ICON_SIZES,
  PLATFORM_LABELS,
  SUBMISSION_STATUS_COLORS,
  SUBMISSION_STATUS_LABELS,
} from '~/constants/distribution.constants';
import { Platform, SubmissionStatus } from '~/types/distribution.types';
import { RolloutProgressBar } from './RolloutProgressBar';
import type { SubmissionCardProps } from './distribution.types';
import { getRolloutDisplayStatus } from './distribution.utils';

// ============================================================================
// CONSTANTS
// ============================================================================

const ICON_SIZES = {
  PLATFORM: 18,
  STATUS: 14,
  CHEVRON: 16,
} as const;

const TIMELINE_LABEL_WIDTH = 70;

const STORE_NAMES = {
  [Platform.ANDROID]: 'Play Store',
  [Platform.IOS]: 'App Store',
} as const;

// ============================================================================
// LOCAL HELPER - Returns JSX (must stay in component file)
// ============================================================================

function getSubmissionStatusIcon(status: SubmissionStatus) {
  if (status === SubmissionStatus.LIVE || status === SubmissionStatus.APPROVED) {
    return <IconCheck size={ICON_SIZES.STATUS} />;
  }
  if (status === SubmissionStatus.PAUSED) {
    return <IconPlayerPause size={ICON_SIZES.STATUS} />;
  }
  if (status === SubmissionStatus.REJECTED || status === SubmissionStatus.HALTED || status === SubmissionStatus.CANCELLED) {
    return <IconX size={ICON_SIZES.STATUS} />;
  }
  return <IconClock size={ICON_SIZES.STATUS} />;
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
    <ThemeIcon 
      size="md" 
      radius="md" 
      variant="light" 
      color={isAndroid ? 'green' : 'blue'}
    >
      {isAndroid ? (
        <IconBrandAndroid size={ICON_SIZES.PLATFORM} />
      ) : (
        <IconBrandApple size={ICON_SIZES.PLATFORM} />
      )}
    </ThemeIcon>
  );
}

type SubmissionTimelineProps = {
  submission: SubmissionCardProps['submission'];
};

function SubmissionTimeline({ submission }: SubmissionTimelineProps) {
  const { submittedAt, approvedAt, releasedAt } = submission;
  
  return (
    <Stack gap={4}>
      {submittedAt && (
        <Group gap="xs">
          <Text size="xs" c="dimmed" w={TIMELINE_LABEL_WIDTH}>
            {DISTRIBUTION_UI_LABELS.TIMELINE_SUBMITTED}
          </Text>
          <Text size="xs">{new Date(submittedAt).toLocaleDateString()}</Text>
        </Group>
      )}
      {approvedAt && (
        <Group gap="xs">
          <Text size="xs" c="dimmed" w={TIMELINE_LABEL_WIDTH}>
            {DISTRIBUTION_UI_LABELS.TIMELINE_APPROVED}
          </Text>
          <Text size="xs">{new Date(approvedAt).toLocaleDateString()}</Text>
        </Group>
      )}
      {releasedAt && (
        <Group gap="xs">
          <Text size="xs" c="dimmed" w={TIMELINE_LABEL_WIDTH}>
            {DISTRIBUTION_UI_LABELS.TIMELINE_RELEASED}
          </Text>
          <Text size="xs">{new Date(releasedAt).toLocaleDateString()}</Text>
        </Group>
      )}
    </Stack>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmissionCard(props: SubmissionCardProps) {
  const { 
    submission, 
    compact = false,
    onClick,
    className,
  } = props;

  const {
    platform,
    submissionStatus,
    versionName,
    versionCode,
    track,
    rolloutPercent,
    rejectionReason,
  } = submission;

  const isRejected = submissionStatus === SubmissionStatus.REJECTED;
  const storeName = STORE_NAMES[platform];
  const rolloutStatus = useMemo(
    () => getRolloutDisplayStatus(rolloutPercent, submissionStatus),
    [rolloutPercent, submissionStatus]
  );

  const CardWrapper = onClick ? UnstyledButton : 'div';
  const cardWrapperClass = `w-full ${onClick ? 'hover:bg-gray-50 transition-colors' : ''}`;

  return (
    <CardWrapper 
      onClick={onClick}
      className={cardWrapperClass}
    >
      <Card 
        shadow="sm" 
        padding={compact ? 'md' : 'lg'} 
        radius="md" 
        withBorder 
        className={className}
        data-testid={`submission-card-${platform.toLowerCase()}`}
      >
        {/* Header */}
        <Group justify="space-between" mb={compact ? 'sm' : 'md'}>
          <Group gap="sm">
            <PlatformIcon platform={platform} />
            <div>
              <Group gap="xs">
                <Text fw={600} size={compact ? 'sm' : 'md'}>
                  {PLATFORM_LABELS[platform]}
                </Text>
                {track && (
                  <Badge size="xs" variant="outline">{track}</Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">{storeName}</Text>
            </div>
          </Group>
          
          <Group gap="sm">
            <Badge 
              color={SUBMISSION_STATUS_COLORS[submissionStatus]} 
              variant="light"
              leftSection={getSubmissionStatusIcon(submissionStatus)}
            >
              {SUBMISSION_STATUS_LABELS[submissionStatus]}
            </Badge>
            
            {onClick && (
              <IconChevronRight size={ICON_SIZES.CHEVRON} className="text-gray-400" />
            )}
          </Group>
        </Group>

        {/* Version Info */}
        <Group gap="lg" mb={compact ? 'sm' : 'md'}>
          <div>
            <Text size="xs" c="dimmed">{DISTRIBUTION_UI_LABELS.VERSION_LABEL}</Text>
            <Text size="sm" fw={500}>{versionName}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">{DISTRIBUTION_UI_LABELS.BUILD_LABEL}</Text>
            <Text size="sm" fw={500}>{versionCode}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">{DISTRIBUTION_UI_LABELS.EXPOSURE_LABEL}</Text>
            <Text size="sm" fw={500}>{rolloutPercent}%</Text>
          </div>
        </Group>

        {/* Rollout Progress (if not compact) */}
        {!compact && (
          <RolloutProgressBar
            percentage={rolloutPercent}
            status={rolloutStatus}
            showLabel={false}
            size="sm"
          />
        )}

        {/* Rejection Warning */}
        {isRejected && rejectionReason && (
          <div className={`${compact ? 'mt-2' : 'mt-3'} p-2 bg-red-50 rounded border border-red-200`}>
            <Text size="xs" c="red.7" lineClamp={compact ? 1 : 2}>
              <Text span fw={500}>{DISTRIBUTION_UI_LABELS.REJECTION_LABEL}:</Text> {rejectionReason}
            </Text>
          </div>
        )}

        {/* Timeline (if not compact) */}
        {!compact && (
          <div className="mt-3 pt-3 border-t">
            <SubmissionTimeline submission={submission} />
          </div>
        )}
      </Card>
    </CardWrapper>
  );
}

