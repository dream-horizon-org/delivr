/**
 * Release Details Page
 * Shows detailed information about a specific release
 * 
 * Data Flow:
 * - Uses useRelease hook (React Query) for cached data
 * - Integrates Phase 2 release process components
 * - Phase-based rendering of stage components
 */

import { Container, Group, Stack } from '@mantine/core';
import { useNavigate, useParams } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { PageLoader } from '~/components/Common/PageLoader';
import { KickoffStage, PreReleaseStage, PreKickoffStage, RegressionStage, ReleaseProcessHeader, ReleaseProcessSidebar } from '~/components/ReleaseProcess';
import { IntegrationsStatusSidebar } from '~/components/ReleaseProcess/IntegrationsStatusSidebar';
import { ReleaseNotFound } from '~/components/Releases/ReleaseNotFound';
import { useRelease } from '~/hooks/useRelease';
import { useKickoffStage, useRegressionStage, usePreReleaseStage } from '~/hooks/useReleaseProcess';
import { Phase, TaskStage } from '~/types/release-process-enums';
import {
  determineReleasePhase,
  getReleaseVersion,
  getStageFromPhase,
} from '~/utils/release-process-utils';

export default function ReleaseDetailsPage() {
  const params = useParams();
  const org = params.org || '';
  const releaseId = params.releaseId || '';
  const navigate = useNavigate();

  // Use cached hook - no refetching on navigation if data is fresh
  // IMPORTANT: Call hook only once at the top level (before any early returns)
  const {
    release,
    isLoading,
    error,
    refetch,
  } = useRelease(org, releaseId);

  // Use releasePhase from API if available, otherwise derive (fallback)
  const currentPhase: Phase = release 
    ? (release.releasePhase || determineReleasePhase(release))
    : Phase.NOT_STARTED;
  const currentStage = getStageFromPhase(currentPhase);

  // State for selected stage (user can click stepper to view different stages)
  // Initialize to null, will be set to currentStage when release loads
  const [selectedStage, setSelectedStage] = useState<TaskStage | null>(null);

  // Fetch stage data for console logging
  const kickoffData = useKickoffStage(org, releaseId);
  const regressionData = useRegressionStage(org, releaseId);
  const preReleaseData = usePreReleaseStage(org, releaseId);

  // Always land on active stage when release loads or current stage changes
  useEffect(() => {
    if (currentStage) {
      setSelectedStage(currentStage);
    }
  }, [currentStage]);

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

  // Handle navigation to distribution stage
  useEffect(() => {
    if (selectedStage === 'DISTRIBUTION') {
      navigate(`/dashboard/${org}/releases/${releaseId}/distribution`);
    }
  }, [selectedStage, navigate, org, releaseId]);

  // Loading State
  if (isLoading) {
    return <PageLoader message="Loading release..." />;
  }

  // Error State
  if (error || !release) {
    return <ReleaseNotFound org={org} error={error} />;
  }

  const releaseVersion = getReleaseVersion(release);

  // Handle stage selection from stepper
  const handleStageSelect = (stage: TaskStage | null) => {
    setSelectedStage(stage);
  };

  // Render stage component based on selected stage
  const renderStageComponent = () => {
    // PreKickoffStage: Only show when release hasn't started yet (NOT_STARTED phase)
    // Once started, this component should never be visible
    if (currentPhase === Phase.NOT_STARTED) {
      return <PreKickoffStage />;
    }

    // If release has started but no stage selected yet, use current stage as fallback
    const stageToRender = selectedStage || currentStage;

    if (!stageToRender) {
      return null;
    }

    // Handle distribution stage - navigation is handled by useEffect above
    if (stageToRender === 'DISTRIBUTION') {
      return null; // Will navigate away via useEffect
    }

    if (stageToRender === 'KICKOFF') {
      return <KickoffStage tenantId={org} releaseId={releaseId} />;
    }

    if (stageToRender === 'REGRESSION') {
      return <RegressionStage tenantId={org} releaseId={releaseId} />;
    }

    if (stageToRender === 'PRE_RELEASE') {
      return <PreReleaseStage tenantId={org} releaseId={releaseId} />;
    }

    return null;
  };

  return (
    <Container size="xl" className="py-8">
      <Stack gap="lg">
        {/* Header with Actions */}
        <ReleaseProcessHeader
          release={release}
          org={org}
          releaseVersion={releaseVersion}
          currentStage={selectedStage}
          onUpdate={refetch}
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

