/**
 * PreReleaseStage Component
 * Displays pre-release stage with tasks
 * Similar to KickoffStage but with enhanced TaskCards for build, approval, and promotion tasks
 */

import { Stack, Group, Text, Badge } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { usePreReleaseStage, useProjectManagementStatus, useCompletePreReleaseStage } from '~/hooks/useReleaseProcess';
import { useTaskHandlers } from '~/hooks/useTaskHandlers';
import type { Task } from '~/types/release-process.types';
import { TaskStage, TaskStatus } from '~/types/release-process-enums';
import { validateStageProps } from '~/utils/prop-validation';
import { handleStageError } from '~/utils/stage-error-handling';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
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
  
  // Use shared task handlers
  const { handleRetry } = useTaskHandlers({
    tenantId,
    releaseId,
    refetch,
  });
  
  // Use cherry-pick status API instead of extra-commits API
  // Cherry-pick status is already displayed in IntegrationsStatusSidebar
  // No need to show ExtraCommitsWarning here as cherry-pick status is handled in sidebar

  // Fetch project management status using the correct API contract endpoint
  const projectManagementStatus = useProjectManagementStatus(tenantId, releaseId);
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

    // Project Management requirement (platform-wise)
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
    } else if (!projectManagementStatus.isLoading) {
      // No PM integration configured
      reqs.push({
        label: 'Project Management',
        passed: true, // No PM integration means no requirement
      });
    }

    return reqs;
  }, [tasks, projectManagementStatus.data, projectManagementStatus.isLoading]);

  const passedCount = useMemo(() => {
    return requirements.filter((r) => r.passed).length;
  }, [requirements]);

  const pendingCount = useMemo(() => {
    return requirements.filter((r) => !r.passed).length;
  }, [requirements]);

  // Calculate promotion readiness - all PRE_RELEASE tasks must be completed
  const canPromote = useMemo(() => {
    return requirements.every((r) => r.passed);
  }, [requirements]);

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
        notes: comments || undefined,
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

      {/* Approval Section */}
      {(projectManagementStatus.data || projectManagementStatus.isLoading) && (
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
              {projectManagementStatus.data && 'platforms' in projectManagementStatus.data && (
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

