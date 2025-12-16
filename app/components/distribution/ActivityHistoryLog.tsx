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
import type { ActionHistoryEntry } from '~/types/distribution.types';
import { formatDateTime } from '~/utils/distribution-ui.utils';

export interface ActivityHistoryLogProps {
  actionHistory: ActionHistoryEntry[];
}

function getActionIcon(action: ActionHistoryEntry['action']) {
  switch (action) {
    case 'PAUSED':
      return <IconPlayerPause size={16} className="text-orange-600" />;
    case 'RESUMED':
      return <IconPlayerPlay size={16} className="text-green-600" />;
    case 'CANCELLED':
      return <IconX size={16} className="text-gray-600" />;
    case 'HALTED':
      return <IconAlertTriangle size={16} className="text-red-600" />;
    case 'UPDATE_ROLLOUT':
      return <IconTrendingUp size={16} className="text-blue-600" />;
  }
}

function getActionColor(action: ActionHistoryEntry['action']): string {
  switch (action) {
    case 'PAUSED':
      return 'orange';
    case 'RESUMED':
      return 'green';
    case 'CANCELLED':
      return 'gray';
    case 'HALTED':
      return 'red';
    case 'UPDATE_ROLLOUT':
      return 'blue';
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
            <Group gap="sm" mb="xs">
              <Badge
                size="md"
                color={getActionColor(entry.action)}
                variant="light"
                radius="sm"
              >
                {getActionBadgeText(entry.action)}
              </Badge>
            </Group>
          }
        >
          <Paper p="md" radius="md" withBorder className="bg-gray-50 mb-4">
            <Stack gap="sm">
              {/* Timestamp */}
              <Group gap="md">
                <Text size="xs" c="dimmed">
                  <strong>When:</strong> {formatDateTime(entry.createdAt)}
                </Text>
              </Group>

              {/* Performed By */}
              <Text size="xs" c="dimmed">
                <strong>By:</strong> {entry.createdBy}
              </Text>

              {/* Rollout Change (for UPDATE_ROLLOUT) */}
              {entry.action === 'UPDATE_ROLLOUT' && entry.previousRolloutPercentage !== undefined && (
                <Text size="xs" c="dimmed">
                  <strong>Rollout Change:</strong> {entry.previousRolloutPercentage}% → {entry.newRolloutPercentage}%
                </Text>
              )}

              {/* Reason */}
              {entry.reason && (
                <Paper p="sm" radius="sm" withBorder className="bg-white">
                  <Text size="sm" fw={500} mb={4}>
                    Reason:
                  </Text>
                  <Text size="sm" className="whitespace-pre-wrap">
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

