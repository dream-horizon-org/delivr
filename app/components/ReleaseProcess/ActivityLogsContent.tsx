/**
 * ActivityLogsContent Component
 * 
 * Core logic component for displaying activity logs with clean diff formatting
 * Handles parsing of previousValue/newValue and displays changes in readable format
 */

import { Group, Stack, Text, Timeline, ThemeIcon } from '@mantine/core';
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
  IconUpload,
  IconArchive,
  IconRocket,
  IconRefresh,
  IconPlane,
} from '@tabler/icons-react';
import type { ActivityLog } from '~/types/release-process.types';

interface ActivityLogsContentProps {
  activityLogs: ActivityLog[];
}

/**
 * Get display name for the user who made the change
 */
function getUpdatedByName(log: ActivityLog): string {
  return log.updatedByAccount?.name || log.updatedBy || 'Unknown';
}

/**
 * Format complete activity log message
 * Returns a single formatted message instead of separate label + description
 * Handles backend activity types: RELEASE, PLATFORM_TARGET, REGRESSION, CRONCONFIG, PAUSE_RELEASE, RESUME_RELEASE, REGRESSION_STAGE_APPROVAL, RELEASE_ARCHIVED, RELEASE_CREATED, MANUAL_BUILD_UPLOADED, TASK_RETRIED, TESTFLIGHT_BUILD_VERIFIED
 */
