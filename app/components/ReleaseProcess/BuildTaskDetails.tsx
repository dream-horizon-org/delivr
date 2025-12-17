/**
 * BuildTaskDetails Component
 * Handles expanded content for build-related tasks
 * Contains all conditional rendering logic
 * Orchestrates smaller dumb components for upload widgets and builds
 * Relies on task.builds from stage API, not separate artifacts API
 * 
 * NOTE: Upload widgets and uploadedBuilds logic are MANUAL-ONLY
 * CI/CD builds are handled differently (no upload widgets, builds come from CI/CD pipeline)
 */

import { useMemo } from 'react';
import { Stack } from '@mantine/core';
import { useRelease } from '~/hooks/useRelease';
import type { Task, BuildInfo, BuildTaskOutput } from '~/types/release-process.types';
import { TaskStatus, BuildUploadStage, TaskType, Platform } from '~/types/release-process-enums';
import { BuildUploadSection } from './BuildUploadSection';
import { BuildsList } from './BuildsList';

interface BuildTaskDetailsProps {
  task: Task;
  tenantId?: string;
  releaseId?: string;
  onUploadComplete?: () => void;
  uploadedBuilds?: BuildInfo[];  // Stage-level uploaded builds (not yet consumed)
}

export function BuildTaskDetails({
  task,
  tenantId,
  releaseId,
  onUploadComplete,
  uploadedBuilds = [],  // Stage-level uploaded builds (not yet consumed)
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

  // Build selection logic based on task status:
  // - If COMPLETED → use task.builds (consumed, can't change)
  // - If NOT COMPLETED → use uploadedBuilds (staging, can change)
  // Note: task.builds is always present (required field), empty array if no builds
  const effectiveBuilds: BuildInfo[] = useMemo(() => {
    if (task.taskStatus === TaskStatus.COMPLETED) {
      // Task completed: builds are consumed, use task.builds
      if (Array.isArray(task.builds) && task.builds.length > 0) {
        return task.builds;
      }
      return [];
    } else {
      // Task not completed: use uploadedBuilds (staging builds)
      return uploadedBuilds || [];
    }
  }, [task.taskStatus, task.builds, uploadedBuilds]);

  // Can change builds only if task is NOT completed and using uploadedBuilds
  const canChangeBuilds = useMemo(() => {
    return task.taskStatus !== TaskStatus.COMPLETED && effectiveBuilds.length > 0;
  }, [task.taskStatus, effectiveBuilds.length]);

  // Group builds by platform
  const buildsByPlatform = useMemo(() => {
    const grouped: Record<string, BuildInfo[]> = {};
    effectiveBuilds.forEach((build) => {
      const platform = build.platform;
      if (!grouped[platform]) {
        grouped[platform] = [];
      }
      grouped[platform].push(build);
    });
    return grouped;
  }, [effectiveBuilds]);

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
      // Pre-Release TestFlight: iOS only
      return [Platform.IOS];
    } else if (task.taskType === TaskType.CREATE_AAB_BUILD) {
      // Pre-Release AAB: Android only
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

  // Determine if this is a Pre-Release build task
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

  // Extract CI/CD URLs from output (for build tasks)
  // Special case: Build tasks can have jobUrl even when IN_PROGRESS
  const buildOutput = task.output as BuildTaskOutput | null;

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
      {(effectiveBuilds.length > 0 || shouldShowAllPlatforms) && (
        <BuildsList
          builds={effectiveBuilds}
          expectedPlatforms={shouldShowAllPlatforms ? expectedPlatforms : undefined}
          taskStatus={task.taskStatus}
          isPostRegression={isPostRegressionBuildTask}
          isKickoffRegression={isKickoffRegressionBuildTask}
          canChangeBuilds={canChangeBuilds}
          buildStage={buildStage}
          taskType={task.taskType}
          tenantId={tenantId}
          releaseId={releaseId}
          onUploadComplete={onUploadComplete}
          buildOutput={buildOutput}
        />
      )}
    </Stack>
  );
}

