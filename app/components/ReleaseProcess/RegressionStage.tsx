/**
 * RegressionStage Component
 * Main orchestrator component for regression stage
 * Displays cycles, tasks, approval workflow, and manual build uploads
 */

import {
  Alert,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Anchor,
} from '@mantine/core';
import { IconCheck, IconInfoCircle, IconRocket, IconX } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import {
  ERROR_MESSAGES,
  TASK_STATUS_LABELS,
} from '~/constants/release-process-ui';
import {
  useRegressionStage,
  useRetryTask,
  useApproveRegression,
  useTestManagementStatus,
  useCherryPickStatus,
} from '~/hooks/useReleaseProcess';
import { useRelease } from '~/hooks/useRelease';
import type { Task } from '~/types/release-process.types';
import { TaskStatus } from '~/types/release-process-enums';
import { getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { RegressionCyclesList } from './RegressionCyclesList';

interface RegressionStageProps {
  tenantId: string;
  releaseId: string;
  className?: string;
}

export function RegressionStage({ tenantId, releaseId, className }: RegressionStageProps) {
  const { data, isLoading, error, refetch } = useRegressionStage(tenantId, releaseId);
  const retryMutation = useRetryTask(tenantId, releaseId);
  const approveMutation = useApproveRegression(tenantId, releaseId);
  const { release } = useRelease(tenantId, releaseId);

  // Fetch status checks
  const testManagementStatus = useTestManagementStatus(tenantId, releaseId);
  const cherryPickStatus = useCherryPickStatus(tenantId, releaseId);

  // Extract data from response
  const cycles = data?.cycles || [];
  const currentCycle = data?.currentCycle || null;
  const tasks = data?.tasks || [];
  const availableBuilds = data?.availableBuilds || [];
  const upcomingSlot = data?.upcomingSlot;
  const approvalStatus = data?.approvalStatus;

  const handleRetry = useCallback(
    async (taskId: string) => {
      try {
        await retryMutation.mutateAsync({ taskId });
        showSuccessToast({ message: 'Task retry initiated successfully' });
        await refetch();
      } catch (error) {
        const errorMessage = getApiErrorMessage(error, ERROR_MESSAGES.FAILED_TO_RETRY_TASK);
        showErrorToast({ message: errorMessage });
      }
    },
    [retryMutation, refetch]
  );

  const handleViewTaskDetails = useCallback((task: Task) => {
    console.log('View task details:', task);
  }, []);

  const handleApprove = useCallback(async () => {
    if (!approvalStatus?.canApprove) {
      showErrorToast({ message: 'Approval requirements not met' });
      return;
    }

    try {
      // TODO: Get current user ID from auth context or pass as prop
      // For now, backend will extract from authenticated session
      const approvedBy = 'user-from-session'; // Backend will use authenticated user
      
      await approveMutation.mutateAsync({
        approvedBy,
        comments: 'Regression stage approved',
      });
      
      showSuccessToast({ message: 'Regression stage approved successfully' });
      await refetch();
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to approve regression stage');
      showErrorToast({ message: errorMessage });
    }
  }, [approvalStatus, approveMutation, refetch]);

  // Check if approval button should be enabled
  const canApprove = useMemo(() => {
    return approvalStatus?.canApprove === true;
  }, [approvalStatus]);

  // Get approval requirements status
  const approvalRequirements = approvalStatus?.approvalRequirements;

  if (isLoading) {
    return (
      <Stack gap="md" className={className}>
        <Text c="dimmed">Loading regression stage...</Text>
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
        No regression stage data available
      </Alert>
    );
  }

  return (
    <Stack gap="lg" className={className}>
      {/* Regression Cycles List */}
      <RegressionCyclesList
        cycles={cycles}
        currentCycle={currentCycle}
        tasks={tasks}
        availableBuilds={availableBuilds}
        upcomingSlot={upcomingSlot}
        tenantId={tenantId}
        releaseId={releaseId}
        onRetryTask={handleRetry}
        onViewTaskDetails={handleViewTaskDetails}
      />

      {/* Approval Section */}
      {approvalStatus && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Text fw={600} size="lg" mb="xs">
                  Regression Approval
                </Text>
                <Text size="sm" c="dimmed">
                  {canApprove
                    ? 'All requirements met. Ready to approve and proceed to post-regression.'
                    : 'Complete all requirements before approving regression stage.'}
                </Text>
              </div>
            </Group>

            {/* Approval Requirements */}
            <Stack gap="xs">
              <Text size="sm" fw={500} c="dimmed">
                Requirements
              </Text>
              
              {/* Test Management Status */}
              {testManagementStatus.data && (
                <Group gap="sm">
                  {testManagementStatus.data.status === 'COMPLETED' ? (
                    <IconCheck size={16} color="green" />
                  ) : (
                    <IconX size={16} color="red" />
                  )}
                  <Text size="sm">
                    Test Management:{' '}
                    {testManagementStatus.data.status === 'COMPLETED' ? (
                      <Text component="span" c="green" fw={500}>
                        Passed
                      </Text>
                    ) : (
                      <Text component="span" c="red" fw={500}>
                        {testManagementStatus.data.status || 'Pending'}
                      </Text>
                    )}
                  </Text>
                  {testManagementStatus.data.runLink && (
                    <Anchor href={testManagementStatus.data.runLink} target="_blank" size="sm">
                      View Results
                    </Anchor>
                  )}
                </Group>
              )}

              {/* Cherry Pick Status */}
              {cherryPickStatus.data && (
                <Group gap="sm">
                  {cherryPickStatus.data.status === 'OK' ? (
                    <IconCheck size={16} color="green" />
                  ) : (
                    <IconX size={16} color="red" />
                  )}
                  <Text size="sm">
                    Cherry Pick Status:{' '}
                    {cherryPickStatus.data.status === 'OK' ? (
                      <Text component="span" c="green" fw={500}>
                        OK
                      </Text>
                    ) : (
                      <Text component="span" c="red" fw={500}>
                        {cherryPickStatus.data.status || 'Pending'}
                      </Text>
                    )}
                  </Text>
                  {cherryPickStatus.data.status !== 'OK' && cherryPickStatus.data.pendingCherryPicks && (
                    <Text size="xs" c="dimmed">
                      ({cherryPickStatus.data.pendingCherryPicks.length} pending)
                    </Text>
                  )}
                </Group>
              )}

              {/* Cycles Completed */}
              {approvalRequirements && (
                <Group gap="sm">
                  {approvalRequirements.cyclesCompleted ? (
                    <IconCheck size={16} color="green" />
                  ) : (
                    <IconX size={16} color="red" />
                  )}
                  <Text size="sm">
                    Cycles Completed:{' '}
                    {approvalRequirements.cyclesCompleted ? (
                      <Text component="span" c="green" fw={500}>
                        Yes
                      </Text>
                    ) : (
                      <Text component="span" c="red" fw={500}>
                        No
                      </Text>
                    )}
                  </Text>
                </Group>
              )}
            </Stack>

            {/* Approve Button */}
            <Button
              size="lg"
              disabled={!canApprove}
              onClick={handleApprove}
              leftSection={<IconRocket size={18} />}
              loading={approveMutation.isLoading}
              fullWidth
            >
              Approve Regression Stage
            </Button>

            {/* Approval Requirements Not Met Warning */}
            {!canApprove && approvalRequirements && (
              <Alert icon={<IconInfoCircle size={16} />} color="yellow" variant="light">
                <Text size="sm">
                  Cannot approve yet. Please ensure:
                </Text>
                <Stack gap="xs" mt="xs">
                  {!approvalRequirements.testManagementPassed && (
                    <Text size="xs">• Test management must pass</Text>
                  )}
                  {!approvalRequirements.cherryPickStatusOk && (
                    <Text size="xs">• Cherry pick status must be OK</Text>
                  )}
                  {!approvalRequirements.cyclesCompleted && (
                    <Text size="xs">• All regression cycles must be completed</Text>
                  )}
                </Stack>
              </Alert>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