function formatActivityLogMessage(log: ActivityLog): string {
  const { type, previousValue, newValue } = log;

  // Handle null values
  if (!previousValue && !newValue) {
    return 'Activity recorded';
  }

  switch (type) {
    case 'PAUSE_RELEASE':
      if (newValue?.reason) {
        return `Release paused: ${newValue.reason}`;
      }
      return 'Release paused';

    case 'RESUME_RELEASE':
      return 'Release resumed';

    case 'REGRESSION_STAGE_APPROVAL':
      if (newValue) {
        const approvedBy = newValue.approvedBy || getUpdatedByName(log) || 'Unknown';
        return `Regression stage approved by ${approvedBy}`;
      }
      return 'Regression stage approval removed';

    case 'RELEASE':
      if (previousValue && newValue) {
        // Field updates
        const fields = Object.keys(newValue);
        const changes = fields
          .map(field => {
            const oldVal = previousValue[field];
            const newVal = newValue[field];
            if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
              // Format field names nicely (camelCase to Title Case)
              const fieldLabel = field
                .replace(/([A-Z])/g, ' $1')
                .trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
              return `${fieldLabel}: ${oldVal || 'N/A'} → ${newVal || 'N/A'}`;
            }
            return null;
          })
          .filter(Boolean);
        
        if (changes.length > 0) {
          return `Release updated: ${changes.join(', ')}`;
        }
        
        if (previousValue.status && newValue.status) {
          return `Release status changed: ${previousValue.status} → ${newValue.status}`;
        }
        
        return 'Release updated';
      }
      if (newValue && !previousValue) {
        return 'Release created';
      }
      if (previousValue && !newValue) {
        return 'Release removed';
      }
      return 'Release activity';

    case 'PLATFORM_TARGET':
      if (previousValue && newValue) {
        const oldPlatform = previousValue.platform || 'N/A';
        const oldTarget = previousValue.target || 'N/A';
        const newPlatform = newValue.platform || 'N/A';
        const newTarget = newValue.target || 'N/A';
        return `Platform target updated: ${oldPlatform}/${oldTarget} → ${newPlatform}/${newTarget}`;
      }
      if (newValue && !previousValue) {
        const platform = newValue.platform || 'N/A';
        const target = newValue.target || 'N/A';
        return `Platform target added: ${platform}/${target}`;
      }
      if (previousValue && !newValue) {
        const platform = previousValue.platform || 'N/A';
        const target = previousValue.target || 'N/A';
        return `Platform target removed: ${platform}/${target}`;
      }
      return 'Platform target activity';

    case 'REGRESSION':
      if (previousValue && newValue) {
        const oldDate = previousValue.date ? new Date(previousValue.date).toLocaleDateString() : 'N/A';
        const newDate = newValue.date ? new Date(newValue.date).toLocaleDateString() : 'N/A';
        return `Regression slot updated: ${oldDate} → ${newDate}`;
      }
      if (newValue && !previousValue) {
        const date = newValue.date ? new Date(newValue.date).toLocaleDateString() : 'N/A';
        return `Regression slot added: ${date}`;
      }
      if (previousValue && !newValue) {
        const date = previousValue.date ? new Date(previousValue.date).toLocaleDateString() : 'N/A';
        return `Regression slot removed: ${date}`;
      }
      return 'Regression activity';

    case 'CRONCONFIG':
      if (previousValue && newValue) {
        return 'Cron configuration updated';
      }
      if (newValue && !previousValue) {
        return 'Cron configuration set';
      }
      if (previousValue && !newValue) {
        return 'Cron configuration removed';
      }
      return 'Cron configuration activity';

    case 'RELEASE_ARCHIVED':
      return 'Release archived';

    case 'RELEASE_CREATED':
      if (newValue) {
        const releaseType = newValue.type || 'Release';
        const branch = newValue.branch || 'N/A';
        const releaseId = newValue.releaseId || '';
        return `${releaseType} release created: ${branch}${releaseId ? ` (${releaseId})` : ''}`;
      }
      return 'Release created';

    case 'MANUAL_BUILD_UPLOADED':
      if (newValue) {
        const platform = newValue.platform || 'Unknown';
        const filename = newValue.filename || 'build file';
        const stage = newValue.stage || '';
        const allPlatformsReady = newValue.allPlatformsReady ? ' (All platforms ready)' : '';
        return `Manual build uploaded for ${platform}: ${filename}${stage ? ` in ${stage}` : ''}${allPlatformsReady}`;
      }
      return 'Manual build uploaded';

    case 'TASK_RETRIED':
      if (previousValue && newValue) {
        const oldStatus = previousValue.taskStatus || 'FAILED';
        const newStatus = newValue.taskStatus || 'PENDING';
        return `Task retried: ${oldStatus} → ${newStatus}`;
      }
      return 'Task retried';

    case 'TESTFLIGHT_BUILD_VERIFIED':
      if (newValue) {
        const platform = newValue.platform || 'Unknown';
        const version = newValue.version || 'N/A';
        const testflightNumber = newValue.testflightNumber || '';
        const stage = newValue.stage || '';
        return `TestFlight build verified for ${platform} ${version}${testflightNumber ? ` (#${testflightNumber})` : ''}${stage ? ` in ${stage}` : ''}`;
      }
      return 'TestFlight build verified';

    default:
      // Fallback for unknown types
      if (previousValue && newValue) {
        if (previousValue.status && newValue.status) {
          return `Status changed: ${previousValue.status} → ${newValue.status}`;
        }
        if (previousValue.field && newValue.field && previousValue.field === newValue.field) {
          return `${previousValue.field} updated: ${previousValue.value || 'N/A'} → ${newValue.value || 'N/A'}`;
        }
        if (previousValue.taskId && newValue.taskId && previousValue.taskId === newValue.taskId) {
          const taskType = newValue.taskType || previousValue.taskType || 'Task';
          const oldStatus = previousValue.status || 'N/A';
          const newStatus = newValue.status || 'N/A';
          return `${taskType} status changed: ${oldStatus} → ${newStatus}`;
        }
        return 'Activity updated';
      }
      if (newValue && !previousValue) {
        if (newValue.field) {
          return `${newValue.field} added: ${newValue.value || 'N/A'}`;
        }
        if (newValue.integration) {
          return `${newValue.integration} event: ${newValue.event || 'N/A'}`;
        }
        return 'Activity added';
      }
      if (previousValue && !newValue) {
        if (previousValue.field) {
          return `${previousValue.field} removed: ${previousValue.value || 'N/A'}`;
        }
        return 'Activity removed';
      }
      return 'Activity recorded';
  }
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
 * Handles backend activity types: RELEASE, PLATFORM_TARGET, REGRESSION, CRONCONFIG, PAUSE_RELEASE, RESUME_RELEASE, REGRESSION_STAGE_APPROVAL, RELEASE_ARCHIVED, RELEASE_CREATED, MANUAL_BUILD_UPLOADED, TASK_RETRIED, TESTFLIGHT_BUILD_VERIFIED
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
    case 'RELEASE_ARCHIVED':
      return <IconArchive size={16} />;
    case 'RELEASE_CREATED':
      return <IconRocket size={16} />;
    case 'MANUAL_BUILD_UPLOADED':
      return <IconUpload size={16} />;
    case 'TASK_RETRIED':
      return <IconRefresh size={16} />;
    case 'TESTFLIGHT_BUILD_VERIFIED':
      return <IconPlane size={16} />;
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
 * Handles backend activity types: RELEASE, PLATFORM_TARGET, REGRESSION, CRONCONFIG, PAUSE_RELEASE, RESUME_RELEASE, REGRESSION_STAGE_APPROVAL, RELEASE_ARCHIVED, RELEASE_CREATED, MANUAL_BUILD_UPLOADED, TASK_RETRIED, TESTFLIGHT_BUILD_VERIFIED
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
    case 'RELEASE_ARCHIVED':
      return 'gray';
    case 'RELEASE_CREATED':
      return 'blue';
    case 'MANUAL_BUILD_UPLOADED':
      return 'green';
    case 'TASK_RETRIED':
      return 'orange';
    case 'TESTFLIGHT_BUILD_VERIFIED':
      return 'teal';
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
        const message = formatActivityLogMessage(log);
        const timeText = formatTimestamp(log.updatedAt);

        return (
          <Timeline.Item
            key={log.id}
            bullet={
              <ThemeIcon size={28} radius="xl" color={color} variant="transparent">
                {icon}
              </ThemeIcon>
            }
            title={
              <Text size="sm" fw={600} c="var(--mantine-color-slate-8)" style={{ lineHeight: 1.5 }}>
                {message}
              </Text>
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
                    {getUpdatedByName(log)}
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

