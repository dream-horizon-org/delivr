/**
 * Release Details Page
 * Shows detailed information about a specific release
 * 
 * Data Flow:
 * - Uses useRelease hook (React Query) for cached data
 * - Integrates Phase 2 release process components
 * - Phase-based rendering of stage components
 */

import { Button, Container, Group, Stack, Box } from '@mantine/core';
import { Link, useNavigate, useParams, useSearchParams } from '@remix-run/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useEffect, useState, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { Breadcrumb } from '~/components/Common';
import { getBreadcrumbItems } from '~/constants/breadcrumbs';
import { PageLoader } from '~/components/Common/PageLoader';
import { DistributionStage, KickoffStage, PreKickoffStage, PreReleaseStage, RegressionStage, ReleaseProcessHeader, ReleaseProcessSidebar } from '~/components/ReleaseProcess';
import { IntegrationsStatusSidebar } from '~/components/ReleaseProcess/IntegrationsStatusSidebar';
import { ReleaseNotFound } from '~/components/Releases/ReleaseNotFound';
import { AuthErrorFallback } from '~/components/Auth/AuthErrorFallback';
import { BUTTON_LABELS } from '~/constants/release-process-ui';
import { useDistributionStage } from '~/hooks/useDistributionStage';
import { useRelease } from '~/hooks/useRelease';
import { useKickoffStage, usePreReleaseStage, useRegressionStage } from '~/hooks/useReleaseProcess';
import { DistributionStatus } from '~/types/distribution/distribution.types';
import { Phase, StageStatus, TaskStage } from '~/types/release-process-enums';
import {
  determineReleasePhase,
  getReleaseVersion,
  getStageFromPhase,
} from '~/utils/release-process-utils';
import { isAuthenticationError } from '~/utils/error-handler.utils';

