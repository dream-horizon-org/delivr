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
  IconX,
} from '@tabler/icons-react';
import {
  PLATFORM_LABELS,
  SUBMISSION_STATUS_COLORS,
  SUBMISSION_STATUS_LABELS,
} from '~/constants/distribution.constants';
import { Platform, SubmissionStatus } from '~/types/distribution.types';
import { RolloutProgressBar } from './RolloutProgressBar';
import type { SubmissionCardProps } from './distribution.types';
import { getRolloutDisplayStatus } from './distribution.utils';

// ============================================================================
// LOCAL HELPER - Returns JSX (must stay in component file)
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
      {isAndroid ? <IconBrandAndroid size={18} /> : <IconBrandApple size={18} />}
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
          <Text size="xs" c="dimmed" w={70}>Submitted:</Text>
          <Text size="xs">{new Date(submittedAt).toLocaleDateString()}</Text>
        </Group>
      )}
      {approvedAt && (
        <Group gap="xs">
          <Text size="xs" c="dimmed" w={70}>Approved:</Text>
          <Text size="xs">{new Date(approvedAt).toLocaleDateString()}</Text>
        </Group>
      )}
      {releasedAt && (
        <Group gap="xs">
          <Text size="xs" c="dimmed" w={70}>Released:</Text>
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
    exposurePercent,
    rejectionReason,
  } = submission;

  const isRejected = submissionStatus === SubmissionStatus.REJECTED;
  const storeName = platform === Platform.ANDROID ? 'Play Store' : 'App Store';

  const CardWrapper = onClick ? UnstyledButton : 'div';

  return (
    <CardWrapper 
      onClick={onClick}
      className={`w-full ${onClick ? 'hover:bg-gray-50 transition-colors' : ''}`}
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
              <IconChevronRight size={16} className="text-gray-400" />
            )}
          </Group>
        </Group>

        {/* Version Info */}
        <Group gap="lg" mb={compact ? 'sm' : 'md'}>
          <div>
            <Text size="xs" c="dimmed">Version</Text>
            <Text size="sm" fw={500}>{versionName}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Build</Text>
            <Text size="sm" fw={500}>{versionCode}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Exposure</Text>
            <Text size="sm" fw={500}>{exposurePercent}%</Text>
          </div>
        </Group>

        {/* Rollout Progress (if not compact) */}
        {!compact && (
          <RolloutProgressBar
            percentage={exposurePercent}
            status={getRolloutDisplayStatus(exposurePercent, submissionStatus)}
            showLabel={false}
            size="sm"
          />
        )}

        {/* Rejection Warning */}
        {isRejected && rejectionReason && (
          <div className={`${compact ? 'mt-2' : 'mt-3'} p-2 bg-red-50 rounded border border-red-200`}>
            <Text size="xs" c="red.7" lineClamp={compact ? 1 : 2}>
              <Text span fw={500}>Rejection:</Text> {rejectionReason}
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

