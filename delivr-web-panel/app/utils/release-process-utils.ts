/**
 * Release Process Utilities
 * Helper functions for determining release phase and stage
 */

import type { BackendReleaseResponse } from '~/types/release-management.types';
import { Phase, TaskStage, TaskStage as TaskStageEnum, ReleaseStatus, StageStatus } from '~/types/release-process-enums';

/**
 * Determine current phase based on release status and tasks
 * This is a temporary solution until backend provides phase field
 * 
 * TODO: Replace with backend phase API when available
 */
export function determineReleasePhase(release: BackendReleaseResponse): Phase {
  // If release is archived or completed, return appropriate phase
  if (release.status === ReleaseStatus.ARCHIVED) {
    return Phase.ARCHIVED;
  }
  
  if (release.status === ReleaseStatus.COMPLETED) {
    return Phase.COMPLETED;
  }

  // Check if release has started (has kickoff date)
  if (!release.kickOffDate) {
    return Phase.NOT_STARTED;
  }

  // For IN_PROGRESS releases, check tasks to determine stage
  // This is a heuristic - backend should provide phase field
  if (release.tasks && release.tasks.length > 0) {
    // Check if any regression tasks exist
    const hasRegressionTasks = release.tasks.some(
      (task: any) => task.taskStage === TaskStage.REGRESSION || task.stage === TaskStage.REGRESSION
    );
    
    if (hasRegressionTasks) {
      return Phase.REGRESSION;
    }

    // Check if any pre-release tasks exist
    const hasPreReleaseTasks = release.tasks.some(
      (task: any) => task.taskStage === TaskStage.PRE_RELEASE || task.stage === TaskStage.PRE_RELEASE
    );
    
    if (hasPreReleaseTasks) {
      return Phase.PRE_RELEASE;
    }

    // Default to kickoff if tasks exist but no stage-specific tasks
    return Phase.KICKOFF;
  }

  // Default to KICKOFF if release has started but no tasks yet
  return Phase.KICKOFF;
}

/**
 * Get current stage from phase
 * @param phase - The release phase
 * @param currentActiveStage - Optional active stage from backend (used for paused states)
 * @param cronJob - Optional cron job data (used to determine stage for archived/completed releases)
 */
export function getStageFromPhase(
  phase: Phase,
  currentActiveStage?: 'PRE_KICKOFF' | 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE' | 'RELEASE_SUBMISSION' | 'RELEASE' | null,
  cronJob?: { stage1Status?: string; stage2Status?: string; stage3Status?: string; stage4Status?: string; [key: string]: unknown } | null
): TaskStage | null {
  // Handle paused states - use currentActiveStage if available
  if (phase === Phase.PAUSED_BY_FAILURE || phase === Phase.PAUSED_BY_USER) {
    if (currentActiveStage) {
      // Map backend ActiveStage to frontend TaskStage
      switch (currentActiveStage) {
        case 'PRE_KICKOFF':
          return null; // Not a stage in stepper
        case TaskStage.KICKOFF:
          return TaskStageEnum.KICKOFF;
        case TaskStage.REGRESSION:
          return TaskStageEnum.REGRESSION;
        case TaskStage.PRE_RELEASE:
          return TaskStageEnum.PRE_RELEASE;
        case 'RELEASE_SUBMISSION':
        case 'RELEASE':
          return TaskStageEnum.DISTRIBUTION;
        default:
          return TaskStageEnum.KICKOFF; // Fallback
      }
    }
    // If no currentActiveStage, fall through to default
  }

  // Handle archived/completed states - determine stage from currentActiveStage or cronJob statuses
  if (phase === Phase.ARCHIVED || phase === Phase.COMPLETED) {
    // If currentActiveStage is available, use it
    if (currentActiveStage) {
      switch (currentActiveStage) {
        case TaskStage.KICKOFF:
          return TaskStageEnum.KICKOFF;
        case TaskStage.REGRESSION:
          return TaskStageEnum.REGRESSION;
        case TaskStage.PRE_RELEASE:
          return TaskStageEnum.PRE_RELEASE;
        case 'RELEASE_SUBMISSION':
        case 'RELEASE':
          return TaskStageEnum.DISTRIBUTION;
        default:
          // Fall through to cronJob check
          break;
      }
    }
    
    // If currentActiveStage is null, determine from cronJob stage statuses
    if (cronJob) {
      // Check stages in reverse order (most recent first)
      if (cronJob.stage4Status === StageStatus.COMPLETED || cronJob.stage4Status === StageStatus.IN_PROGRESS) {
        return TaskStageEnum.DISTRIBUTION;
      }
      if (cronJob.stage3Status === StageStatus.COMPLETED || cronJob.stage3Status === StageStatus.IN_PROGRESS) {
        return TaskStageEnum.PRE_RELEASE;
      }
      if (cronJob.stage2Status === StageStatus.COMPLETED || cronJob.stage2Status === StageStatus.IN_PROGRESS) {
        return TaskStageEnum.REGRESSION;
      }
      if (cronJob.stage1Status === StageStatus.COMPLETED || cronJob.stage1Status === StageStatus.IN_PROGRESS) {
        return TaskStageEnum.KICKOFF;
      }
      // All stages are PENDING - release never started, show PRE_KICKOFF
      return null; // PRE_KICKOFF (not a stage in stepper)
    }
    
    // No cronJob exists - release archived before cronJob was created, show PRE_KICKOFF
    return null; // PRE_KICKOFF (not a stage in stepper)
  }

  switch (phase) {
    case Phase.NOT_STARTED:
      return null; // Pre-kickoff (not a stage in stepper)
    case Phase.KICKOFF:
      return TaskStageEnum.KICKOFF;
    case Phase.AWAITING_REGRESSION:
    case Phase.REGRESSION:
    case Phase.REGRESSION_AWAITING_NEXT_CYCLE:
    case Phase.AWAITING_PRE_RELEASE: // Keep user on regression until pre-release starts
      return TaskStageEnum.REGRESSION;
    case Phase.PRE_RELEASE: // Only show pre-release when stage3Status === 'IN_PROGRESS'
    case Phase.AWAITING_SUBMISSION: // Keep user on pre-release until submission starts
      return TaskStageEnum.PRE_RELEASE;
    case Phase.SUBMISSION:
    case Phase.SUBMITTED_PENDING_APPROVAL:
      return TaskStageEnum.DISTRIBUTION;
    default:
      return TaskStageEnum.KICKOFF; // Default fallback
  }
}

