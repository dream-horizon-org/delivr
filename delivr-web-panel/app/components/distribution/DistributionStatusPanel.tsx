/**
 * DistributionStatusPanel - Shows overall distribution progress
 * 
 * Features:
 * - Overall progress indicator
 * - Per-platform status summary
 * - Timeline of distribution stages
 */

import { Badge, Card, Group, RingProgress, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck, IconClock, IconRocket } from '@tabler/icons-react';
import {
    PLATFORM_LABELS,
    RELEASE_STATUS_COLORS,
    RELEASE_STATUS_LABELS,
    ROLLOUT_COMPLETE_PERCENT,
} from '~/constants/distribution/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import { DistributionStatus, Platform } from '~/types/distribution/distribution.types';
import type { DistributionStatusPanelProps } from '~/types/distribution/distribution-component.types';

// ============================================================================
// LOCAL HELPER (returns JSX, must stay in component file)
// ============================================================================

function getStatusIcon(status: DistributionStatus) {
  switch (status) {
    case DistributionStatus.PENDING:
      return <IconClock size={20} />;
    case DistributionStatus.PARTIALLY_SUBMITTED:
    case DistributionStatus.SUBMITTED:
    case DistributionStatus.PARTIALLY_RELEASED:
      return <IconRocket size={20} />;
    case DistributionStatus.RELEASED:
      return <IconCheck size={20} />;
    default:
      return <IconClock size={20} />;
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

type PlatformProgressItemProps = {
  platform: Platform;
  submitted: boolean;
  status: string | null;
  percentage: number;
};

function PlatformProgressItem({ 
  platform, 
  submitted, 
  status, 
  percentage 
}: PlatformProgressItemProps) {
  const isComplete = percentage === ROLLOUT_COMPLETE_PERCENT;
  
  // Determine status color based on submission state
  const getStatusColor = () => {
    if (isComplete) return DS_COLORS.STATUS.SUCCESS;
    if (submitted) return DS_COLORS.ACTION.PRIMARY;
    return DS_COLORS.STATUS.MUTED;
  };
  const statusColor = getStatusColor();
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <Group gap={DS_SPACING.SM}>
        <ThemeIcon 
          size="sm" 
          radius="xl" 
          color={statusColor} 
          variant="light"
        >
          {isComplete ? <IconCheck size={12} /> : <IconClock size={12} />}
        </ThemeIcon>
        <div>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>{PLATFORM_LABELS[platform]}</Text>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
            {submitted ? status ?? 'Submitted' : 'Not submitted'}
          </Text>
        </div>
      </Group>
      
      <Badge color={statusColor} variant="light" size="sm">
        {percentage}%
      </Badge>
    </div>
  );
}

type OverallProgressProps = {
  progress: number;
  status: DistributionStatus;
};

function OverallProgress({ progress, status }: OverallProgressProps) {
  const color = RELEASE_STATUS_COLORS[status];
  
  return (
    <Group gap={DS_SPACING.LG} align="center">
      <RingProgress
        size={100}
        thickness={10}
        roundCaps
        sections={[{ value: progress, color }]}
        label={
          <Text ta="center" fz={DS_TYPOGRAPHY.SIZE.LG} fw={DS_TYPOGRAPHY.WEIGHT.BOLD}>
            {progress}%
          </Text>
        }
      />
      
      <div>
        <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} size={DS_TYPOGRAPHY.SIZE.LG}>Distribution Progress</Text>
        <Text c={DS_COLORS.TEXT.MUTED} size={DS_TYPOGRAPHY.SIZE.SM}>
          {progress === ROLLOUT_COMPLETE_PERCENT 
            ? 'Distribution complete!' 
            : progress > 0 
              ? 'Distribution in progress...'
              : 'Ready to distribute'
          }
        </Text>
      </div>
    </Group>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DistributionStatusPanel({ status, isLoading, className }: DistributionStatusPanelProps) {

  const { 
    releaseStatus, 
    platforms, 
    overallProgress, 
    isComplete,
    startedAt,
    completedAt,
  } = status;

  return (
    <Card 
      shadow="sm" 
      padding={DS_SPACING.LG}
      radius={DS_SPACING.BORDER_RADIUS}
      withBorder 
      className={className}
      data-testid="distribution-status-panel"
    >
      {/* Header */}
      <Group justify="space-between" mb={DS_SPACING.LG}>
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon 
            size="lg" 
            radius={DS_SPACING.BORDER_RADIUS}
            variant="light" 
            color={RELEASE_STATUS_COLORS[releaseStatus]}
          >
            {getStatusIcon(releaseStatus)}
          </ThemeIcon>
          <div>
            <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>Distribution Status</Text>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
              {startedAt 
                ? `Started ${new Date(startedAt).toLocaleDateString()}`
                : 'Not started'
              }
            </Text>
          </div>
        </Group>
        
        <Badge 
          color={RELEASE_STATUS_COLORS[releaseStatus]} 
          variant="light"
          size="lg"
          radius={DS_SPACING.BORDER_RADIUS}
        >
          {RELEASE_STATUS_LABELS[releaseStatus]}
        </Badge>
      </Group>

      {/* Overall Progress */}
      <Stack gap={DS_SPACING.MD}>
        <OverallProgress progress={overallProgress} status={releaseStatus} />

        {/* Divider */}
        <div className="border-t my-2" />

        {/* Platform Breakdown */}
        <div>
          <Text fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} size={DS_TYPOGRAPHY.SIZE.SM} mb={DS_SPACING.SM}>Platform Status</Text>
          <Stack gap={DS_SPACING.SM}>
            {platforms.android && (
              <PlatformProgressItem
                platform={Platform.ANDROID}
                submitted={platforms.android.submitted}
                status={platforms.android.status}
                percentage={platforms.android.rolloutPercentage}
              />
            )}
            {platforms.ios && (
              <PlatformProgressItem
                platform={Platform.IOS}
                submitted={platforms.ios.submitted}
                status={platforms.ios.status}
                percentage={platforms.ios.rolloutPercentage}
              />
            )}
          </Stack>
        </div>

        {/* Completion Info */}
        {isComplete && completedAt && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <Group gap={DS_SPACING.SM}>
              <IconCheck size={16} style={{ color: DS_COLORS.STATUS.SUCCESS }} />
              <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.STATUS.SUCCESS}>
                Distribution completed on {new Date(completedAt).toLocaleDateString()}
              </Text>
            </Group>
          </div>
        )}
      </Stack>
    </Card>
  );
}

