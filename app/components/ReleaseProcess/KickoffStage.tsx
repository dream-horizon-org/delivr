/**
 * KickoffStage Component
 * Displays kickoff stage with tasks only
 */

import { Alert, Group, Select, Stack, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import {
  ERROR_MESSAGES,
  KICKOFF_LABELS,
  TASK_STATUS_LABELS,
} from '~/constants/release-process-ui';
import { useKickoffStage, useRetryTask } from '~/hooks/useReleaseProcess';
import type { Task } from '~/types/release-process.types';
import { TaskStatus } from '~/types/release-process-enums';
import { getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { TaskCard } from './TaskCard';

interface KickoffStageProps {
  tenantId: string;
  releaseId: string;
  className?: string;
}

export function KickoffStage({ tenantId, releaseId, className }: KickoffStageProps) {
  const { data, isLoading, error, refetch } = useKickoffStage(tenantId, releaseId);
  const retryMutation = useRetryTask(tenantId, releaseId);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Extract tasks from data (safe to access even if data is null)
  const tasks = data?.tasks || [];

  // Sort and filter tasks by status - MUST be called before any early returns
  const filteredTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    
    // First filter by status if filter is selected
    let filtered = statusFilter 
      ? tasks.filter((task: Task) => task.taskStatus === statusFilter)
      : tasks;
    
    // Sort: PENDING -> IN_PROGRESS/AWAITING_CALLBACK -> COMPLETED -> FAILED -> SKIPPED
    const statusOrder: Record<TaskStatus, number> = {
      [TaskStatus.PENDING]: 1,
      [TaskStatus.IN_PROGRESS]: 2,
      [TaskStatus.AWAITING_CALLBACK]: 2,
      [TaskStatus.COMPLETED]: 3,
      [TaskStatus.FAILED]: 4,
      [TaskStatus.SKIPPED]: 5,
    };
    
    return filtered.sort((a: Task, b: Task) => {
      const orderA = statusOrder[a.taskStatus] || 99;
      const orderB = statusOrder[b.taskStatus] || 99;
      return orderA - orderB;
    });
  }, [tasks, statusFilter]);

  const handleRetry = useCallback(
    async (taskId: string) => {
      try {
        await retryMutation.mutateAsync({ taskId });
        showSuccessToast({ message: 'Task retry initiated successfully' });
        // Refetch stage data to show updated task status
        await refetch();
      } catch (error) {
        const errorMessage = getApiErrorMessage(error, ERROR_MESSAGES.FAILED_TO_RETRY_TASK);
        showErrorToast({ message: errorMessage });
      }
    },
    [retryMutation, refetch]
  );

  const handleViewDetails = useCallback((task: Task) => {
    // TODO: Open task details modal
    console.log('View task details:', task);
  }, []);

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
    { value: TaskStatus.AWAITING_CALLBACK, label: 'Awaiting Callback' },
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

