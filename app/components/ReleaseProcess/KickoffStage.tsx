/**
 * KickoffStage Component
 * Displays kickoff stage with tasks only
 */

import { Stack } from '@mantine/core';
import { KICKOFF_LABELS } from '~/constants/release-process-ui';
import { useKickoffStage } from '~/hooks/useReleaseProcess';
import { useTaskHandlers } from '~/hooks/useTaskHandlers';
import { validateStageProps } from '~/utils/prop-validation';
import { StageErrorBoundary } from './shared/StageErrorBoundary';
import { TasksList } from './shared/TasksList';

interface KickoffStageProps {
  tenantId: string;
  releaseId: string;
  className?: string;
}

export function KickoffStage({ tenantId, releaseId, className }: KickoffStageProps) {
  // Validate required props
  validateStageProps({ tenantId, releaseId }, 'KickoffStage');

  const { data, isLoading, error, refetch } = useKickoffStage(tenantId, releaseId);

  // Use shared task handlers
  const { handleRetry } = useTaskHandlers({
    tenantId,
    releaseId,
    refetch,
  });

  // Extract tasks and uploadedBuilds from data (safe to access even if data is null)
  const tasks = data?.tasks || [];
  const uploadedBuilds = data?.uploadedBuilds || [];

  return (
    <StageErrorBoundary
      isLoading={isLoading}
      error={error}
      data={data}
      stageName="kickoff stage"
    >
      <Stack gap="lg" className={className}>
        <TasksList
          tasks={tasks}
          tenantId={tenantId}
          releaseId={releaseId}
          onRetry={handleRetry}
          emptyMessage={KICKOFF_LABELS.NO_TASKS}
          uploadedBuilds={uploadedBuilds}
        />
      </Stack>
    </StageErrorBoundary>
  );
}

