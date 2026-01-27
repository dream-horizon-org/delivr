/**
 * TasksList Component
 * Shared component for displaying tasks across all stages
 * Tasks are displayed in execution order
 */

import { Alert, Stack, Text, Group } from '@mantine/core';
import { IconArchive } from '@tabler/icons-react';
import { useMemo } from 'react';
import { sortTasksByExecutionOrder } from '~/utils/task-filtering';
import type { Task, BuildInfo } from '~/types/release-process.types';
import { TaskStage } from '~/types/release-process-enums';
import { TaskCard } from '../TaskCard';
import { formatLastUpdated } from '~/utils/release-process-date';

interface TasksListProps {
  tasks: Task[];
  appId: string;
  releaseId: string;
  onRetry?: (taskId: string) => void;
  emptyMessage?: string;
  uploadedBuilds?: BuildInfo[];
  isArchived?: boolean;
  stage?: TaskStage; // Stage for ordering tasks
  lastUpdatedAt?: number; // React Query dataUpdatedAt timestamp
}

export function TasksList({
  tasks,
  appId,
  releaseId,
  onRetry,
  emptyMessage = 'No tasks available',
  uploadedBuilds = [],
  isArchived = false,
  stage,
  lastUpdatedAt,
}: TasksListProps) {
  // Sort tasks by execution order if stage provided
  const sortedTasks = useMemo(() => {
    if (!stage) {
      // If no stage, return tasks as-is (fallback)
      return tasks;
    }
    return sortTasksByExecutionOrder(tasks, stage);
  }, [tasks, stage]);

  const hasTasks = tasks && tasks.length > 0;

  return (
    <Stack gap="md">
      {/* Archived Message Banner */}
      {isArchived && (
        <Alert
          icon={<IconArchive size={16} />}
          title="This release is archived"
          color="gray"
          variant="light"
        >
          <Text size="sm">
            This release has been archived. You can view the tasks and history, but no actions can be performed.
          </Text>
        </Alert>
      )}

      {/* Tasks Header */}
      {hasTasks && (
        <Group justify="space-between" align="center">
          <Text fw={600} size="lg">
            Tasks
          </Text>
          {lastUpdatedAt && lastUpdatedAt > 0 && (
            <Text size="xs" c="dimmed">
              Updated {formatLastUpdated(lastUpdatedAt)}
            </Text>
          )}
        </Group>
      )}

      {/* Tasks - Full width, stacked */}
      {hasTasks ? (
        sortedTasks.length > 0 ? (
          <Stack gap="md">
            {sortedTasks.map((task: Task) => (
              <TaskCard
                key={task.id}
                task={task}
                appId={appId}
                releaseId={releaseId}
                onRetry={onRetry}
                uploadedBuilds={uploadedBuilds}
                isArchived={isArchived}
              />
            ))}
          </Stack>
        ) : (
          <Alert color="gray" variant="light">
            {emptyMessage}
          </Alert>
        )
      ) : (
        <Alert color="gray" variant="light">
          {emptyMessage}
        </Alert>
      )}
    </Stack>
  );
}

