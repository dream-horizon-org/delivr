/**
 * ActivityLogsContent Component
 * 
 * Core logic component for displaying activity logs with clean diff formatting
 * Handles parsing of previousValue/newValue and displays changes in readable format
 */

import { Group, Stack, Text, Timeline, ThemeIcon } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import type { ActivityLog } from '~/types/release-process.types';
import { formatActivityLogMessage, getUpdatedByName } from '~/utils/activity-log-utils';
import { getActivityIcon, getActivityColor } from '~/utils/activity-log-ui-utils';
import { formatTimestamp } from '~/utils/release-process-date';

interface ActivityLogsContentProps {
  activityLogs: ActivityLog[];
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

