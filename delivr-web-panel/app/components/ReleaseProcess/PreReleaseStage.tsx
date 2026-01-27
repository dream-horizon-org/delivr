/**
 * PreReleaseStage Component
 * Displays pre-release stage with tasks
 * Similar to KickoffStage but with enhanced TaskCards for build, approval, and promotion tasks
 */

import { Stack, Group, Text, Alert } from '@mantine/core';
import { IconCheck, IconX, IconInfoCircle } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useRouteLoaderData } from '@remix-run/react';
import { usePreReleaseStage, useProjectManagementStatus, useCompletePreReleaseStage } from '~/hooks/useReleaseProcess';
import { useTaskHandlers } from '~/hooks/useTaskHandlers';
import { useConfig } from '~/contexts/ConfigContext';
import { useRelease } from '~/hooks/useRelease';
import { usePermissions } from '~/hooks/usePermissions';
import type { Task } from '~/types/release-process.types';
import { TaskStage, TaskStatus, StageStatus, ReleaseStatus } from '~/types/release-process-enums';
import { validateStageProps } from '~/utils/prop-validation';
import { handleStageError } from '~/utils/stage-error-handling';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import type { OrgLayoutLoaderData } from '~/routes/dashboard.$org';
import { StageErrorBoundary } from './shared/StageErrorBoundary';
import { PreReleaseTasksList } from './stages/PreReleaseTasksList';
import { StageApprovalSection, type ApprovalRequirement } from './shared/StageApprovalSection';
import { ApprovalConfirmationModal } from './shared/ApprovalConfirmationModal';
import { AppBadge } from '~/components/Common/AppBadge';

interface PreReleaseStageProps {
  appId: string;
  releaseId: string;
  className?: string;
}

