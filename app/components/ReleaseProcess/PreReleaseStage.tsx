/**
 * PreReleaseStage Component
 * Displays pre-release stage with tasks
 * Similar to KickoffStage but with enhanced TaskCards for build, approval, and promotion tasks
 */

import { Stack } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExtraCommitsWarning } from '~/components/distribution';
import { usePreReleaseStage, useProjectManagementStatus } from '~/hooks/useReleaseProcess';
import { useTaskHandlers } from '~/hooks/useTaskHandlers';
import type { Task } from '~/types/release-process.types';
import { TaskStatus } from '~/types/release-process-enums';
import { validateStageProps } from '~/utils/prop-validation';
import { apiGet } from '~/utils/api-client';
import { handleStageError } from '~/utils/stage-error-handling';
import type { ExtraCommitsResponse } from '~/types/distribution.types';
import { StageErrorBoundary } from './shared/StageErrorBoundary';
import { PreReleaseTasksList } from './stages/PreReleaseTasksList';
import { PreReleaseApprovalSection } from './stages/PreReleaseApprovalSection';
import { PreReleasePromotionCard } from './stages/PreReleasePromotionCard';

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
  
  // Extra commits
  const [extraCommits, setExtraCommits] = useState<ExtraCommitsResponse['data'] | null>(null);
  const [isLoadingExtraData, setIsLoadingExtraData] = useState(false);

  // Fetch extra commits
  useEffect(() => {
    const fetchExtraData = async () => {
      setIsLoadingExtraData(true);
      try {
        const extraCommitsResult = await apiGet<ExtraCommitsResponse>(`/api/v1/releases/${releaseId}/extra-commits`);
        
        if (extraCommitsResult.success && extraCommitsResult.data) {
          setExtraCommits(extraCommitsResult.data.data);
        }
      } catch (error) {
        // Error handled silently - components will show default state
        // Use handleStageError with showToast: false for optional data
        handleStageError(error, 'fetch extra commits', {
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

  // Fetch project management status using the correct API contract endpoint
  const projectManagementStatus = useProjectManagementStatus(tenantId, releaseId);

  // Extract tasks and uploadedBuilds from data
  const tasks = data?.tasks || [];
  const uploadedBuilds = data?.uploadedBuilds || [];

  // Calculate promotion readiness - all PRE_RELEASE tasks must be completed
  const canPromote = useMemo(() => {
    const preReleaseTasks = tasks.filter(
      (t: Task) => t.stage === 'PRE_RELEASE'
    );
    
    // All pre-release tasks must be completed
    const allTasksCompleted = preReleaseTasks.length > 0 && 
      preReleaseTasks.every((t: Task) => t.taskStatus === TaskStatus.COMPLETED);
    
    // Check PM status using project-management-run-status API (API contract endpoint)
    // If no PM integration or all platforms completed, approval is ready
    let pmApprovalReady = true;
    
    if (projectManagementStatus.data) {
      if ('platforms' in projectManagementStatus.data) {
        // All platforms response - all must be completed
        const allPlatformsCompleted = projectManagementStatus.data.platforms.every(
          (platform) => platform.isCompleted === true
        );
        pmApprovalReady = allPlatformsCompleted;
      } else {
        // Single platform response
        pmApprovalReady = projectManagementStatus.data.isCompleted === true;
      }
    }
    
    return allTasksCompleted && pmApprovalReady;
  }, [tasks, projectManagementStatus.data]);



  const handleAcknowledgeExtraCommits = useCallback(() => {
    // Acknowledge extra commits (client-side only for now)
    // TODO: Implement acknowledgment API call when available
  }, []);

  return (
    <StageErrorBoundary
      isLoading={isLoading}
      error={error}
      data={data}
      stageName="pre-release stage"
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
      <PreReleaseTasksList
        tasks={tasks}
        tenantId={tenantId}
        releaseId={releaseId}
        onRetry={handleRetry}
        uploadedBuilds={uploadedBuilds}
      />

      {/* PM Approval Section */}
      <PreReleaseApprovalSection
        tenantId={tenantId}
        releaseId={releaseId}
        projectManagementStatus={projectManagementStatus}
        onRefetch={refetch}
      />

      {/* Promotion Card */}
      <PreReleasePromotionCard
        tenantId={tenantId}
        releaseId={releaseId}
        canPromote={canPromote}
        onComplete={refetch}
      />
      </Stack>
    </StageErrorBoundary>
  );
}

