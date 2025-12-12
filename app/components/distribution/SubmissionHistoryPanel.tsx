/**
 * SubmissionHistoryPanel - Timeline of submission events
 * 
 * Features:
 * - Chronological event timeline
 * - Event type icons and colors
 * - Actor and reason info
 * - Load more pagination
 */

import { Badge, Button, Card, Group, Stack, Text, ThemeIcon, Timeline } from '@mantine/core';
import {
  IconAlertOctagon,
  IconCheck,
  IconHistory,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconSend,
  IconTrendingUp,
  IconX,
} from '@tabler/icons-react';
import type { SubmissionHistoryEvent } from '~/types/distribution.types';
import { SubmissionHistoryEventType } from '~/types/distribution.types';
import type { SubmissionHistoryPanelProps } from './distribution.types';
import {
  formatDateTime,
  getEventColor,
  getEventLabel,
  getRolloutPercentageDisplay,
} from './distribution.utils';

// ============================================================================
// LOCAL HELPER - Icon mapping (returns JSX, must stay in component file)
// ============================================================================

function getEventIcon(eventType: SubmissionHistoryEventType) {
  const iconMap: Record<SubmissionHistoryEventType, React.ReactNode> = {
    SUBMITTED: <IconSend size={14} />,
    APPROVED: <IconCheck size={14} />,
    REJECTED: <IconX size={14} />,
    ROLLOUT_UPDATED: <IconTrendingUp size={14} />,
    ROLLOUT_PAUSED: <IconPlayerPause size={14} />,
    ROLLOUT_RESUMED: <IconPlayerPlay size={14} />,
    ROLLOUT_HALTED: <IconAlertOctagon size={14} />,
    RETRY_ATTEMPTED: <IconRefresh size={14} />,
    STATUS_CHANGED: <IconHistory size={14} />,
  };
  return iconMap[eventType] ?? <IconHistory size={14} />;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

type EventItemProps = {
  event: SubmissionHistoryEvent;
};

function EventItem({ event }: EventItemProps) {
  const color = getEventColor(event.eventType);
  
  return (
    <Timeline.Item
      bullet={
        <ThemeIcon size={24} radius="xl" color={color} variant="light">
          {getEventIcon(event.eventType)}
        </ThemeIcon>
      }
      title={
        <Group gap="xs">
          <Text size="sm" fw={500}>{getEventLabel(event.eventType)}</Text>
          <Badge size="xs" color={color} variant="light">
            {event.eventType}
          </Badge>
        </Group>
      }
    >
      <Stack gap={4} mt={4}>
        {/* Timestamp */}
        <Text size="xs" c="dimmed">
          {formatDateTime(event.timestamp)}
        </Text>

        {/* Actor */}
        {event.actor && (
          <Text size="xs">
            <Text span c="dimmed">By:</Text> {event.actor.name}
            {event.actor.role && (
              <Text span c="dimmed"> ({event.actor.role})</Text>
            )}
          </Text>
        )}

        {/* Reason */}
        {event.reason && (
          <Text size="xs">
            <Text span c="dimmed">Reason:</Text> {event.reason}
          </Text>
        )}

        {/* State Change */}
        {event.eventType === SubmissionHistoryEventType.ROLLOUT_UPDATED && event.newState && (
          <Text size="xs">
            <Text span c="dimmed">New percentage:</Text>{' '}
            {getRolloutPercentageDisplay(event.newState)}
          </Text>
        )}
      </Stack>
    </Timeline.Item>
  );
}

function EmptyState() {
  return (
    <Stack align="center" py="xl">
      <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
        <IconHistory size={24} />
      </ThemeIcon>
      <Text c="dimmed" size="sm">No history events yet</Text>
    </Stack>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmissionHistoryPanel(props: SubmissionHistoryPanelProps) {
  const { 
    events, 
    hasMore,
    isLoadingMore,
    onLoadMore,
    className,
  } = props;

  const hasEvents = events.length > 0;

  return (
    <Card 
      shadow="sm" 
      padding="lg" 
      radius="md" 
      withBorder 
      className={className}
      data-testid="submission-history-panel"
    >
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color="violet">
            <IconHistory size={20} />
          </ThemeIcon>
          <div>
            <Text fw={600}>Event History</Text>
            <Text size="xs" c="dimmed">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </Text>
          </div>
        </Group>
      </Group>

      {/* Timeline */}
      {hasEvents ? (
        <Timeline active={0} bulletSize={24} lineWidth={2}>
          {events.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </Timeline>
      ) : (
        <EmptyState />
      )}

      {/* Load More */}
      {hasMore && onLoadMore && (
        <Group justify="center" mt="md">
          <Button
            variant="light"
            size="sm"
            onClick={onLoadMore}
            loading={isLoadingMore}
          >
            Load More
          </Button>
        </Group>
      )}
    </Card>
  );
}

