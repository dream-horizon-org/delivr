/**
 * KickoffStage Component
 * Displays kickoff stage with tasks only
 */

import { Alert, Group, Select, Stack, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import {
  ERROR_MESSAGES,
  KICKOFF_LABELS,
  TASK_STATUS_LABELS,
} from '~/constants/release-process-ui';
import { useKickoffStage } from '~/hooks/useReleaseProcess';
import { useTaskHandlers } from '~/hooks/useTaskHandlers';
import { filterAndSortTasks } from '~/utils/task-filtering';
import type { Task } from '~/types/release-process.types';
import { TaskStatus } from '~/types/release-process-enums';
import { getApiErrorMessage } from '~/utils/api-client';
import { TaskCard } from './TaskCard';

interface KickoffStageProps {
  tenantId: string;
  releaseId: string;
  className?: string;
}

export function KickoffStage({ tenantId, releaseId, className }: KickoffStageProps) {
  const { data, isLoading, error, refetch } = useKickoffStage(tenantId, releaseId);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Use shared task handlers
  const { handleRetry, handleViewDetails } = useTaskHandlers({
    tenantId,
    releaseId,
    refetch,
  });

  // Extract tasks from data (safe to access even if data is null)
  const tasks = data?.tasks || [];

  // Sort and filter tasks by status - MUST be called before any early returns
  const filteredTasks = useMemo(() => {
    return filterAndSortTasks(tasks, statusFilter);
  }, [tasks, statusFilter]);

  if (isLoading) {
    return (
      <Stack gap="md" className={className}>
        <Text c="dimmed">Loading kickoff stage...</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert color="red" icon={<IconInfoCircle size={16} />} title="Error">
        {getApiErrorMessage(error, ERROR_MESSAGES.FAILED_TO_LOAD_STAGE)}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert color="yellow" icon={<IconInfoCircle size={16} />} title="No Data">
        No kickoff stage data available
      </Alert>
    );
  }

  const hasTasks = tasks && tasks.length > 0;

  // Status filter options
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: TaskStatus.PENDING, label: TASK_STATUS_LABELS.PENDING },
    { value: TaskStatus.IN_PROGRESS, label: TASK_STATUS_LABELS.IN_PROGRESS },
    { value: TaskStatus.AWAITING_CALLBACK, label: TASK_STATUS_LABELS.AWAITING_CALLBACK },
    { value: TaskStatus.AWAITING_MANUAL_BUILD, label: TASK_STATUS_LABELS.AWAITING_MANUAL_BUILD },
    { value: TaskStatus.COMPLETED, label: TASK_STATUS_LABELS.COMPLETED },
    { value: TaskStatus.FAILED, label: TASK_STATUS_LABELS.FAILED },
    { value: TaskStatus.SKIPPED, label: TASK_STATUS_LABELS.SKIPPED },
  ];

  return (
    <Stack gap="lg" className={className}>
      {/* Tasks Header with Filter */}
      {hasTasks && (
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
                onRetry={handleRetry}
                onViewDetails={handleViewDetails}
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
          {KICKOFF_LABELS.NO_TASKS}
        </Alert>
      )}
    </Stack>
  );
}

