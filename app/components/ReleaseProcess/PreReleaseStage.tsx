/**
 * PreReleaseStage Component
 * Displays pre-release stage with tasks
 * Similar to KickoffStage but with enhanced TaskCards for build, approval, and promotion tasks
 */

import { Stack, Group, Text, Badge } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useRouteLoaderData } from '@remix-run/react';
import { usePreReleaseStage, useProjectManagementStatus, useCompletePreReleaseStage } from '~/hooks/useReleaseProcess';
import { useTaskHandlers } from '~/hooks/useTaskHandlers';
import { useConfig } from '~/contexts/ConfigContext';
import { useRelease } from '~/hooks/useRelease';
import { usePermissions } from '~/hooks/usePermissions';
import type { Task } from '~/types/release-process.types';
import { TaskStage, TaskStatus } from '~/types/release-process-enums';
import { validateStageProps } from '~/utils/prop-validation';
import { handleStageError } from '~/utils/stage-error-handling';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import type { OrgLayoutLoaderData } from '~/routes/dashboard.$org';
import { StageErrorBoundary } from './shared/StageErrorBoundary';
import { PreReleaseTasksList } from './stages/PreReleaseTasksList';
import { StageApprovalSection, type ApprovalRequirement } from './shared/StageApprovalSection';
import { ApprovalConfirmationModal } from './shared/ApprovalConfirmationModal';

interface PreReleaseStageProps {
  tenantId: string;
  releaseId: string;
  className?: string;
}

export function PreReleaseStage({ tenantId, releaseId, className }: PreReleaseStageProps) {
  // Validate required props
  validateStageProps({ tenantId, releaseId }, 'PreReleaseStage');

  const { data, isLoading, error, refetch } = usePreReleaseStage(tenantId, releaseId);
  
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
  
  // Check if Project Management is configured and enabled
  const hasProjectManagement = !!(
    releaseConfig?.projectManagementConfig?.enabled && 
    releaseConfig.projectManagementConfig
  );
  
  // Use shared task handlers
  const { handleRetry } = useTaskHandlers({
    tenantId,
    releaseId,
    refetch,
  });
  
  // Use cherry-pick status API instead of extra-commits API
  // Cherry-pick status is already displayed in IntegrationsStatusSidebar
  // No need to show ExtraCommitsWarning here as cherry-pick status is handled in sidebar

  // Fetch project management status - only if configured
  const projectManagementStatus = useProjectManagementStatus(
    tenantId,
    releaseId,
    undefined, // No platform filter
    hasProjectManagement // Only enable if PM is configured
  );
  
  const completeMutation = useCompletePreReleaseStage(tenantId, releaseId);
  const [approvalModalOpened, setApprovalModalOpened] = useState(false);

  // Extract tasks and uploadedBuilds from data
  const tasks = data?.tasks || [];
  const uploadedBuilds = data?.uploadedBuilds || [];

  // Calculate approval requirements for Pre-Release
  const requirements: ApprovalRequirement[] = useMemo(() => {
    const reqs: ApprovalRequirement[] = [];
    
    // All tasks completed requirement
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
        ? 'No pre-release tasks found'
        : pendingTasks.length > 0
        ? `${pendingTasks.length} task(s) pending`
        : undefined,
    });

    // Project Management requirement - only if configured
    if (hasProjectManagement) {
      if (projectManagementStatus.data) {
        if ('platforms' in projectManagementStatus.data) {
          const allPlatformsCompleted = projectManagementStatus.data.platforms.every(
            (platform) => platform.isCompleted === true
          );
          reqs.push({
            label: 'Project Management',
            passed: allPlatformsCompleted,
            message: allPlatformsCompleted
              ? undefined
              : 'Some platforms have incomplete tickets.',
          });
        } else {
          reqs.push({
            label: 'Project Management',
            passed: projectManagementStatus.data.isCompleted === true,
          });
        }
      } else if (projectManagementStatus.isLoading) {
        // Still loading - show as pending
        reqs.push({
          label: 'Project Management',
          passed: false,
          message: 'Loading...',
        });
      } else if (projectManagementStatus.error) {
        // Error loading - show as failed
        reqs.push({
          label: 'Project Management',
          passed: false,
          message: 'Error loading status',
        });
      }
    }
    // If PM is not configured, don't add it to requirements (it's not required)

    return reqs;
  }, [tasks, hasProjectManagement, projectManagementStatus.data, projectManagementStatus.isLoading, projectManagementStatus.error]);

  const passedCount = useMemo(() => {
    return requirements.filter((r) => r.passed).length;
  }, [requirements]);

  const pendingCount = useMemo(() => {
    return requirements.filter((r) => !r.passed).length;
  }, [requirements]);

  // Calculate promotion readiness - all PRE_RELEASE tasks must be completed AND user has permission
  const canPromote = useMemo(() => {
    return requirements.every((r) => r.passed) && canPerform;
  }, [requirements, canPerform]);

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
      isLoading={isLoading}
      error={error}
      data={data}
      stageName="pre-release stage"
    >
      <Stack gap="lg" className={className}>
      {/* Tasks List */}
      <PreReleaseTasksList
        tasks={tasks}
        tenantId={tenantId}
        releaseId={releaseId}
        onRetry={handleRetry}
        uploadedBuilds={uploadedBuilds}
      />

      {/* Approval Section - Show if PM is configured OR if there are other requirements */}
      {(hasProjectManagement || requirements.length > 0) && (
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
                        <Badge color="green" size="sm">Completed</Badge>
                      ) : platform.hasTicket ? (
                        <Badge color="blue" size="sm">In Progress</Badge>
                      ) : (
                        <Badge color="gray" size="sm">No Ticket</Badge>
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

