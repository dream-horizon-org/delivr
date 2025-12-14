/**
 * TasksList Component
 * Shared component for displaying and filtering tasks across all stages
 */

import { Alert, Group, Select, Stack, Text } from '@mantine/core';
import { useMemo, useState } from 'react';
import { getStatusFilterOptions } from '~/constants/release-process-ui';
import { filterAndSortTasks } from '~/utils/task-filtering';
import type { Task, BuildInfo } from '~/types/release-process.types';
import { TaskCard } from '../TaskCard';

interface TasksListProps {
  tasks: Task[];
  tenantId: string;
  releaseId: string;
  onRetry?: (taskId: string) => void;
  emptyMessage?: string;
  showFilter?: boolean;
  uploadedBuilds?: BuildInfo[];  // Stage-level uploaded builds
}

export function TasksList({
  tasks,
  tenantId,
  releaseId,
  onRetry,
  emptyMessage = 'No tasks available',
  showFilter = true,
  uploadedBuilds = [],
}: TasksListProps) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const statusOptions = getStatusFilterOptions();

  // Sort and filter tasks by status
  const filteredTasks = useMemo(() => {
    return filterAndSortTasks(tasks, statusFilter);
  }, [tasks, statusFilter]);

  const hasTasks = tasks && tasks.length > 0;

  return (
    <Stack gap="md">
      {/* Tasks Header with Filter */}
      {hasTasks && showFilter && (
        <Group justify="space-between" align="center">
          <Text fw={600} size="lg">
            Tasks
          </Text>
          <Select
            placeholder="Filter by status"
            data={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            clearable
            style={{ width: '200px' }}
          />
        </Group>
      )}

      {/* Tasks - Full width, stacked */}
      {hasTasks ? (
        filteredTasks.length > 0 ? (
          <Stack gap="md">
            {filteredTasks.map((task: Task) => (
              <TaskCard
                key={task.id}
                task={task}
                tenantId={tenantId}
                releaseId={releaseId}
                onRetry={onRetry}
                uploadedBuilds={uploadedBuilds}
              />
            ))}
          </Stack>
        ) : (
          <Alert color="gray" variant="light">
            No tasks match the selected filter
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