export function PreReleaseStage({ appId, releaseId, className }: PreReleaseStageProps) {
  // Validate required props
  validateStageProps({ appId, releaseId }, 'PreReleaseStage');

  const { data, isLoading, error, refetch, dataUpdatedAt } = usePreReleaseStage(appId, releaseId);
  
  // Get release data to access releaseConfigId
  const { release } = useRelease(appId, releaseId);

  // Get user data and check permissions
  const orgLayoutData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  const userId = orgLayoutData?.user?.user?.id || '';
  const { canPerformReleaseAction } = usePermissions(appId, userId);
  const canPerform = canPerformReleaseAction(release?.releasePilotAccountId || null);
  
  // Get cached release configs from ConfigContext
  const { releaseConfigs } = useConfig();
  
  // Find the release config for this release
  const releaseConfig = release?.releaseConfigId 
    ? releaseConfigs.find((c) => c.id === release.releaseConfigId)
    : null;
  
  // Check if Project Management is configured and enabled
  const hasProjectManagement = !!(
    releaseConfig?.projectManagementConfig?.enabled && 
    releaseConfig.projectManagementConfig
  );
  
  // Use shared task handlers
  const { handleRetry } = useTaskHandlers({
    appId,
    releaseId,
    refetch,
  });
  
  // Use cherry-pick status API instead of extra-commits API
  // Cherry-pick status is already displayed in IntegrationsStatusSidebar
  // No need to show ExtraCommitsWarning here as cherry-pick status is handled in sidebar

  // Fetch project management status - only if configured
  const projectManagementStatus = useProjectManagementStatus(
    appId,
    releaseId,
    undefined, // No platform filter
    hasProjectManagement // Only enable if PM is configured
  );
  
  const completeMutation = useCompletePreReleaseStage(appId, releaseId);
  const [approvalModalOpened, setApprovalModalOpened] = useState(false);

  // Extract tasks, uploadedBuilds, and approvalStatus from data
  const tasks = data?.tasks || [];
  const uploadedBuilds = data?.uploadedBuilds || [];
  const approvalStatus = data?.approvalStatus;

  // Check if stage is already completed
  const isStageCompleted = data?.stageStatus === StageStatus.COMPLETED;
  // Check if we're in transition state (data loaded but no tasks yet)
  // This happens when transitioning from stage 2 to stage 3 - tasks are being created
  const isFetchingTasks = isLoading || (data && tasks.length === 0);

  // Get approval requirements from backend
  const approvalRequirements = approvalStatus?.approvalRequirements;

  // Calculate approval requirements for Pre-Release
  // Always check tasks completion + backend PM requirement if configured
  const requirements: ApprovalRequirement[] = useMemo(() => {
    const reqs: ApprovalRequirement[] = [];
    
    // ALWAYS check: All Tasks Completed requirement
    // Filter for PRE_RELEASE stage tasks only
    const preReleaseTasks = tasks.filter((t: Task) => t.stage === TaskStage.PRE_RELEASE);
    
    // Count pending tasks (not completed, not skipped)
    const pendingTasks = preReleaseTasks.filter(
      (t: Task) => t.taskStatus !== TaskStatus.COMPLETED && t.taskStatus !== TaskStatus.SKIPPED
    );
    
    // Only show as passed if there are tasks AND all are completed (or skipped)
    // If no tasks exist, show as not passed (can't approve without tasks)
    const allTasksCompleted = preReleaseTasks.length > 0 && pendingTasks.length === 0;
    
    reqs.push({
      label: 'All Tasks Completed',
      passed: allTasksCompleted,
      message: preReleaseTasks.length === 0 
        ? 'Please wait while we are fetching the tasks...'
        : pendingTasks.length > 0
        ? `${pendingTasks.length} task(s) pending`
        : undefined,
    });

    // Project Management requirement - from backend if configured
    if (hasProjectManagement && approvalRequirements) {
      reqs.push({
        label: 'Project Management',
        passed: approvalRequirements.projectManagementPassed,
        message: approvalRequirements.projectManagementPassed
          ? undefined
          : 'Some platforms have incomplete tickets.',
      });
    }
    
    return reqs;
  }, [tasks, hasProjectManagement, approvalRequirements]);

  const passedCount = useMemo(() => {
    return requirements.filter((r) => r.passed).length;
  }, [requirements]);

  const pendingCount = useMemo(() => {
    return requirements.filter((r) => !r.passed).length;
  }, [requirements]);

  // Check if approval button should be enabled (combine requirements with permissions)
  // Disable if distribution stage has started (similar to regression stage logic)
  const canPromote = useMemo(() => {
    // Disable if distribution stage is already in progress or completed
    // Distribution only gets triggered when approval is given, so if it's already started,
    // the approval button should be disabled
    const isDistributionInProgress = release?.cronJob?.stage4Status === StageStatus.IN_PROGRESS || 
                                     release?.cronJob?.stage4Status === StageStatus.COMPLETED;
    
    if (isDistributionInProgress) {
      return false;
    }
    
    // All requirements must pass AND user must have permission
    return requirements.every((r) => r.passed) && canPerform;
  }, [requirements, canPerform, release?.cronJob?.stage4Status]);

  const handleApproveClick = useCallback(() => {
    if (!canPromote) {
      showErrorToast({ message: 'Approval requirements not met' });
      return;
    }
    setApprovalModalOpened(true);
  }, [canPromote]);

  const handleApprove = useCallback(async (comments?: string) => {
    try {
      await completeMutation.mutateAsync({
        comments: comments || undefined,
      });
      setApprovalModalOpened(false);
      showSuccessToast({ message: 'Pre-release stage approved successfully' });
      await refetch();
    } catch (error) {
      handleStageError(error, 'approve pre-release stage');
    }
  }, [completeMutation, refetch]);

  return (
    <StageErrorBoundary
      isLoading={false} // We handle loading state ourselves
      error={error}
      data={data}
      stageName="pre-release stage"
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
        {!isFetchingTasks && tasks.length > 0 && (
          <PreReleaseTasksList
            tasks={tasks}
            appId={appId}
            releaseId={releaseId}
            isArchived={release?.status === ReleaseStatus.ARCHIVED}
            onRetry={handleRetry}
            uploadedBuilds={uploadedBuilds}
            lastUpdatedAt={dataUpdatedAt}
          />
        )}

        
        {/* Approval Section - Show when tasks are loaded and distribution hasn't started */}
        {/* Show approval section even if stage is COMPLETED, as long as distribution hasn't started */}
        {!isFetchingTasks && 
         requirements.length > 0 && 
         release?.cronJob?.stage4Status !== StageStatus.IN_PROGRESS &&
         release?.cronJob?.stage4Status !== StageStatus.COMPLETED && (
        <StageApprovalSection
          title="Pre-Release Approval"
          canApprove={canPromote}
          onApprove={handleApproveClick}
          isApproving={completeMutation.isLoading}
          approvalButtonText="Approve Pre-Release Stage"
          requirements={requirements}
          passedCount={passedCount}
          pendingCount={pendingCount}
          renderRequirements={() => (
            <Stack gap="sm">
              {requirements.map((req, index) => (
                <Group key={index} gap="sm">
                  {req.passed ? (
                    <IconCheck size={16} color="green" />
                  ) : (
                    <IconX size={16} color="red" />
                  )}
                  <Text size="sm" style={{ flex: 1 }}>
                    {req.passed ? (
                      <Text component="span" c="green" fw={500}>
                        {req.label}
                      </Text>
                    ) : (
                      <Text component="span" c="red">
                        {req.label}
                        {req.message && `: ${req.message}`}
                      </Text>
                    )}
                  </Text>
                </Group>
              ))}
              {/* Show platform details for PM if available */}
              {hasProjectManagement && projectManagementStatus.data && 'platforms' in projectManagementStatus.data && (
                <Stack gap="xs" mt="sm" pl="md">
                  {projectManagementStatus.data.platforms.map((platform, idx) => (
                    <Group key={idx} gap="xs" justify="space-between">
                      <Text size="xs" c="dimmed">
                        {platform.platform}
                      </Text>
                      {platform.isCompleted ? (
                        <AppBadge
                          type="status"
                          value="success"
                          title="Completed"
                          size="sm"
                        />
                      ) : platform.hasTicket ? (
                        <AppBadge
                          type="status"
                          value="info"
                          title="In Progress"
                          size="sm"
                        />
                      ) : (
                        <AppBadge
                          type="status"
                          value="neutral"
                          title="No Ticket"
                          size="sm"
                        />
                      )}
                      {platform.ticketKey && (
                        <Text size="xs" c="dimmed" ml="xs">
                          {platform.ticketKey}
                        </Text>
                      )}
                    </Group>
                  ))}
                </Stack>
              )}
            </Stack>
          )}
        />
      )}

      {/* Show completion message if stage is completed AND distribution has started */}
      {isStageCompleted && 
       (release?.cronJob?.stage4Status === StageStatus.IN_PROGRESS ||
        release?.cronJob?.stage4Status === StageStatus.COMPLETED) && (
        <Alert 
          icon={<IconCheck size={16} />} 
          color="green" 
          variant="light" 
          radius="md"
        >
          <Text size="sm" fw={500}>Pre-Release stage has been completed</Text>
        </Alert>
      )}

      {/* Approval Confirmation Modal */}
      <ApprovalConfirmationModal
        opened={approvalModalOpened}
        onClose={() => setApprovalModalOpened(false)}
        onConfirm={handleApprove}
        title="Approve Pre-Release Stage"
        message="Are you sure you want to approve the pre-release stage? This will complete the pre-release stage."
        confirmLabel="Approve"
        isLoading={completeMutation.isLoading}
      />
      </Stack>
    </StageErrorBoundary>
  );
}

