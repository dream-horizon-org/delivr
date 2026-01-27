/**
 * ActivityLogsDrawer Component
 * 
 * Side panel drawer for displaying activity logs
 * Uses Mantine Drawer component with data fetching via useActivityLogs hook
 */

import { Drawer, Group, ScrollArea, Stack, Text, ThemeIcon, Loader } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import { ActivityLogsContent } from './ActivityLogsContent';
import { useActivityLogs } from '~/hooks/useReleaseProcess';

interface ActivityLogsDrawerProps {
  opened: boolean;
  onClose: () => void;
  appId: string;
  releaseId: string;
}

export function ActivityLogsDrawer({
  opened,
  onClose,
  appId,
  releaseId,
}: ActivityLogsDrawerProps) {
  const { data: activityLogs, isLoading, error } = useActivityLogs(appId, releaseId);

  const logCount = activityLogs?.activityLogs?.length || 0;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={750}
      padding={0}
      transitionProps={{
        duration: 300,
        timingFunction: 'ease-in-out',
      }}
      styles={{
        header: {
          padding: '20px 24px',
          borderBottom: '1px solid var(--mantine-color-slate-2)',
        },
        body: {
          padding: 0,
          height: '100%',
        },
      }}
      title={
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color="brand">
            <IconHistory size={20} />
          </ThemeIcon>
          <div>
            <Text fw={600} size="lg">
              Activity Logs
            </Text>
            {!isLoading && !error && (
              <Text size="xs" c="dimmed">
                {logCount} {logCount === 1 ? 'event' : 'events'}
              </Text>
            )}
          </div>
        </Group>
      }
    >
      <ScrollArea 
        h="calc(100vh - 120px)" 
        type="scroll"
        styles={{
          viewport: {
            paddingBottom: '24px',
          },
        }}
      >
        {isLoading ? (
          <Stack align="center" justify="center" py="xl" gap="md" style={{ minHeight: '400px' }}>
            <Loader size="sm" />
            <Text c="dimmed" size="sm">
              Loading activity logs...
            </Text>
          </Stack>
        ) : error ? (
          <Stack align="center" justify="center" py="xl" gap="md" style={{ minHeight: '400px' }}>
            <ThemeIcon size="xl" radius="xl" variant="transparent" color="red">
              <IconHistory size={24} />
            </ThemeIcon>
            <Text c="red" size="sm" fw={500}>
              Failed to load activity logs
            </Text>
            <Text c="dimmed" size="xs">
              {error.message}
            </Text>
          </Stack>
        ) : activityLogs?.activityLogs ? (
          <div style={{ padding: '24px' }}>
            <ActivityLogsContent activityLogs={activityLogs.activityLogs} />
          </div>
        ) : (
          <Stack align="center" justify="center" py="xl" gap="md" style={{ minHeight: '400px' }}>
            <ThemeIcon size="xl" radius="xl" variant="transparent" color="gray">
              <IconHistory size={24} />
            </ThemeIcon>
            <Text c="dimmed" size="sm">
              No activity logs available
            </Text>
          </Stack>
        )}
      </ScrollArea>
    </Drawer>
  );
}

