/**
 * PostRegressionStage Component
 * Displays post-regression stage with tasks
 * Similar to KickoffStage but with enhanced TaskCards for build, approval, and promotion tasks
 */

import { Stack } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExtraCommitsWarning } from '~/components/distribution';
import { usePostRegressionStage } from '~/hooks/useReleaseProcess';
import { useTaskHandlers } from '~/hooks/useTaskHandlers';
import type { Task } from '~/types/release-process.types';
import { TaskStatus } from '~/types/release-process-enums';
import { validateStageProps } from '~/utils/prop-validation';
import { apiGet } from '~/utils/api-client';
import { handleStageError } from '~/utils/stage-error-handling';
import type { ExtraCommitsResponse, PMStatusResponse } from '~/types/distribution.types';
import { StageErrorBoundary } from './shared/StageErrorBoundary';
import { PostRegressionTasksList } from './stages/PostRegressionTasksList';
import { PostRegressionApprovalSection } from './stages/PostRegressionApprovalSection';
import { PostRegressionPromotionCard } from './stages/PostRegressionPromotionCard';

interface PostRegressionStageProps {
  tenantId: string;
  releaseId: string;
  className?: string;
}

export function PostRegressionStage({ tenantId, releaseId, className }: PostRegressionStageProps) {
  // Validate required props
  validateStageProps({ tenantId, releaseId }, 'PostRegressionStage');

  const { data, isLoading, error, refetch } = usePostRegressionStage(tenantId, releaseId);
  
  // Use shared task handlers
  const { handleRetry } = useTaskHandlers({
    tenantId,
    releaseId,
    refetch,
  });
  
  // Modal states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  
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
        // Error handled silently - components will show default state
        // Use handleStageError with showToast: false for optional data
        handleStageError(error, 'fetch extra commits and PM status', {
          showToast: false,
          logError: true,
        });
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

  // Calculate promotion readiness - all POST_REGRESSION tasks must be completed
  const canPromote = useMemo(() => {
    const postRegressionTasks = tasks.filter(
      (t: Task) => t.stage === 'POST_REGRESSION'
    );
    
    // All post-regression tasks must be completed
    const allTasksCompleted = postRegressionTasks.length > 0 && 
      postRegressionTasks.every((t: Task) => t.taskStatus === TaskStatus.COMPLETED);
    
    // Check PM approval separately (if PM integration exists)
    const pmApprovalReady = pmStatus 
      ? pmStatus.approved === true 
      : true; // If no PM integration, no approval needed
    
    return allTasksCompleted && pmApprovalReady;
  }, [tasks, pmStatus]);



  const handleAcknowledgeExtraCommits = useCallback(() => {
    // Acknowledge extra commits (client-side only for now)
    // TODO: Implement acknowledgment API call when available
  }, []);

  return (
    <StageErrorBoundary
      isLoading={isLoading}
      error={error}
      data={data}
      stageName="post-regression stage"
    >
      <Stack gap="lg" className={className}>
      {/* Extra Commits Warning - above tasks */}
      {extraCommits?.hasExtraCommits && (
        <ExtraCommitsWarning
          extraCommits={extraCommits}
          canDismiss
          onProceed={handleAcknowledgeExtraCommits}
        />
      )}

      {/* Tasks List */}
      <PostRegressionTasksList
        tasks={tasks}
        tenantId={tenantId}
        releaseId={releaseId}
        onRetry={handleRetry}
      />

      {/* PM Approval Section */}
      <PostRegressionApprovalSection
        releaseId={releaseId}
        pmStatus={pmStatus}
        showApprovalDialog={showApprovalDialog}
        onShowApprovalDialog={setShowApprovalDialog}
        onPmStatusUpdate={setPmStatus}
        onRefetch={refetch}
      />

      {/* Promotion Card */}
      <PostRegressionPromotionCard
        tenantId={tenantId}
        releaseId={releaseId}
        canPromote={canPromote}
        onComplete={refetch}
      />
      </Stack>
    </StageErrorBoundary>
  );
}