export default function ReleaseDetailsPage() {
  const params = useParams();
  const org = params.org || '';
  const releaseId = params.releaseId || '';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Get returnTo params from URL to restore filters and tab when going back
  const returnTo = searchParams.get('returnTo');
  const backUrl = returnTo 
    ? `/dashboard/${org}/releases?${returnTo}`
    : `/dashboard/${org}/releases`;

  // Use cached hook - no refetching on navigation if data is fresh
  // IMPORTANT: Call hook only once at the top level (before any early returns)
  const {
    release,
    isLoading,
    error,
    refetch,
  } = useRelease(org, releaseId);

  // Track refetch state to show loading during retry
  const [isRetrying, setIsRetrying] = useState(false);

  // Use releasePhase from API if available, otherwise derive (fallback)
  const currentPhase: Phase = release 
    ? (release.releasePhase || determineReleasePhase(release))
    : Phase.NOT_STARTED;
  const currentStage = getStageFromPhase(currentPhase, release?.currentActiveStage, release?.cronJob);

  // State for selected stage (user can click stepper to view different stages)
  // Initialize to null, will be set to currentStage when release loads
  const [selectedStage, setSelectedStage] = useState<TaskStage | null>(null);

  // Determine which stage should poll based on current active stage
  // Only poll the stage that is currently active (not the selected/viewing stage)
  const shouldPollKickoff = currentStage === TaskStage.KICKOFF;
  const shouldPollRegression = currentStage === TaskStage.REGRESSION;
  const shouldPollPreRelease = currentStage === TaskStage.PRE_RELEASE;
  // Note: Distribution does NOT poll - it's reactive (updates via user actions)

  // Fetch stage data - only current active stage will poll every 30 seconds
  const kickoffData = useKickoffStage(org, releaseId, shouldPollKickoff);
  const regressionData = useRegressionStage(org, releaseId, shouldPollRegression);
  const preReleaseData = usePreReleaseStage(org, releaseId, shouldPollPreRelease);
  const { distribution, error: distributionError } = useDistributionStage(org, releaseId);

  // Check for auth errors in any of the hooks
  const authError = useMemo(() => {
    // Check all possible error sources
    const errors = [
      error, // useRelease error
      kickoffData.error,
      regressionData.error,
      preReleaseData.error,
      distributionError,
    ];

    for (const err of errors) {
      if (err && isAuthenticationError(err)) {
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Your session has expired. Please refresh the page to log in again.';
        return errorMessage;
      }
    }

    return null;
  }, [error, kickoffData.error, regressionData.error, preReleaseData.error, distributionError]);

  // Cancel all pending queries when auth error is detected to prevent cascading failures
  useEffect(() => {
    if (authError) {
      // Cancel all pending queries to stop cascading failures
      // This prevents other API calls from continuing when auth has failed
      queryClient.cancelQueries();
      
      // Also cancel queries specific to this release to be more targeted
      queryClient.cancelQueries(['release', org, releaseId]);
      queryClient.cancelQueries(['release-process', org, releaseId]);
      queryClient.cancelQueries(['distribution-stage', releaseId]);
    }
  }, [authError, queryClient, org, releaseId]);

  // Check if kickoff stage is completed
  const isKickoffCompleted = kickoffData.data?.stageStatus === StageStatus.COMPLETED;
  
  // Check if distribution stage is completed (submitted or released)
  const isDistributionCompleted = !!distribution && (
    distribution.status === DistributionStatus.SUBMITTED ||
    distribution.status === DistributionStatus.PARTIALLY_SUBMITTED ||
    distribution.status === DistributionStatus.PARTIALLY_RELEASED ||
    distribution.status === DistributionStatus.RELEASED
  );

  // Always land on active stage when release loads or current stage changes
  // If kickoff is completed, automatically navigate to REGRESSION stage
  useEffect(() => {
    if (isKickoffCompleted && currentStage === TaskStage.KICKOFF) {
      // Kickoff is completed, navigate to REGRESSION
      setSelectedStage(TaskStage.REGRESSION);
    } else if (currentStage) {
      setSelectedStage(currentStage);
    }
  }, [currentStage, isKickoffCompleted]);

  // Debug logging for development only
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !release || !selectedStage) return;

    let stageData;
    if (selectedStage === TaskStage.KICKOFF) {
      stageData = kickoffData.data;
    } else if (selectedStage === TaskStage.REGRESSION) {
      stageData = regressionData.data;
    } else if (selectedStage === TaskStage.PRE_RELEASE) {
      stageData = preReleaseData.data;
    }

    if (stageData?.tasks) {
      console.log(`[Release Process] Current Stage: ${selectedStage} | Release: ${release.branch || releaseId} | Tasks:`, stageData.tasks.map((t) => ({
        id: t.id,
        taskType: t.taskType,
        taskStatus: t.taskStatus,
        stage: t.stage,
      })));
    }
  }, [selectedStage, release, releaseId, kickoffData.data, regressionData.data, preReleaseData.data]);

  // Handle retry with loading state
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const result = await refetch();
      // If refetch succeeds, React Query will update the data and clear error
      // The component will re-render with the new data
      if (result.isSuccess) {
        // Success - component will re-render and show release
        return;
      }
    } catch (err) {
      // Error persists - component will re-render with error state
      console.error('[ReleaseDetailsPage] Retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  // Show auth error fallback if authentication failed
  if (authError) {
    return (
      <Container size="xl" className="py-4">
        <Box p="md">
          <AuthErrorFallback message={authError} />
        </Box>
      </Container>
    );
  }

  // Loading State (including retry state)
  if (isLoading || isRetrying) {
    return <PageLoader message={isRetrying ? "Retrying..." : "Loading release..."} />;
  }

  // Error State - Only show if we have an error AND no release data
  // After successful refetch, error will be cleared and release will be available
  if (error && !release) {
    return (
      <ReleaseNotFound 
        org={org} 
        error={error} 
        onRetry={handleRetry}
        isRetrying={isRetrying}
      />
    );
  }

  // If no release but no error, still show not found (release might not exist)
  if (!release) {
    return <ReleaseNotFound org={org} />;
  }

  const releaseVersion = getReleaseVersion(release);

  // Breadcrumb items
  const breadcrumbItems = getBreadcrumbItems('releases.detail', { org, releaseVersion });

  // Handle stage selection from stepper
  const handleStageSelect = (stage: TaskStage | null) => {
    setSelectedStage(stage);
  };

  // Render stage component based on selected stage
  const renderStageComponent = () => {
    // PreKickoffStage: Show when release hasn't started yet (NOT_STARTED phase)
    // OR when archived/completed with null stage (never started)
    if (currentPhase === Phase.NOT_STARTED || (currentStage === null && (currentPhase === Phase.ARCHIVED || currentPhase === Phase.COMPLETED))) {
      return <PreKickoffStage />;
    }

    // If release has started but no stage selected yet, use current stage as fallback
    const stageToRender = selectedStage || currentStage;

    if (!stageToRender) {
      return null;
    }

    if (stageToRender === TaskStage.KICKOFF) {
      return <KickoffStage tenantId={org} releaseId={releaseId} />;
    }

    if (stageToRender === TaskStage.REGRESSION) {
      return <RegressionStage tenantId={org} releaseId={releaseId} />;
    }

    if (stageToRender === TaskStage.PRE_RELEASE) {
      return <PreReleaseStage tenantId={org} releaseId={releaseId} />;
    }

    if (stageToRender === TaskStage.DISTRIBUTION) {
      return <DistributionStage tenantId={org} releaseId={releaseId} />;
    }

    return null;
  };

  return (
    <Container size="xl" className="py-4">
      <Stack gap="md">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Back Button - Between main header and release header */}
        <Group>
          <Link to={backUrl}>
            <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}>
              {BUTTON_LABELS.BACK}
            </Button>
          </Link>
        </Group>

        {/* Header with Actions */}
        <ReleaseProcessHeader
          release={release}
          org={org}
          releaseVersion={releaseVersion}
          currentStage={selectedStage}
          onUpdate={refetch}
          onRefetch={refetch}
        />

        {/* Main Content with Stage Stepper Sidebar */}
        <Group align="stretch" gap="lg" wrap="nowrap" style={{ alignItems: 'flex-start' }}>
          {/* Main Content Area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {renderStageComponent()}
          </div>

          {/* Right Sidebar - Stage Stepper + Integration Status */}
          <Stack gap="md" style={{ width: '280px' }}>
            {/* Stage Stepper */}
          <ReleaseProcessSidebar
            currentStage={currentStage}
            selectedStage={selectedStage}
            onStageSelect={handleStageSelect}
            kickoffStageCompleted={isKickoffCompleted}
            distributionStageCompleted={isDistributionCompleted}
          />

            {/* Integration Status Sidebar - Real-time status from individual APIs */}
            <IntegrationsStatusSidebar
              tenantId={org}
              releaseId={releaseId}
              currentStage={selectedStage}
            />
          </Stack>
        </Group>
      </Stack>
    </Container>
  );
}

