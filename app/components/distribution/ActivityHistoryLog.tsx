/**
 * Activity History Log - Audit trail for manual submission actions
 * Displays actions like PAUSED, RESUMED, CANCELLED, HALTED with reasons
 */

import {
    Badge,
    Group,
    Paper,
    Stack,
    Text,
    Timeline
} from '@mantine/core';
import {
    IconAlertTriangle,
    IconPlayerPause,
    IconPlayerPlay,
    IconTrendingUp,
    IconX,
} from '@tabler/icons-react';
import {
    DIST_BADGE_PROPS,
    DIST_CARD_PROPS,
    DIST_FONT_WEIGHTS,
    DIST_ICON_SIZES,
    DS_COLORS,
    DS_SPACING,
    DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';
import type { ActionHistoryEntry } from '~/types/distribution.types';
import { formatDateTime } from '~/utils/distribution-ui.utils';

export interface ActivityHistoryLogProps {
  actionHistory: ActionHistoryEntry[];
}

function getActionIcon(action: ActionHistoryEntry['action']) {
  switch (action) {
    case 'PAUSED':
      return <IconPlayerPause size={DIST_ICON_SIZES.MD} className="text-orange-600" />;
    case 'RESUMED':
      return <IconPlayerPlay size={DIST_ICON_SIZES.MD} className="text-green-600" />;
    case 'CANCELLED':
      return <IconX size={DIST_ICON_SIZES.MD} className="text-gray-600" />;
    case 'HALTED':
      return <IconAlertTriangle size={DIST_ICON_SIZES.MD} className="text-red-600" />;
    case 'UPDATE_ROLLOUT':
      return <IconTrendingUp size={DIST_ICON_SIZES.MD} className="text-blue-600" />;
  }
}

function getActionColor(action: ActionHistoryEntry['action']): string {
  switch (action) {
    case 'PAUSED':
      return DS_COLORS.STATUS.WARNING;
    case 'RESUMED':
      return DS_COLORS.STATUS.SUCCESS;
    case 'CANCELLED':
      return DS_COLORS.STATUS.MUTED;
    case 'HALTED':
      return DS_COLORS.STATUS.ERROR;
    case 'UPDATE_ROLLOUT':
      return DS_COLORS.STATUS.INFO;
  }
}

function getActionLabel(action: ActionHistoryEntry['action']): string {
  switch (action) {
    case 'PAUSED':
      return 'Rollout Paused';
    case 'RESUMED':
      return 'Rollout Resumed';
    case 'CANCELLED':
      return 'Submission Cancelled';
    case 'HALTED':
      return 'Halted';
    case 'UPDATE_ROLLOUT':
      return 'Rollout Updated';
  }
}

function getActionBadgeText(action: ActionHistoryEntry['action']): string {
  switch (action) {
    case 'PAUSED':
      return 'PAUSED';
    case 'RESUMED':
      return 'RESUMED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'HALTED':
      return 'HALTED';
    case 'UPDATE_ROLLOUT':
      return 'ROLLOUT ADJUSTED';
  }
}

export function ActivityHistoryLog({ actionHistory }: ActivityHistoryLogProps) {
  if (actionHistory.length === 0) {
    return null;
  }

  // Sort by createdAt descending (newest first)
  const sortedHistory = [...actionHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Timeline active={-1} bulletSize={32} lineWidth={2}>
      {sortedHistory.map((entry, index) => (
        <Timeline.Item
          key={`${entry.action}-${entry.createdAt}-${index}`}
          bullet={
            <div className="flex items-center justify-center w-full h-full">
              {getActionIcon(entry.action)}
            </div>
          }
          title={
            <Group gap={DS_SPACING.SM} mb={DS_SPACING.XS}>
              <Badge
                {...DIST_BADGE_PROPS.DEFAULT}
                color={getActionColor(entry.action)}
              >
                {getActionBadgeText(entry.action)}
              </Badge>
            </Group>
          }
        >
          <Paper {...DIST_CARD_PROPS.COMPACT} className="bg-gray-50 mb-4" p={DS_SPACING.MD}>
            <Stack gap={DS_SPACING.SM}>
              {/* Timestamp */}
              <Group gap={DS_SPACING.MD}>
                <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}>
                  <strong>When:</strong> {formatDateTime(entry.createdAt)}
                </Text>
              </Group>

              {/* Performed By */}
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}>
                <strong>By:</strong> {entry.createdBy}
              </Text>

              {/* Rollout Change (for UPDATE_ROLLOUT) */}
              {entry.action === 'UPDATE_ROLLOUT' && entry.previousRolloutPercentage !== undefined && (
                <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}>
                  <strong>Rollout Change:</strong> {entry.previousRolloutPercentage}% → {entry.newRolloutPercentage}%
                </Text>
              )}

              {/* Reason */}
              {entry.reason && (
                <Paper {...DIST_CARD_PROPS.NESTED} className="bg-white">
                  <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.MEDIUM} mb={DS_SPACING.XS}>
                    Reason:
                  </Text>
                  <Text size={DS_TYPOGRAPHY.SIZE.SM} className="whitespace-pre-wrap">
                    {entry.reason}
                  </Text>
                </Paper>
              )}
            </Stack>
          </Paper>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}

