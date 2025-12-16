/**
 * SubmissionHistoryPanel - Timeline showing all state changes for a submission
 * 
 * Displays an audit trail of individual submission actions (e.g., PAUSED, RESUMED, 
 * HALTED, CANCELLED) from the `actionHistory` field in the submission entity.
 *
 * Data Source: submission.actionHistory array from GET /api/v1/distributions/:distributionId
 * and GET /api/v1/submissions/:submissionId
 * 
 * Features:
 * - Vertical timeline with state changes
 * - Shows actor (user or store)
 * - Shows timestamps
 * - Expandable details for complex changes
 * - Color-coded by status
 * - Only visible when actionHistory has entries
 * 
 * Required Backend:
 * - GET /api/v1/submissions/:submissionId/history
 * - Returns array of HistoryEvent objects with state changes
 */

import {
  Badge,
  Divider,
  Drawer,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
  Tooltip
} from '@mantine/core';
import {
  IconAlertOctagon,
  IconBuildingStore,
  IconChevronRight,
  IconClock,
  IconPlayerPause,
  IconTrendingUp,
  IconUser,
  IconX
} from '@tabler/icons-react';
import { useMemo } from 'react';
import {
  SUBMISSION_STATUS_COLORS
} from '~/constants/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';
import { SubmissionStatus, type Platform } from '~/types/distribution.types';

// ============================================================================
// TYPES
// ============================================================================

export type HistoryEvent = {
  id: string;
  timestamp: string; // ISO datetime
  action: string; // e.g., "Status Changed", "Rollout Updated", "Submitted"
  fromState?: string; // For state transitions
  toState?: string;
  actor: string; // Email or "Store" or "System"
  actorType: 'user' | 'store' | 'system';
  details?: Record<string, unknown>; // Additional metadata
  metadata?: {
    previousValue?: number | string;
    newValue?: number | string;
    reason?: string;
  };
};

export type SubmissionHistoryPanelProps = {
  opened: boolean;
  onClose: () => void;
  submissionId: string;
  platform: Platform;
  version: string;
  events: HistoryEvent[]; // Pass from parent (fetched from API)
  isLoading?: boolean;
};

// ============================================================================
// HELPERS
// ============================================================================

function getEventIcon(action: string, toState?: string) {
  // API actions are uppercase: PAUSED, RESUMED, CANCELLED, HALTED
  const upperAction = action.toUpperCase();
  if (upperAction.includes('PAUSED')) return <IconPlayerPause size={16} />;
  if (upperAction.includes('RESUMED')) return <IconTrendingUp size={16} />;
  if (upperAction.includes('HALTED')) return <IconAlertOctagon size={16} />;
  if (upperAction.includes('CANCELLED')) return <IconX size={16} />;
  return <IconClock size={16} />;
}

function getEventColor(action: string, toState?: string): string {
  // API actions are uppercase: PAUSED, RESUMED, CANCELLED, HALTED
  const upperAction = action.toUpperCase();
  if (upperAction.includes('RESUMED')) return DS_COLORS.STATUS.SUCCESS;
  if (upperAction.includes('HALTED')) return DS_COLORS.STATUS.ERROR;
  if (upperAction.includes('PAUSED')) return DS_COLORS.STATUS.WARNING;
  if (upperAction.includes('CANCELLED')) return DS_COLORS.STATUS.MUTED;
  if (toState) {
    const statusColors: Record<string, string> = SUBMISSION_STATUS_COLORS;
    return statusColors[toState as SubmissionStatus] || DS_COLORS.STATUS.MUTED;
  }
  return DS_COLORS.ACTION.PRIMARY;
}

