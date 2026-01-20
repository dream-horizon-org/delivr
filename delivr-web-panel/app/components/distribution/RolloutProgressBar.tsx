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
import {
    DIST_FONT_WEIGHTS,
    DIST_ICON_SIZES,
    DS_COLORS,
    DS_SPACING,
    DS_TYPOGRAPHY
} from '~/constants/distribution/distribution-design.constants';
import { PROGRESS_BAR_HEIGHTS } from '~/constants/distribution/distribution.constants';
import { RolloutDisplayStatus } from '~/types/distribution/distribution.types';
import { getRolloutStatusColor, getRolloutStatusLabel } from '~/utils/distribution';
import type { RolloutProgressBarProps } from '~/types/distribution/distribution-component.types';

// ============================================================================
// LOCAL HELPER (returns JSX, must stay in component file)
// ============================================================================

function getStatusIcon(status: RolloutDisplayStatus) {
  const iconMap: Record<RolloutDisplayStatus, React.ReactNode> = {
    [RolloutDisplayStatus.COMPLETE]: <IconCheck size={DIST_ICON_SIZES.SM} />,
    [RolloutDisplayStatus.ACTIVE]: <IconTrendingUp size={DIST_ICON_SIZES.SM} />,
    [RolloutDisplayStatus.PAUSED]: <IconPlayerPause size={DIST_ICON_SIZES.SM} />,
    [RolloutDisplayStatus.HALTED]: <IconAlertOctagon size={DIST_ICON_SIZES.SM} />,
  };
  return iconMap[status];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RolloutProgressBar({ 
  percentage, 
  targetPercentage,
  status, 
  showLabel = true,
  size = 'md',
  className,
}: RolloutProgressBarProps) {

  const color = getRolloutStatusColor(status);
  const height = PROGRESS_BAR_HEIGHTS[size];
  const isAnimated = status === RolloutDisplayStatus.ACTIVE && targetPercentage !== undefined && targetPercentage > percentage;

  return (
    <div className={className} data-testid="rollout-progress-bar">
      {/* Label */}
      {showLabel && (
        <Group justify="space-between" mb={DS_SPACING.XS}>
          <Group gap={DS_SPACING.XS}>
            <ThemeIcon size="xs" color={color} variant="light" radius="xl">
              {getStatusIcon(status)}
            </ThemeIcon>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}>
              Rollout - {getRolloutStatusLabel(status)}
            </Text>
          </Group>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.SEMIBOLD}>
            {percentage}%
            {targetPercentage && targetPercentage !== percentage && (
              <Text span size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}> → {targetPercentage}%</Text>
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
        <Group justify="space-between" mt={DS_SPACING.XS}>
          {[0, 25, 50, 75, 100].map((milestone) => (
            <Text 
              key={milestone} 
              size={DS_TYPOGRAPHY.SIZE.XS}
              c={percentage >= milestone ? color : DS_COLORS.TEXT.SECONDARY}
              fw={percentage >= milestone ? DIST_FONT_WEIGHTS.MEDIUM : DIST_FONT_WEIGHTS.NORMAL}
            >
              {milestone}%
            </Text>
          ))}
        </Group>
      )}
    </div>
  );
}

