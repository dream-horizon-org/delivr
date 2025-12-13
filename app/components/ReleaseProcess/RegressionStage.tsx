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
} from '~/constants/release-process-ui';
import {
  useRegressionStage,
  useApproveRegression,
  useTestManagementStatus,
  useCherryPickStatus,
} from '~/hooks/useReleaseProcess';
import { useTaskHandlers } from '~/hooks/useTaskHandlers';
import type { Task } from '~/types/release-process.types';
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
  const approveMutation = useApproveRegression(tenantId, releaseId);

  // Fetch status checks
  const testManagementStatus = useTestManagementStatus(tenantId, releaseId);
  const cherryPickStatus = useCherryPickStatus(tenantId, releaseId);

  // Use shared task handlers
  const { handleRetry, handleViewDetails } = useTaskHandlers({
    tenantId,
    releaseId,
    refetch,
  });

  // Extract data from response
  const cycles = data?.cycles || [];
  const currentCycle = data?.currentCycle || null;
  const tasks = data?.tasks || [];
  const availableBuilds = data?.availableBuilds || [];
  const upcomingSlot = data?.upcomingSlot;
  const approvalStatus = data?.approvalStatus;

  const handleApprove = useCallback(async () => {
    if (!approvalStatus?.canApprove) {
      showErrorToast({ message: 'Approval requirements not met' });
      return;
    }

    try {
      // Backend will extract user ID from authenticated session
      // The BFF route uses authenticateActionRequest which provides user context
      await approveMutation.mutateAsync({
        approvedBy: '', // Backend extracts from session, this field may be optional
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
        upcomingSlot={upcomingSlot ?? null}
        tenantId={tenantId}
        releaseId={releaseId}
        onRetryTask={handleRetry}
        onViewTaskDetails={handleViewDetails}
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
              {testManagementStatus.data && 'status' in testManagementStatus.data && (
                <Group gap="sm">
                  {testManagementStatus.data.status === 'PASSED' ? (
                    <IconCheck size={16} color="green" />
                  ) : (
                    <IconX size={16} color="red" />
                  )}
                  <Text size="sm">
                    Test Management:{' '}
                    {testManagementStatus.data.status === 'PASSED' ? (
                      <Text component="span" c="green" fw={500}>
                        Passed
                      </Text>
                    ) : (
                      <Text component="span" c="red" fw={500}>
                        {testManagementStatus.data.status || 'Pending'}
                      </Text>
                    )}
                  </Text>
                  {'runLink' in testManagementStatus.data && testManagementStatus.data.runLink && (
                    <Anchor href={testManagementStatus.data.runLink} target="_blank" size="sm">
                      View Results
                    </Anchor>
                  )}
                </Group>
              )}

              {/* Cherry Pick Status */}
              {cherryPickStatus.data && (
                <Group gap="sm">
                  {!cherryPickStatus.data.cherryPickAvailable ? (
                    <IconCheck size={16} color="green" />
                  ) : (
                    <IconX size={16} color="red" />
                  )}
                  <Text size="sm">
                    Cherry Pick Status:{' '}
                    {!cherryPickStatus.data.cherryPickAvailable ? (
                      <Text component="span" c="green" fw={500}>
                        OK
                      </Text>
                    ) : (
                      <Text component="span" c="red" fw={500}>
                        Pending
                      </Text>
                    )}
                  </Text>
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
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

