/**
 * RegressionStage Component
 * Main orchestrator component for regression stage
 * Displays cycles, tasks, approval workflow, and manual build uploads
 */

import {
  Accordion,
  Button,
  Card,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { IconCheck, IconRocket, IconX } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import {
  useRegressionStage,
  useApproveRegression,
} from '~/hooks/useReleaseProcess';
import { useTaskHandlers } from '~/hooks/useTaskHandlers';
import { validateStageProps } from '~/utils/prop-validation';
import { handleStageError } from '~/utils/stage-error-handling';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { StageErrorBoundary } from './shared/StageErrorBoundary';
import { RegressionCyclesList } from './RegressionCyclesList';

interface RegressionStageProps {
  tenantId: string;
  releaseId: string;
  className?: string;
}

export function RegressionStage({ tenantId, releaseId, className }: RegressionStageProps) {
  // Validate required props
  validateStageProps({ tenantId, releaseId }, 'RegressionStage');

  const { data, isLoading, error, refetch } = useRegressionStage(tenantId, releaseId);
  const approveMutation = useApproveRegression(tenantId, releaseId);

  // Use shared task handlers
  const { handleRetry } = useTaskHandlers({
    tenantId,
    releaseId,
    refetch,
  });

  // Extract data from response
  const cycles = data?.cycles || [];
  const currentCycle = data?.currentCycle || null;
  const tasks = data?.tasks || [];
  const uploadedBuilds = data?.uploadedBuilds || [];
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
      handleStageError(error, 'approve regression stage');
    }
  }, [approvalStatus, approveMutation, refetch]);

  // Check if approval button should be enabled
  const canApprove = useMemo(() => {
    return approvalStatus?.canApprove === true;
  }, [approvalStatus]);

  // Get approval requirements status
  const approvalRequirements = approvalStatus?.approvalRequirements;

  return (
    <StageErrorBoundary
      isLoading={isLoading}
      error={error}
      data={data}
      stageName="regression stage"
    >
      <Stack gap="lg" className={className}>
      {/* Regression Cycles List */}
      <RegressionCyclesList
        cycles={cycles}
        currentCycle={currentCycle}
        tasks={tasks}
        uploadedBuilds={uploadedBuilds}
        upcomingSlot={upcomingSlot ?? null}
        tenantId={tenantId}
        releaseId={releaseId}
        onRetryTask={handleRetry}
      />

      {/* Approval Section */}
      {approvalStatus && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="center" wrap="nowrap">
              <div style={{ flex: 1 }}>
                <Text fw={600} size="lg" mb={4}>
                  Regression Approval
                </Text>
                {approvalRequirements && (
                  <Group gap="md">
                    <Text size="sm" c="green">
                      Passed: {Object.values(approvalRequirements).filter(v => v).length}
                    </Text>
                    <Text size="sm" c="red">
                      Pending: {Object.values(approvalRequirements).filter(v => !v).length}
                    </Text>
                  </Group>
                )}
              </div>
              <Button
                size="md"
                disabled={!canApprove}
                onClick={handleApprove}
                leftSection={<IconRocket size={18} />}
                loading={approveMutation.isLoading}
              >
                Approve Regression Stage
              </Button>
            </Group>

            {/* Approval Requirements - Accordion */}
            {approvalRequirements && (
              <Accordion variant="separated" radius="md">
                <Accordion.Item value="requirements">
                  <Accordion.Control>
                    <Text size="sm" fw={500}>
                      View Requirements
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      {/* Test Management */}
                      <Group gap="sm">
                        {approvalRequirements.testManagementPassed ? (
                          <IconCheck size={16} color="green" />
                        ) : (
                          <IconX size={16} color="red" />
                        )}
                        <Text size="sm">
                          {approvalRequirements.testManagementPassed ? (
                            <Text component="span" c="green" fw={500}>Test Management</Text>
                          ) : (
                            <Text component="span" c="red">Test Management</Text>
                          )}
                        </Text>
                      </Group>

                      {/* Cherry Pick Status */}
                      <Group gap="sm" align="flex-start">
                        {approvalRequirements.cherryPickStatusOk ? (
                          <IconCheck size={16} color="green" style={{ marginTop: 2 }} />
                        ) : (
                          <IconX size={16} color="red" style={{ marginTop: 2 }} />
                        )}
                        <Text size="sm" style={{ flex: 1 }}>
                          {approvalRequirements.cherryPickStatusOk ? (
                            <Text component="span" c="green" fw={500}>Cherry Pick Status</Text>
                          ) : (
                            <Text component="span" c="red">
                              Cherry Pick Status: New cherry picks found. Add regression slot to test changes.
                            </Text>
                          )}
                        </Text>
                      </Group>

                      {/* Cycles Completed */}
                      <Group gap="sm">
                        {approvalRequirements.cyclesCompleted ? (
                          <IconCheck size={16} color="green" />
                        ) : (
                          <IconX size={16} color="red" />
                        )}
                        <Text size="sm">
                          {approvalRequirements.cyclesCompleted ? (
                            <Text component="span" c="green" fw={500}>All Cycles Completed</Text>
                          ) : (
                            <Text component="span" c="red">Cycles Pending</Text>
                          )}
                        </Text>
                      </Group>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            )}
          </Stack>
        </Card>
      )}
      </Stack>
    </StageErrorBoundary>
  );
}

