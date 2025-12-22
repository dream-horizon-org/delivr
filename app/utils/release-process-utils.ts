/**
 * Release Process Utilities
 * Helper functions for determining release phase and stage
 */

import type { BackendReleaseResponse } from '~/types/release-management.types';
import { Phase, TaskStage as TaskStageEnum } from '~/types/release-process-enums';
import type { TaskStage } from '~/types/release-process-enums';

/**
 * Determine current phase based on release status and tasks
 * This is a temporary solution until backend provides phase field
 * 
 * TODO: Replace with backend phase API when available
 */
export function determineReleasePhase(release: BackendReleaseResponse): Phase {
  // If release is archived or completed, return appropriate phase
  if (release.status === 'ARCHIVED') {
    return Phase.ARCHIVED;
  }
  
  if (release.status === 'COMPLETED') {
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
      (task: any) => task.taskStage === 'REGRESSION' || task.stage === 'REGRESSION'
    );
    
    if (hasRegressionTasks) {
      return Phase.REGRESSION;
    }

    // Check if any pre-release tasks exist
    const hasPreReleaseTasks = release.tasks.some(
      (task: any) => task.taskStage === 'PRE_RELEASE' || task.stage === 'PRE_RELEASE'
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
 */
export function getStageFromPhase(
  phase: Phase,
  currentActiveStage?: 'PRE_KICKOFF' | 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE' | 'RELEASE_SUBMISSION' | 'RELEASE' | null
): TaskStage | null {
  // Handle paused states - use currentActiveStage if available
  if (phase === Phase.PAUSED_BY_FAILURE || phase === Phase.PAUSED_BY_USER) {
    if (currentActiveStage) {
      // Map backend ActiveStage to frontend TaskStage
      switch (currentActiveStage) {
        case 'PRE_KICKOFF':
          return null; // Not a stage in stepper
        case 'KICKOFF':
          return TaskStageEnum.KICKOFF;
        case 'REGRESSION':
          return TaskStageEnum.REGRESSION;
        case 'PRE_RELEASE':
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
    case Phase.COMPLETED:
    case Phase.ARCHIVED:
      return TaskStageEnum.DISTRIBUTION; // Show distribution even when completed
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

