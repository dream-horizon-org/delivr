/**
 * ActivityLogsContent Component
 * 
 * Core logic component for displaying activity logs with clean diff formatting
 * Handles parsing of previousValue/newValue and displays changes in readable format
 */

import { Badge, Group, Stack, Text, Timeline, ThemeIcon } from '@mantine/core';
import {
  IconCheck,
  IconClock,
  IconEdit,
  IconHistory,
  IconPlayerPause,
  IconPlayerPlay,
  IconSettings,
  IconTag,
  IconX,
} from '@tabler/icons-react';
import type { ActivityLog } from '~/types/release-process.types';

interface ActivityLogsContentProps {
  activityLogs: ActivityLog[];
}

/**
 * Format activity change into readable diff format
 * Handles backend activity types: RELEASE, PLATFORM_TARGET, REGRESSION, CRONCONFIG, PAUSE_RELEASE, RESUME_RELEASE, REGRESSION_STAGE_APPROVAL
 */
function formatActivityChange(log: ActivityLog): string {
  const { type, previousValue, newValue } = log;

  // Handle null values
  if (!previousValue && !newValue) {
    return 'Activity recorded';
  }

  // Handle different activity types based on backend structure
  switch (type) {
    case 'RELEASE':
      // Release field changes
      if (previousValue && newValue) {
        const fields = Object.keys(newValue);
        if (fields.length > 0) {
          const changes = fields.map(field => {
            const oldVal = previousValue[field];
            const newVal = newValue[field];
            if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
              return `${field}: ${oldVal || 'N/A'} → ${newVal || 'N/A'}`;
            }
            return null;
          }).filter(Boolean);
          if (changes.length > 0) {
            return changes.join(', ');
          }
        }
        // Fallback: show status if available
        if (previousValue.status && newValue.status) {
          return `Status: ${previousValue.status} → ${newValue.status}`;
        }
      }
      if (newValue && !previousValue) {
        return `Release ${newValue.status || 'created'}`;
      }
      if (previousValue && !newValue) {
        return 'Release removed';
      }
      break;

    case 'PLATFORM_TARGET':
      if (previousValue && newValue) {
        const oldPlatform = previousValue.platform || 'N/A';
        const oldTarget = previousValue.target || 'N/A';
        const newPlatform = newValue.platform || 'N/A';
        const newTarget = newValue.target || 'N/A';
        return `Platform Target: ${oldPlatform}/${oldTarget} → ${newPlatform}/${newTarget}`;
      }
      if (newValue && !previousValue) {
        const platform = newValue.platform || 'N/A';
        const target = newValue.target || 'N/A';
        return `Added Platform Target: ${platform}/${target}`;
      }
      if (previousValue && !newValue) {
        const platform = previousValue.platform || 'N/A';
        const target = previousValue.target || 'N/A';
        return `Removed Platform Target: ${platform}/${target}`;
      }
      break;

    case 'REGRESSION':
      if (previousValue && newValue) {
        const oldStatus = previousValue.status || 'N/A';
        const newStatus = newValue.status || 'N/A';
        return `Regression: ${oldStatus} → ${newStatus}`;
      }
      if (newValue && !previousValue) {
        return `Regression ${newValue.status || 'started'}`;
      }
      if (previousValue && !newValue) {
        return 'Regression removed';
      }
      break;

    case 'CRONCONFIG':
      if (previousValue && newValue) {
        return 'Cron Config updated';
      }
      if (newValue && !previousValue) {
        return 'Cron Config set';
      }
      if (previousValue && !newValue) {
        return 'Cron Config removed';
      }
      break;

    case 'PAUSE_RELEASE':
      if (newValue?.reason) {
        return `Release paused: ${newValue.reason}`;
      }
      return 'Release paused';

    case 'RESUME_RELEASE':
      return 'Release resumed';

    case 'REGRESSION_STAGE_APPROVAL':
      if (newValue) {
        const approvedBy = newValue.approvedBy || newValue.updatedBy || 'Unknown';
        return `Regression stage approved by ${approvedBy}`;
      }
      if (previousValue) {
        return 'Regression stage approval removed';
      }
      break;
  }

  // Fallback for unknown types or legacy types
  if (previousValue && newValue) {
    // Try to detect common patterns
    if (previousValue.status && newValue.status) {
      return `Status: ${previousValue.status} → ${newValue.status}`;
    }
    if (previousValue.field && newValue.field && previousValue.field === newValue.field) {
      return `${previousValue.field}: ${previousValue.value || 'N/A'} → ${newValue.value || 'N/A'}`;
    }
    if (previousValue.taskId && newValue.taskId && previousValue.taskId === newValue.taskId) {
      const taskType = newValue.taskType || previousValue.taskType || 'Task';
      const oldStatus = previousValue.status || 'N/A';
      const newStatus = newValue.status || 'N/A';
      return `Task ${taskType}: ${oldStatus} → ${newStatus}`;
    }
    if (previousValue.cronStatus && newValue.cronStatus) {
      const reason = newValue.reason ? ` (${newValue.reason})` : '';
      return `Cron Status: ${previousValue.cronStatus} → ${newValue.cronStatus}${reason}`;
    }
    // Last resort: show JSON (truncated if too long)
    const prevStr = JSON.stringify(previousValue);
    const newStr = JSON.stringify(newValue);
    if (prevStr.length + newStr.length > 100) {
      return 'Activity updated';
    }
    return `${prevStr} → ${newStr}`;
  }
  
  if (newValue && !previousValue) {
    // New value only
    if (newValue.field) {
      return `${newValue.field}: ${newValue.value || 'N/A'}`;
    }
    if (newValue.integration) {
      return `${newValue.integration} event: ${newValue.event || 'N/A'}`;
    }
    return 'New activity';
  }
  
  if (previousValue && !newValue) {
    // Deletion case
    if (previousValue.field) {
      return `${previousValue.field}: ${previousValue.value || 'N/A'} → removed`;
    }
    return 'Activity removed';
  }
  
  return 'Activity recorded';
}