function getActorIcon(actorType: 'user' | 'store' | 'system') {
  if (actorType === 'store') return <IconBuildingStore size={14} />;
  if (actorType === 'user') return <IconUser size={14} />;
  return <IconClock size={14} />;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

type EventItemProps = {
  event: HistoryEvent;
  isFirst: boolean;
};

function EventItem({ event, isFirst }: EventItemProps) {
  const color = getEventColor(event.action, event.toState);
  const icon = getEventIcon(event.action, event.toState);
  const actorIcon = getActorIcon(event.actorType);

  return (
    <Timeline.Item
      bullet={
        <ThemeIcon size={24} radius="xl" variant="light" color={color}>
          {icon}
        </ThemeIcon>
      }
      title={
        <Group gap={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={isFirst ? DS_TYPOGRAPHY.WEIGHT.SEMIBOLD : DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
            {event.action}
          </Text>
          {event.fromState && event.toState && (
            <Group gap={DS_SPACING.XXS}>
              <Badge size={DS_TYPOGRAPHY.SIZE.XS} variant="outline" radius={DS_SPACING.BORDER_RADIUS}>
                {event.fromState}
              </Badge>
              <IconChevronRight size={12} />
              <Badge size={DS_TYPOGRAPHY.SIZE.XS} variant="light" color={color} radius={DS_SPACING.BORDER_RADIUS}>
                {event.toState}
              </Badge>
            </Group>
          )}
        </Group>
      }
    >
      <Stack gap={DS_SPACING.XS} mt={DS_SPACING.XS}>
        {/* Actor & Timestamp */}
        <Group gap={DS_SPACING.XS}>
          <Group gap={DS_SPACING.XXS}>
            {actorIcon}
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
              {event.actor}
            </Text>
          </Group>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
            •
          </Text>
          <Tooltip label={new Date(event.timestamp).toLocaleString()}>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
              {formatTimestamp(event.timestamp)}
            </Text>
          </Tooltip>
        </Group>

        {/* Metadata (if available) */}
        {event.metadata && (
          <Paper p={DS_SPACING.XS} radius={DS_SPACING.BORDER_RADIUS} bg={DS_COLORS.BACKGROUND.SUBTLE} withBorder>
            <Stack gap={DS_SPACING.XXS}>
              {event.metadata.previousValue !== undefined && event.metadata.newValue !== undefined && (
                <Text size={DS_TYPOGRAPHY.SIZE.XS}>
                  <Text span c={DS_COLORS.TEXT.MUTED}>Changed from </Text>
                  <Text span fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>{event.metadata.previousValue}</Text>
                  <Text span c={DS_COLORS.TEXT.MUTED}> to </Text>
                  <Text span fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>{event.metadata.newValue}</Text>
                </Text>
              )}
              {event.metadata.reason && (
                <Text size={DS_TYPOGRAPHY.SIZE.XS}>
                  <Text span c={DS_COLORS.TEXT.MUTED}>Reason: </Text>
                  <Text span>{event.metadata.reason}</Text>
                </Text>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Timeline.Item>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmissionHistoryPanel({
  opened,
  onClose,
  submissionId,
  platform,
  version,
  events,
  isLoading = false,
}: SubmissionHistoryPanelProps) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [events]);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Stack gap={DS_SPACING.XXS}>
          <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} size={DS_TYPOGRAPHY.SIZE.LG}>Submission History</Text>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
            {platform} • Version {version}
          </Text>
        </Stack>
      }
      position="right"
      size="lg"
      padding={DS_SPACING.MD}
    >
      <Stack gap={DS_SPACING.LG}>
        {/* Submission ID */}
        <Paper p={DS_SPACING.SM} radius={DS_SPACING.BORDER_RADIUS} bg={DS_COLORS.BACKGROUND.SUBTLE} withBorder>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} mb={DS_SPACING.XXS}>Submission ID</Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} ff="monospace">{submissionId}</Text>
        </Paper>

        <Divider />

        {/* Timeline */}
        {isLoading ? (
          <Stack align="center" gap={DS_SPACING.MD} p={DS_SPACING.XL}>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>Loading history...</Text>
          </Stack>
        ) : sortedEvents.length === 0 ? (
          <Stack align="center" gap={DS_SPACING.MD} p={DS_SPACING.XL}>
            <ThemeIcon size={48} radius="xl" variant="light" color={DS_COLORS.STATUS.MUTED}>
              <IconClock size={24} />
            </ThemeIcon>
            <div style={{ textAlign: 'center' }}>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} mb={DS_SPACING.XXS}>No History Yet</Text>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                Events will appear here as the submission progresses
              </Text>
            </div>
          </Stack>
        ) : (
          <Timeline active={sortedEvents.length} bulletSize={24} lineWidth={2}>
            {sortedEvents.map((event, index) => (
              <EventItem
                key={event.id}
                event={event}
                isFirst={index === 0}
              />
            ))}
          </Timeline>
        )}
      </Stack>
    </Drawer>
  );
}

