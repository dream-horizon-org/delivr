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
} from '~/constants/distribution.constants';
import { DistributionStatus, Platform } from '~/types/distribution.types';
import type { DistributionStatusPanelProps } from './distribution.types';

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
  const statusColor = isComplete ? 'green' : submitted ? 'blue' : 'gray';
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <Group gap="sm">
        <ThemeIcon 
          size="sm" 
          radius="xl" 
          color={statusColor} 
          variant="light"
        >
          {isComplete ? <IconCheck size={12} /> : <IconClock size={12} />}
        </ThemeIcon>
        <div>
          <Text size="sm" fw={500}>{PLATFORM_LABELS[platform]}</Text>
          <Text size="xs" c="dimmed">
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
    <Group gap="lg" align="center">
      <RingProgress
        size={100}
        thickness={10}
        roundCaps
        sections={[{ value: progress, color }]}
        label={
          <Text ta="center" fz="lg" fw={700}>
            {progress}%
          </Text>
        }
      />
      
      <div>
        <Text fw={600} size="lg">Distribution Progress</Text>
        <Text c="dimmed" size="sm">
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

export function DistributionStatusPanel(props: DistributionStatusPanelProps) {
  const { status, isLoading, className } = props;

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
      padding="lg" 
      radius="md" 
      withBorder 
      className={className}
      data-testid="distribution-status-panel"
    >
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Group gap="sm">
          <ThemeIcon 
            size="lg" 
            radius="md" 
            variant="light" 
            color={RELEASE_STATUS_COLORS[releaseStatus]}
          >
            {getStatusIcon(releaseStatus)}
          </ThemeIcon>
          <div>
            <Text fw={600}>Distribution Status</Text>
            <Text size="xs" c="dimmed">
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
        >
          {RELEASE_STATUS_LABELS[releaseStatus]}
        </Badge>
      </Group>

      {/* Overall Progress */}
      <Stack gap="md">
        <OverallProgress progress={overallProgress} status={releaseStatus} />

        {/* Divider */}
        <div className="border-t my-2" />

        {/* Platform Breakdown */}
        <div>
          <Text fw={500} size="sm" mb="sm">Platform Status</Text>
          <Stack gap="sm">
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
            <Group gap="sm">
              <IconCheck size={16} className="text-green-600" />
              <Text size="sm" c="green.7">
                Distribution completed on {new Date(completedAt).toLocaleDateString()}
              </Text>
            </Group>
          </div>
        )}
      </Stack>
    </Card>
  );
}