/**
 * Get release version from platform mappings or branch
 * Priority: platformTargetMappings[].version > branch extraction > releaseId
 */
export function getReleaseVersion(release: BackendReleaseResponse): string {
  // Priority 1: Get version from platform mappings
  if (release.platformTargetMappings && release.platformTargetMappings.length > 0) {
    const firstMapping = release.platformTargetMappings[0];
    if (firstMapping?.version) {
      // Remove 'v' prefix if present for cleaner display
      return firstMapping.version.replace(/^v/, '');
    }
  }
  
  // Priority 2: Extract version from branch name
  if (release.branch) {
    const match = release.branch.match(/v?(\d+\.\d+\.\d+)/);
    if (match) {
      return match[1];
    }
  }
  
  // Priority 3: Use releaseId as last resort (but this is usually an identifier, not a version)
  // Only use if it looks like a version number
  if (release.releaseId) {
    const versionMatch = release.releaseId.match(/(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      return versionMatch[1];
    }
  }
  
  return 'Unknown';
}

/**
 * Check if cherry-pick-status API should be enabled
 * Cherry-pick status should only be checked during REGRESSION and PRE_RELEASE stages
 * 
 * @param currentStage - Current task stage
 * @param releaseStatus - Release status (ARCHIVED, COMPLETED, etc.)
 * @param releasePhase - Release phase (NOT_STARTED, KICKOFF, etc.)
 * @returns true if cherry-pick-status API should be enabled
 */
export function shouldEnableCherryPickStatus(
  currentStage: TaskStage | null,
  releaseStatus?: string,
  releasePhase?: Phase
): boolean {
  // Disable if release is archived
  if (releaseStatus === ReleaseStatus.ARCHIVED) {
    return false;
  }

  // Disable if release hasn't started (pre-kickoff)
  if (releasePhase === Phase.NOT_STARTED) {
    return false;
  }

  // Disable if in KICKOFF or DISTRIBUTION stages
  if (currentStage === TaskStageEnum.KICKOFF || currentStage === TaskStageEnum.DISTRIBUTION) {
    return false;
  }

  // Only enable for REGRESSION and PRE_RELEASE stages
  return currentStage === TaskStageEnum.REGRESSION || currentStage === TaskStageEnum.PRE_RELEASE;
}

