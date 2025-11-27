/**
 * Release Tasks List Component
 * Displays list of tasks associated with the release
 */

import { memo } from 'react';
import { Paper, Title, Text, Badge, Group, Stack } from '@mantine/core';
import { getTaskStatusColor } from '~/utils/release-utils';

interface Task {
  id: string;
  taskType?: string;
  taskId?: string;
  taskStatus?: string;
}

interface ReleaseTasksListProps {
  tasks: Task[];
}

export const ReleaseTasksList = memo(function ReleaseTasksList({ tasks }: ReleaseTasksListProps) {
  return (
    <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
      <Title order={3} className="mb-4">Tasks</Title>
      
      {tasks.length === 0 ? (
        <Text size="sm" c="dimmed" className="text-center py-8">No tasks yet</Text>
      ) : (
        <Stack gap="sm">
          {tasks.map((task) => (
            <Paper key={task.id} p="sm" withBorder radius="sm">
              <Group justify="space-between">
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={500}>{task.taskType || task.taskId || 'Unknown Task'}</Text>
                  {task.taskId && (
                    <Text size="xs" c="dimmed" className="font-mono mt-1">
                      {task.taskId}
                    </Text>
                  )}
                </div>
                {task.taskStatus && (
                  <Badge 
                    color={getTaskStatusColor(task.taskStatus)}
                    variant="light"
                    size="sm"
                  >
                    {task.taskStatus}
                  </Badge>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  );
});