/**
 * Format timestamp to readable date/time
 */
function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Get icon for activity type
 * Handles backend activity types: RELEASE, PLATFORM_TARGET, REGRESSION, CRONCONFIG, PAUSE_RELEASE, RESUME_RELEASE, REGRESSION_STAGE_APPROVAL
 */
function getActivityIcon(type: string): React.ReactNode {
  switch (type) {
    // Backend activity types
    case 'RELEASE':
      return <IconTag size={16} />;
    case 'PLATFORM_TARGET':
      return <IconSettings size={16} />;
    case 'REGRESSION':
      return <IconCheck size={16} />;
    case 'CRONCONFIG':
      return <IconSettings size={16} />;
    case 'PAUSE_RELEASE':
      return <IconPlayerPause size={16} />;
    case 'RESUME_RELEASE':
      return <IconPlayerPlay size={16} />;
    case 'REGRESSION_STAGE_APPROVAL':
      return <IconCheck size={16} />;
    // Legacy types (for backward compatibility)
    case 'RELEASE_STATUS_CHANGE':
      return <IconTag size={16} />;
    case 'TASK_UPDATE':
      return <IconCheck size={16} />;
    case 'RELEASE_FIELD_UPDATE':
      return <IconEdit size={16} />;
    case 'RELEASE_PAUSED':
      return <IconPlayerPause size={16} />;
    case 'RELEASE_RESUMED':
      return <IconPlayerPlay size={16} />;
    case 'INTEGRATION_EVENT':
      return <IconSettings size={16} />;
    default:
      return <IconClock size={16} />;
  }
}

/**
 * Get color for activity type
 * Handles backend activity types: RELEASE, PLATFORM_TARGET, REGRESSION, CRONCONFIG, PAUSE_RELEASE, RESUME_RELEASE, REGRESSION_STAGE_APPROVAL
 */
function getActivityColor(type: string): string {
  switch (type) {
    // Backend activity types
    case 'RELEASE':
      return 'blue';
    case 'PLATFORM_TARGET':
      return 'violet';
    case 'REGRESSION':
      return 'green';
    case 'CRONCONFIG':
      return 'orange';
    case 'PAUSE_RELEASE':
      return 'red';
    case 'RESUME_RELEASE':
      return 'teal';
    case 'REGRESSION_STAGE_APPROVAL':
      return 'green';
    // Legacy types (for backward compatibility)
    case 'RELEASE_STATUS_CHANGE':
      return 'blue';
    case 'TASK_UPDATE':
      return 'green';
    case 'RELEASE_FIELD_UPDATE':
      return 'orange';
    case 'RELEASE_PAUSED':
      return 'red';
    case 'RELEASE_RESUMED':
      return 'teal';
    case 'INTEGRATION_EVENT':
      return 'violet';
    default:
      return 'gray';
  }
}

/**
 * Get badge variant based on activity type
 */
function getActivityBadgeVariant(type: string): 'light' | 'filled' | 'outline' {
  if (type === 'PAUSE_RELEASE' || type === 'RELEASE_PAUSED') return 'filled';
  if (type === 'RESUME_RELEASE' || type === 'RELEASE_RESUMED') return 'light';
  return 'light';
}

/**
 * Format activity type for display
 */
function formatActivityType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export function ActivityLogsContent({ activityLogs }: ActivityLogsContentProps) {
  if (!activityLogs || activityLogs.length === 0) {
    return (
      <Stack align="center" py="xl">
        <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
          <IconHistory size={24} />
        </ThemeIcon>
        <Text c="dimmed" size="sm">
          No activity logs available
        </Text>
      </Stack>
    );
  }

  return (
    <Timeline 
      active={-1} 
      bulletSize={28} 
      lineWidth={2}
      styles={{
        item: {
          paddingBottom: '20px',
        },
        itemBullet: {
          border: '2px solid var(--mantine-color-slate-2)',
        },
      }}
    >
      {activityLogs.map((log) => {
        const color = getActivityColor(log.type);
        const icon = getActivityIcon(log.type);
        const changeText = formatActivityChange(log);
        const timeText = formatTimestamp(log.updatedAt);
        const activityTypeLabel = formatActivityType(log.type);

        return (
          <Timeline.Item
            key={log.id}
            bullet={
              <ThemeIcon size={28} radius="xl" color={color} variant="transparent">
                {icon}
              </ThemeIcon>
            }
            title={
              <Stack gap={8} mt={2}>
                <Group gap="xs" align="center" wrap="wrap">
                  <Text size="sm" fw={600} c="var(--mantine-color-slate-8)">
                    {activityTypeLabel}
                  </Text>
                  <Badge
                    color={color}
                    variant={getActivityBadgeVariant(log.type)}
                    size="xs"
                    radius="sm"
                  >
                    {log.type}
                  </Badge>
                </Group>
                <Text size="sm" fw={500} c="var(--mantine-color-slate-7)" style={{ lineHeight: 1.5 }}>
                  {changeText}
                </Text>
              </Stack>
            }
          >
            <Stack gap={6} mt={8}>
              <Group gap={4}>
                <Text size="xs" c="dimmed" fw={500}>
                  {timeText}
                </Text>
              </Group>
              {log.updatedBy && (
                <Text size="xs" c="dimmed">
                  <Text span c="var(--mantine-color-slate-5)">By:</Text>{' '}
                  <Text span fw={500} c="var(--mantine-color-slate-7)">
                    {log.updatedBy}
                  </Text>
                </Text>
              )}
            </Stack>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}

