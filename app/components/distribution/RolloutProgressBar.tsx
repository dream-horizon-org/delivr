/**
 * RolloutProgressBar - Visual rollout percentage indicator
 * 
 * Features:
 * - Animated progress bar
 * - Status-based colors
 * - Percentage label
 */

import { Group, Progress, Text, ThemeIcon } from '@mantine/core';
import { IconAlertOctagon, IconCheck, IconPlayerPause, IconTrendingUp } from '@tabler/icons-react';
import { PROGRESS_BAR_HEIGHTS } from '~/constants/distribution.constants';
import { RolloutDisplayStatus } from '~/types/distribution.types';
import type { RolloutProgressBarProps } from './distribution.types';
import { getRolloutStatusColor, getRolloutStatusLabel } from './distribution.utils';

// ============================================================================
// LOCAL HELPER (returns JSX, must stay in component file)
// ============================================================================

function getStatusIcon(status: RolloutDisplayStatus) {
  const iconMap: Record<RolloutDisplayStatus, React.ReactNode> = {
    [RolloutDisplayStatus.COMPLETE]: <IconCheck size={14} />,
    [RolloutDisplayStatus.ACTIVE]: <IconTrendingUp size={14} />,
    [RolloutDisplayStatus.PAUSED]: <IconPlayerPause size={14} />,
    [RolloutDisplayStatus.HALTED]: <IconAlertOctagon size={14} />,
  };
  return iconMap[status];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RolloutProgressBar(props: RolloutProgressBarProps) {
  const { 
    percentage, 
    targetPercentage,
    status, 
    showLabel = true,
    size = 'md',
    className,
  } = props;

  const color = getRolloutStatusColor(status);
  const height = PROGRESS_BAR_HEIGHTS[size];
  const isAnimated = status === RolloutDisplayStatus.ACTIVE && targetPercentage !== undefined && targetPercentage > percentage;

  return (
    <div className={className} data-testid="rollout-progress-bar">
      {/* Label */}
      {showLabel && (
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <ThemeIcon size="xs" color={color} variant="light" radius="xl">
              {getStatusIcon(status)}
            </ThemeIcon>
            <Text size="xs" c="dimmed">
              Rollout - {getRolloutStatusLabel(status)}
            </Text>
          </Group>
          <Text size="sm" fw={600}>
            {percentage}%
            {targetPercentage && targetPercentage !== percentage && (
              <Text span size="xs" c="dimmed"> → {targetPercentage}%</Text>
            )}
          </Text>
        </Group>
      )}

      {/* Progress Bar */}
      <Progress
        value={percentage}
        color={color}
        size={height}
        radius="xl"
        animated={isAnimated}
        striped={status === RolloutDisplayStatus.PAUSED}
      />

      {/* Milestone Markers */}
      {size !== 'sm' && (
        <Group justify="space-between" mt={4}>
          {[0, 25, 50, 75, 100].map((milestone) => (
            <Text 
              key={milestone} 
              size="xs" 
              c={percentage >= milestone ? color : 'dimmed'}
              fw={percentage >= milestone ? 500 : 400}
            >
              {milestone}%
            </Text>
          ))}
        </Group>
      )}
    </div>
  );
}

