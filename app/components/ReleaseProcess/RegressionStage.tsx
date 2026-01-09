/**
 * RegressionStage Component
 * Main orchestrator component for regression stage
 * Displays cycles, tasks, approval workflow, and manual build uploads
 */

import {
  Alert,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { IconArchive, IconCheck, IconX, IconInfoCircle } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useRouteLoaderData } from '@remix-run/react';
import {
  useRegressionStage,
  useApproveRegression,
} from '~/hooks/useReleaseProcess';
import { useTaskHandlers } from '~/hooks/useTaskHandlers';
import { useConfig } from '~/contexts/ConfigContext';
import { useRelease } from '~/hooks/useRelease';
import { usePermissions } from '~/hooks/usePermissions';
import { validateStageProps } from '~/utils/prop-validation';
import { handleStageError } from '~/utils/stage-error-handling';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import type { OrgLayoutLoaderData } from '~/routes/dashboard.$org';
import { StageStatus, ReleaseStatus } from '~/types/release-process-enums';
import { StageErrorBoundary } from './shared/StageErrorBoundary';
import { RegressionCyclesList } from './RegressionCyclesList';
import { StageApprovalSection, type ApprovalRequirement } from './shared/StageApprovalSection';
import { ApprovalConfirmationModal } from './shared/ApprovalConfirmationModal';

interface RegressionStageProps {
  tenantId: string;
  releaseId: string;
  className?: string;
}

export function RegressionStage({ tenantId, releaseId, className }: RegressionStageProps) {
  // Validate required props
  validateStageProps({ tenantId, releaseId }, 'RegressionStage');

  // Enable polling to keep data fresh, especially for upcomingRegressions which can change
  // when slots are executed and removed on the backend
  const { data, isLoading, error, refetch } = useRegressionStage(tenantId, releaseId, true);
  
  // Get release data to access releaseConfigId
  const { release } = useRelease(tenantId, releaseId);

  // Get user data and check permissions
  const orgLayoutData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  const userId = orgLayoutData?.user?.user?.id || '';
  const { canPerformReleaseAction } = usePermissions(tenantId, userId);
  const canPerform = canPerformReleaseAction(release?.releasePilotAccountId || null);
  
  // Get cached release configs from ConfigContext
  const { releaseConfigs } = useConfig();
  
  // Find the release config for this release
  const releaseConfig = release?.releaseConfigId 
    ? releaseConfigs.find((c) => c.id === release.releaseConfigId)
    : null;
  
  // Check if Test Management is configured and enabled
  const hasTestManagement = !!(
    releaseConfig?.testManagementConfig?.enabled && 
    releaseConfig.testManagementConfig
  );
  
  const approveMutation = useApproveRegression(tenantId, releaseId);
  const [approvalModalOpened, setApprovalModalOpened] = useState(false);

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

  // Show loading message only when actively fetching data
  // Don't show when tasks.length === 0 because tasks are created cycle-wise
  // and future cycles might not have tasks yet
  const isFetchingTasks = isLoading;

  const handleApproveClick = useCallback(() => {
    if (!approvalStatus?.canApprove) {
      showErrorToast({ message: 'Approval requirements not met' });
      return;
    }
    setApprovalModalOpened(true);
  }, [approvalStatus]);

  const handleApprove = useCallback(async (comments?: string) => {
    try {
      // Backend will extract user ID from authenticated session
      // The BFF route uses authenticateActionRequest which provides user context
      await approveMutation.mutateAsync({
        approvedBy: userId, // Backend extracts from session, this field may be optional
        comments: comments || undefined,
      });
      
      setApprovalModalOpened(false);
      showSuccessToast({ message: 'Regression stage approved successfully' });
      await refetch();
    } catch (error) {
      handleStageError(error, 'approve regression stage');
    }
  }, [approveMutation, refetch]);

  // Check if approval button should be enabled (combine requirements with permissions)
  const canApprove = useMemo(() => {
    // Disable if pre-release is already in progress or completed
    // Pre-release only gets triggered when approval is given, so if it's already started,
    // the approval button should be disabled
    const isPreReleaseInProgress = release?.cronJob?.stage3Status === StageStatus.IN_PROGRESS || 
                                    release?.cronJob?.stage3Status === StageStatus.COMPLETED;
    
    if (isPreReleaseInProgress) {
      return false;
    }
    
    return approvalStatus?.canApprove === true && canPerform;
  }, [approvalStatus, canPerform, release?.cronJob?.stage3Status]);

  // Get approval requirements status
  const approvalRequirements = approvalStatus?.approvalRequirements;

  // Transform approvalRequirements to ApprovalRequirement[]
  // Only include Test Management if it's configured
  const requirements: ApprovalRequirement[] = useMemo(() => {
    if (!approvalRequirements) return [];
    
    const reqs: ApprovalRequirement[] = [];
    
    // Test Management requirement - only if configured
    if (hasTestManagement) {
      reqs.push({
        label: 'Test Management',
        passed: approvalRequirements.testManagementPassed,
      });
    }
    // If Test Management is not configured, don't add it to requirements (it's not required)
    
    // Cherry Pick Status - always required
    reqs.push({
      label: 'Cherry Pick Status',
      passed: approvalRequirements.cherryPickStatusOk,
      message: approvalRequirements.cherryPickStatusOk
        ? undefined
        : 'New cherry picks found. Add regression slot to test changes.',
    });
    
    // All Cycles Completed - always required
    reqs.push({
      label: 'All Cycles Completed',
      passed: approvalRequirements.cyclesCompleted,
    });
    
    return reqs;
  }, [approvalRequirements, hasTestManagement]);

  const passedCount = useMemo(() => {
    return requirements.filter((r) => r.passed).length;
  }, [requirements]);

  const pendingCount = useMemo(() => {
    return requirements.filter((r) => !r.passed).length;
  }, [requirements]);

  const isArchived = release?.status === ReleaseStatus.ARCHIVED;

  return (
    <StageErrorBoundary
      isLoading={false} // We handle loading state ourselves
      error={error}
      data={data}
      stageName="regression stage"
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

        {/* Archived Message Banner */}
        {isArchived && (
          <Alert
            icon={<IconArchive size={16} />}
            title="This release is archived"
            color="gray"
            variant="light"
          >
            <Text size="sm">
              This release has been archived. You can view the tasks and history, but no actions can be performed.
            </Text>
          </Alert>
        )}

        {/* Regression Cycles List - Only show when tasks are available */}
        {!isFetchingTasks && (
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
        )}

      {/* Approval Section */}
      {approvalStatus && (
        <StageApprovalSection
          title="Regression Approval"
          canApprove={canApprove}
          onApprove={handleApproveClick}
          isApproving={approveMutation.isLoading}
          approvalButtonText="Approve Regression Stage"
          requirements={requirements}
          passedCount={passedCount}
          pendingCount={pendingCount}
        />
      )}

      {/* Approval Confirmation Modal */}
      <ApprovalConfirmationModal
        opened={approvalModalOpened}
        onClose={() => setApprovalModalOpened(false)}
        onConfirm={handleApprove}
        title="Approve Regression Stage"
        message="Are you sure you want to approve the regression stage? This will trigger the pre-release stage."
        confirmLabel="Approve"
        isLoading={approveMutation.isLoading}
      />
      </Stack>
    </StageErrorBoundary>
  );
}

