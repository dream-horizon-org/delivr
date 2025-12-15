/**
 * RegressionStage Component
 * Main orchestrator component for regression stage
 * Displays cycles, tasks, approval workflow, and manual build uploads
 */

import {
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
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
import { StageApprovalSection, type ApprovalRequirement } from './shared/StageApprovalSection';

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

  // Transform approvalRequirements to ApprovalRequirement[]
  const requirements: ApprovalRequirement[] = useMemo(() => {
    if (!approvalRequirements) return [];
    
    return [
      {
        label: 'Test Management',
        passed: approvalRequirements.testManagementPassed,
      },
      {
        label: 'Cherry Pick Status',
        passed: approvalRequirements.cherryPickStatusOk,
        message: approvalRequirements.cherryPickStatusOk
          ? undefined
          : 'New cherry picks found. Add regression slot to test changes.',
      },
      {
        label: 'All Cycles Completed',
        passed: approvalRequirements.cyclesCompleted,
      },
    ];
  }, [approvalRequirements]);

  const passedCount = useMemo(() => {
    return requirements.filter((r) => r.passed).length;
  }, [requirements]);

  const pendingCount = useMemo(() => {
    return requirements.filter((r) => !r.passed).length;
  }, [requirements]);

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
        <StageApprovalSection
          title="Regression Approval"
          canApprove={canApprove}
          onApprove={handleApprove}
          isApproving={approveMutation.isLoading}
          approvalButtonText="Approve Regression Stage"
          requirements={requirements}
          passedCount={passedCount}
          pendingCount={pendingCount}
        />
      )}
      </Stack>
    </StageErrorBoundary>
  );
}

