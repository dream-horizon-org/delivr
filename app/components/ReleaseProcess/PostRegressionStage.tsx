/**
 * PostRegressionStage Component
 * Displays post-regression stage with tasks
 * Similar to KickoffStage but with enhanced TaskCards for build, approval, and promotion tasks
 */

import { Alert, Button, Card, Group, Select, Stack, Text } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';
import { IconInfoCircle } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExtraCommitsWarning } from '~/components/distribution';
import { ManualApprovalDialog } from '~/components/distribution';
import {
  ERROR_MESSAGES,
  POST_REGRESSION_LABELS,
  TASK_STATUS_LABELS,
} from '~/constants/release-process-ui';
import { DIALOG_TITLES } from '~/constants/distribution.constants';
import { usePostRegressionStage, useRetryTask, useCompletePostRegression } from '~/hooks/useReleaseProcess';
import type { Task } from '~/types/release-process.types';
import { TaskStatus, TaskType } from '~/types/release-process-enums';
import { getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { apiGet } from '~/utils/api-client';
import type { ExtraCommitsResponse, PMStatusResponse } from '~/types/distribution.types';
import { ApproverRole } from '~/types/distribution.types';
import { transformTaskToPMStatus } from '~/utils/post-regression-transformers';
import { TaskCard } from './TaskCard';

interface PostRegressionStageProps {
  tenantId: string;
  releaseId: string;
  className?: string;
}

export function PostRegressionStage({ tenantId, releaseId, className }: PostRegressionStageProps) {
  const { data, isLoading, error, refetch } = usePostRegressionStage(tenantId, releaseId);
  const retryMutation = useRetryTask(tenantId, releaseId);
  const completeMutation = useCompletePostRegression(tenantId, releaseId);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Modal states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalTaskId, setApprovalTaskId] = useState<string | null>(null);
  
  // Extra commits and PM status
  const [extraCommits, setExtraCommits] = useState<ExtraCommitsResponse['data'] | null>(null);
  const [pmStatus, setPmStatus] = useState<PMStatusResponse['data'] | null>(null);
  const [isLoadingExtraData, setIsLoadingExtraData] = useState(false);

  // Fetch extra commits and PM status
  useEffect(() => {
    const fetchExtraData = async () => {
      setIsLoadingExtraData(true);
      try {
        const [extraCommitsResult, pmStatusResult] = await Promise.all([
          apiGet<ExtraCommitsResponse>(`/api/v1/releases/${releaseId}/extra-commits`),
          apiGet<PMStatusResponse>(`/api/v1/releases/${releaseId}/pm-status`),
        ]);
        
        if (extraCommitsResult.success && extraCommitsResult.data) {
          setExtraCommits(extraCommitsResult.data.data);
        }
        if (pmStatusResult.success && pmStatusResult.data) {
          setPmStatus(pmStatusResult.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch extra data:', error);
      } finally {
        setIsLoadingExtraData(false);
      }
    };
    
    if (releaseId) {
      fetchExtraData();
    }
  }, [releaseId]);

  // Extract tasks from data
  const tasks = data?.tasks || [];

  // Sort and filter tasks by status
  const filteredTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    
    let filtered = statusFilter 
      ? tasks.filter((task: Task) => task.taskStatus === statusFilter)
      : tasks;
    
    const statusOrder: Record<TaskStatus, number> = {
      [TaskStatus.PENDING]: 1,
      [TaskStatus.IN_PROGRESS]: 2,
      [TaskStatus.AWAITING_CALLBACK]: 2,
      [TaskStatus.COMPLETED]: 3,
      [TaskStatus.FAILED]: 4,
      [TaskStatus.SKIPPED]: 5,
    };
    
    return filtered.sort((a: Task, b: Task) => {
      const orderA = statusOrder[a.taskStatus] || 99;
      const orderB = statusOrder[b.taskStatus] || 99;
      return orderA - orderB;
    });
  }, [tasks, statusFilter]);

  // Calculate promotion readiness - all POST_REGRESSION tasks must be completed
  const canPromote = useMemo(() => {
    const postRegressionTasks = tasks.filter(
      (t: Task) => t.stage === 'POST_REGRESSION'
    );
    
    // All post-regression tasks must be completed
    const allTasksCompleted = postRegressionTasks.length > 0 && 
      postRegressionTasks.every((t: Task) => t.taskStatus === TaskStatus.COMPLETED);
    
    // Also check approval status
    const approvalTask = tasks.find(
      (t: Task) => t.taskType === TaskType.CHECK_PROJECT_RELEASE_APPROVAL
    );
    const approvalReady = approvalTask?.taskStatus === TaskStatus.COMPLETED;
    
    return allTasksCompleted && approvalReady;
  }, [tasks]);

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

  const handleViewDetails = useCallback((task: Task) => {
    console.log('View task details:', task);
  }, []);

  const handleApprove = useCallback(
    async (comments?: string) => {
      if (!approvalTaskId) return;
      
      try {
        // Call manual approval API
        const response = await fetch(`/api/v1/releases/${releaseId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comments }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to approve release');
        }
        
        showSuccessToast({ message: 'Release approved successfully' });
        setShowApprovalDialog(false);
        setApprovalTaskId(null);
        await refetch();
      } catch (error) {
        const errorMessage = getApiErrorMessage(error, 'Failed to approve release');
        showErrorToast({ message: errorMessage });
      }
    },
    [approvalTaskId, releaseId, refetch]
  );

  const handleCompletePostRegression = useCallback(async () => {
    try {
      await completeMutation.mutateAsync();
      showSuccessToast({ message: 'Post-regression stage completed successfully' });
      await refetch();
      // Navigate to distribution or next stage
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to complete post-regression stage');
      showErrorToast({ message: errorMessage });
    }
  }, [completeMutation, refetch]);

  const handleAcknowledgeExtraCommits = useCallback(() => {
    // Acknowledge extra commits (client-side only for now)
    console.log('Extra commits acknowledged');
  }, []);

  if (isLoading) {
    return (
      <Stack gap="md" className={className}>
        <Text c="dimmed">Loading post-regression stage...</Text>
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
        No post-regression stage data available
      </Alert>
    );
  }

  const hasTasks = tasks && tasks.length > 0;

  // Status filter options
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: TaskStatus.PENDING, label: TASK_STATUS_LABELS.PENDING },
    { value: TaskStatus.IN_PROGRESS, label: TASK_STATUS_LABELS.IN_PROGRESS },
    { value: TaskStatus.AWAITING_CALLBACK, label: 'Awaiting Callback' },
    { value: TaskStatus.COMPLETED, label: TASK_STATUS_LABELS.COMPLETED },
    { value: TaskStatus.FAILED, label: TASK_STATUS_LABELS.FAILED },
    { value: TaskStatus.SKIPPED, label: TASK_STATUS_LABELS.SKIPPED },
  ];

  // Find approval task for PM status
  const approvalTask = tasks.find(
    (t: Task) => t.taskType === TaskType.CHECK_PROJECT_RELEASE_APPROVAL
  );
  const pmStatusFromTask = approvalTask ? transformTaskToPMStatus(approvalTask) : undefined;
  const displayPmStatus = pmStatus || pmStatusFromTask;

  return (
    <Stack gap="lg" className={className}>
      {/* Extra Commits Warning - above tasks */}
      {extraCommits?.hasExtraCommits && (
        <ExtraCommitsWarning
          extraCommits={extraCommits}
          canDismiss
          onProceed={handleAcknowledgeExtraCommits}
        />
      )}

      {/* Tasks Header with Filter */}
      {hasTasks && (
        <Group justify="space-between" align="center">
          <Text fw={600} size="lg">
            Tasks
          </Text>
          <Select
            placeholder="Filter by status"
            data={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            clearable
            style={{ width: '200px' }}
          />
        </Group>
      )}

      {/* Tasks - Full width, stacked */}
      {hasTasks ? (
        filteredTasks.length > 0 ? (
          <Stack gap="md">
            {filteredTasks.map((task: Task) => (
              <TaskCard
                key={task.id}
                task={task}
                tenantId={tenantId}
                releaseId={releaseId}
                onRetry={handleRetry}
                onViewDetails={handleViewDetails}
                // Enhanced props for post-regression
                pmStatus={task.taskType === TaskType.CHECK_PROJECT_RELEASE_APPROVAL ? displayPmStatus : undefined}
                onApproveRequested={
                  task.taskType === TaskType.CHECK_PROJECT_RELEASE_APPROVAL
                    ? () => {
                        setApprovalTaskId(task.id);
                        setShowApprovalDialog(true);
                      }
                    : undefined
                }
              />
            ))}
          </Stack>
        ) : (
          <Alert color="gray" variant="light">
            No tasks match the selected filter
          </Alert>
        )
      ) : (
        <Alert color="gray" variant="light">
          {POST_REGRESSION_LABELS.NO_TASKS || 'No tasks available'}
        </Alert>
      )}

      {/* Promotion Card - Complete Post-Regression */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between">
          <div>
            <Text fw={600} size="lg" mb="xs">
              Ready for Distribution?
            </Text>
            <Text size="sm" c="dimmed">
              {canPromote
                ? 'All requirements met. You can proceed to distribution.'
                : 'Complete all tasks first.'}
            </Text>
          </div>
          <Button
            size="lg"
            disabled={!canPromote}
            onClick={handleCompletePostRegression}
            leftSection={<IconRocket size={18} />}
            loading={completeMutation.isLoading}
          >
            Complete Post-Regression
          </Button>
        </Group>
      </Card>

      {/* Modals */}
      <ManualApprovalDialog
        opened={showApprovalDialog}
        releaseId={releaseId}
        approverRole={displayPmStatus?.approver || ApproverRole.RELEASE_LEAD}
        isApproving={false}
        onApprove={handleApprove}
        onClose={() => {
          setShowApprovalDialog(false);
          setApprovalTaskId(null);
        }}
      />
    </Stack>
  );
}

