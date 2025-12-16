/**
 * Build Upload Stage Mapping Utilities
 * Maps between frontend BuildUploadStage enum and backend TaskStage enum
 */

import { BuildUploadStage } from '~/types/release-process-enums';
import { TaskStage } from '~/types/release-process-enums';

/**
 * Map BuildUploadStage (frontend) to TaskStage (backend)
 * Used when calling backend APIs
 */
export function mapBuildUploadStageToTaskStage(stage: BuildUploadStage): TaskStage {
  const map: Record<BuildUploadStage, TaskStage> = {
    [BuildUploadStage.PRE_REGRESSION]: TaskStage.KICKOFF,
    [BuildUploadStage.REGRESSION]: TaskStage.REGRESSION,
    [BuildUploadStage.PRE_RELEASE]: TaskStage.PRE_RELEASE,
  };
  return map[stage];
}

/**
 * Map TaskStage (backend) to BuildUploadStage (frontend)
 * Used when processing backend responses
 */
export function mapTaskStageToBuildUploadStage(stage: TaskStage): BuildUploadStage | null {
  const map: Record<TaskStage, BuildUploadStage> = {
    [TaskStage.KICKOFF]: BuildUploadStage.PRE_REGRESSION,
    [TaskStage.REGRESSION]: BuildUploadStage.REGRESSION,
    [TaskStage.PRE_RELEASE]: BuildUploadStage.PRE_RELEASE,
    [TaskStage.DISTRIBUTION]: BuildUploadStage.PRE_RELEASE, // Fallback for distribution stage
  };
  return map[stage] || null;
}

/**
 * Get backend stage string from BuildUploadStage
 * Returns the string value for use in API paths
 */
export function getBackendStageString(stage: BuildUploadStage): string {
  return mapBuildUploadStageToTaskStage(stage);
}


