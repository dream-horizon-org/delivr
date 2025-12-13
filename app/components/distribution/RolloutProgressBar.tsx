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
import type { RolloutProgressBarProps, RolloutStatus, SizeVariant } from './distribution.types';
import { getRolloutStatusColor, getRolloutStatusLabel } from './distribution.utils';

// ============================================================================
// LOCAL HELPERS - Returns JSX or component-specific (must stay here)
// ============================================================================

function getStatusIcon(status: RolloutStatus) {
  const iconMap: Record<RolloutStatus, React.ReactNode> = {
    complete: <IconCheck size={14} />,
    active: <IconTrendingUp size={14} />,
    paused: <IconPlayerPause size={14} />,
    halted: <IconAlertOctagon size={14} />,
  };
  return iconMap[status];
}

function getProgressHeight(size: SizeVariant = 'md'): number {
  const heightMap: Record<SizeVariant, number> = {
    sm: 6,
    md: 10,
    lg: 16,
  };
  return heightMap[size];
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
  const height = getProgressHeight(size);
  const isAnimated = status === 'active' && targetPercentage !== undefined && targetPercentage > percentage;

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
        striped={status === 'paused'}
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

