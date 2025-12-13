/**
 * DistributionStatusPanel - Shows overall distribution progress
 * 
 * Features:
 * - Overall progress indicator
 * - Per-platform status summary
 * - Timeline of distribution stages
 */

import { Card, Group, Stack, Text, Badge, Progress, ThemeIcon, RingProgress } from '@mantine/core';
import { IconRocket, IconCheck, IconClock, IconX, IconAlertTriangle } from '@tabler/icons-react';
import { ReleaseStatus, Platform } from '~/types/distribution.types';
import { 
  RELEASE_STATUS_LABELS, 
  RELEASE_STATUS_COLORS,
  PLATFORM_LABELS,
} from '~/constants/distribution.constants';
import type { DistributionStatusPanelProps } from './distribution.types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusIcon(status: ReleaseStatus) {
  switch (status) {
    case ReleaseStatus.COMPLETED:
      return <IconCheck size={20} />;
    case ReleaseStatus.READY_FOR_SUBMISSION:
      return <IconRocket size={20} />;
    case ReleaseStatus.PRE_RELEASE:
      return <IconClock size={20} />;
    default:
      return <IconClock size={20} />;
  }
}

function getProgressColor(status: ReleaseStatus): string {
  switch (status) {
    case ReleaseStatus.COMPLETED:
      return 'green';
    case ReleaseStatus.READY_FOR_SUBMISSION:
      return 'cyan';
    case ReleaseStatus.PRE_RELEASE:
      return 'gray';
    default:
      return 'gray';
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PlatformProgressItem({ 
  platform, 
  submitted, 
  status, 
  percentage 
}: { 
  platform: Platform;
  submitted: boolean;
  status: string | null;
  percentage: number;
}) {
  const isComplete = percentage === 100;
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

function OverallProgress({ progress, status }: { progress: number; status: ReleaseStatus }) {
  const color = getProgressColor(status);
  
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
          {progress === 100 
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
            color={getProgressColor(releaseStatus)}
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
                percentage={platforms.android.exposurePercent}
              />
            )}
            {platforms.ios && (
              <PlatformProgressItem
                platform={Platform.IOS}
                submitted={platforms.ios.submitted}
                status={platforms.ios.status}
                percentage={platforms.ios.exposurePercent}
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

