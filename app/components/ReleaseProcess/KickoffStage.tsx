/**
 * KickoffStage Component
 * Displays kickoff stage with tasks only
 */

import { Alert, Stack, Text, Title } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useCallback } from 'react';
import {
  ERROR_MESSAGES,
  KICKOFF_LABELS,
} from '~/constants/release-process-ui';
import { useKickoffStage, useRetryTask } from '~/hooks/useReleaseProcess';
import type { Task } from '~/types/release-process.types';
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

  const { tasks } = data;
  const hasTasks = tasks && tasks.length > 0;

  return (
    <Stack gap="lg" className={className}>
      {/* Header */}
      <div>
        <Title order={3} mb="xs">
          {KICKOFF_LABELS.TITLE}
        </Title>
        <Text size="sm" c="dimmed">
          {KICKOFF_LABELS.DESCRIPTION}
        </Text>
      </div>

      {/* Tasks - Full width, stacked */}
      <div>
        <Text fw={600} size="md" mb="md">
          {KICKOFF_LABELS.TASKS}
        </Text>
        
        {hasTasks ? (
          <Stack gap="md">
            {tasks.map((task: Task) => (
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
            {KICKOFF_LABELS.NO_TASKS}
          </Alert>
        )}
      </div>
    </Stack>
  );
}

