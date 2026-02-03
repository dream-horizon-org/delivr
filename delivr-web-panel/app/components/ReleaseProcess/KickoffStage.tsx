/**
 * KickoffStage Component
 * Displays kickoff stage with tasks only
 */

import { Stack, Alert, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { KICKOFF_LABELS } from '~/constants/release-process-ui';
import { useKickoffStage } from '~/hooks/useReleaseProcess';
import { useRelease } from '~/hooks/useRelease';
import { ReleaseStatus, TaskStage } from '~/types/release-process-enums';
import { useTaskHandlers } from '~/hooks/useTaskHandlers';
import { validateStageProps } from '~/utils/prop-validation';
import { StageErrorBoundary } from './shared/StageErrorBoundary';
import { TasksList } from './shared/TasksList';

interface KickoffStageProps {
  appId: string;
  releaseId: string;
  className?: string;
}

export function KickoffStage({ appId, releaseId, className }: KickoffStageProps) {
  // Validate required props
  validateStageProps({ appId, releaseId }, 'KickoffStage');

  const { data, isLoading, error, refetch, dataUpdatedAt } = useKickoffStage(appId, releaseId);
  const { release } = useRelease(appId, releaseId);
  const isArchived = release?.status === ReleaseStatus.ARCHIVED;

  // Use shared task handlers
  const { handleRetry } = useTaskHandlers({
    appId,
    releaseId,
    refetch,
  });

  // Extract tasks and uploadedBuilds from data (safe to access even if data is null)
  const tasks = data?.tasks || [];
  const uploadedBuilds = data?.uploadedBuilds || [];

  // Check if we're in transition state (data loaded but no tasks yet)
  // This happens when transitioning between stages - tasks are being created
  const isFetchingTasks = isLoading || (data && tasks.length === 0);

  return (
    <StageErrorBoundary
      isLoading={false} // We handle loading state ourselves
      error={error}
      data={data}
      stageName="kickoff stage"
    >
      <Stack gap="lg" className={className}>
        {/* Show loading message when fetching tasks */}
        {isFetchingTasks && (
          <Alert 
            icon={<IconInfoCircle size={16} />} 
            color="blue" 
            variant="light" 
            radius="md"
          >
            <Text size="sm">Please wait while we are fetching the tasks...</Text>
          </Alert>
        )}

        {/* Tasks List - Only show when tasks are available */}
        {!isFetchingTasks && (
          <TasksList
            tasks={tasks}
            appId={appId}
            releaseId={releaseId}
            onRetry={handleRetry}
            emptyMessage={KICKOFF_LABELS.NO_TASKS}
            uploadedBuilds={uploadedBuilds}
            isArchived={isArchived}
            stage={TaskStage.KICKOFF}
            lastUpdatedAt={dataUpdatedAt}
          />
        )}
      </Stack>
    </StageErrorBoundary>
  );
}

