/**
 * BuildTaskDetails Component
 * Handles expanded content for build-related tasks
 * Contains all conditional rendering logic
 * Orchestrates smaller dumb components for upload widgets and builds
 * Relies on task.builds from stage API, not separate artifacts API
 */

import { useMemo } from 'react';
import { Stack } from '@mantine/core';
import { useRelease } from '~/hooks/useRelease';
import type { Task, BuildInfo } from '~/types/release-process.types';
import { TaskStatus, BuildUploadStage, TaskType, Platform } from '~/types/release-process-enums';
import { BuildUploadSection } from './BuildUploadSection';
import { BuildsList } from './BuildsList';

interface BuildTaskDetailsProps {
  task: Task;
  tenantId?: string;
  releaseId?: string;
  onUploadComplete?: () => void;
}

export function BuildTaskDetails({
  task,
  tenantId,
  releaseId,
  onUploadComplete,
}: BuildTaskDetailsProps) {
  const { release } = useRelease(tenantId || '', releaseId || '');
  const isManualMode = release?.hasManualBuildUpload === true;

  // Determine build stage based on task type
  const buildStage = useMemo((): BuildUploadStage | null => {
    switch (task.taskType) {
      case TaskType.TRIGGER_PRE_REGRESSION_BUILDS:
        return BuildUploadStage.PRE_REGRESSION;
      case TaskType.TRIGGER_REGRESSION_BUILDS:
        return BuildUploadStage.REGRESSION;
      case TaskType.TRIGGER_TEST_FLIGHT_BUILD:
      case TaskType.CREATE_AAB_BUILD:
        return BuildUploadStage.PRE_RELEASE;
      default:
        return null;
    }
  }, [task.taskType]);

  // Extract builds from task.builds or task.externalData?.builds
  const taskBuilds: BuildInfo[] = useMemo(() => {
    if (task.builds && Array.isArray(task.builds)) {
      return task.builds;
    }
    if (task.externalData?.builds && Array.isArray(task.externalData.builds)) {
      return task.externalData.builds as BuildInfo[];
    }
    return [];
  }, [task]);

  // Group builds by platform
  const buildsByPlatform = useMemo(() => {
    const grouped: Record<string, BuildInfo[]> = {};
    taskBuilds.forEach((build) => {
      const platform = build.platform;
      if (!grouped[platform]) {
        grouped[platform] = [];
      }
      grouped[platform].push(build);
    });
    return grouped;
  }, [taskBuilds]);

  // Determine expected platforms based on task type and release config
  const expectedPlatforms = useMemo(() => {
    if (task.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS) {
      // Pre-Regression: All platforms from release config
      return release?.platformTargetMappings
        ?.map(m => m.platform)
        .filter((p, i, arr) => arr.indexOf(p) === i) || [];
    } else if (task.taskType === TaskType.TRIGGER_REGRESSION_BUILDS) {
      // Regression: Android and iOS
      return [Platform.ANDROID, Platform.IOS];
    } else if (task.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD) {
      // Post-Regression TestFlight: iOS only
      return [Platform.IOS];
    } else if (task.taskType === TaskType.CREATE_AAB_BUILD) {
      // Post-Regression AAB: Android only
      return [Platform.ANDROID];
    }
    return [];
  }, [task.taskType, release]);

  // Determine which platforms need upload widgets (platforms without builds)
  const platformsNeedingUpload = useMemo(() => {
    const platformsWithBuilds = new Set(Object.keys(buildsByPlatform));
    return expectedPlatforms.filter(platform => !platformsWithBuilds.has(platform));
  }, [expectedPlatforms, buildsByPlatform]);

  // Determine if we should show build upload section
  // Show upload widgets if:
  // - Manual mode
  // - Task is in a state that allows uploads (PENDING, AWAITING_CALLBACK, AWAITING_MANUAL_BUILD)
  // - There are platforms that need uploads
  const showBuildUpload =
    isManualMode &&
    buildStage &&
    (task.taskStatus === TaskStatus.PENDING ||
      task.taskStatus === TaskStatus.AWAITING_CALLBACK ||
      task.taskStatus === TaskStatus.AWAITING_MANUAL_BUILD) &&
    platformsNeedingUpload.length > 0 &&
    tenantId &&
    releaseId;

  // Determine if this is a Post-Regression build task
  const isPostRegressionBuildTask = 
    task.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD ||
    task.taskType === TaskType.CREATE_AAB_BUILD;

  // Determine if this is a Kickoff/Regression build task
  const isKickoffRegressionBuildTask = 
    task.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS ||
    task.taskType === TaskType.TRIGGER_REGRESSION_BUILDS;

  // For CI/CD mode: Show all expected platforms even if no builds yet
  // For Manual mode: Only show builds that exist
  const shouldShowAllPlatforms = !isManualMode && (
    task.taskStatus === TaskStatus.IN_PROGRESS ||
    task.taskStatus === TaskStatus.AWAITING_CALLBACK ||
    task.taskStatus === TaskStatus.FAILED
  );

  return (
    <Stack gap="md">
      {/* Build Upload Widget - Show for platforms without builds (Manual mode only) */}
      {showBuildUpload && buildStage && tenantId && releaseId && (
        <BuildUploadSection
          tenantId={tenantId}
          releaseId={releaseId}
          buildStage={buildStage}
          taskType={task.taskType}
          platforms={platformsNeedingUpload}
          onUploadComplete={onUploadComplete}
        />
      )}

      {/* Build Information - Show builds grouped by platform */}
      {/* For CI/CD in progress: Show all expected platforms with their status */}
      {(taskBuilds.length > 0 || shouldShowAllPlatforms) && (
        <BuildsList
          builds={taskBuilds}
          expectedPlatforms={shouldShowAllPlatforms ? expectedPlatforms : undefined}
          taskStatus={task.taskStatus}
          isPostRegression={isPostRegressionBuildTask}
          isKickoffRegression={isKickoffRegressionBuildTask}
        />
      )}
    </Stack>
  );
}

