/**
 * Distribution State Utilities - Query SSOT for Submission Status Logic
 * 
 * All functions in this file MUST query SUBMISSION_STATUS_CONFIG (Single Source of Truth).
 * DO NOT hardcode status checks - always derive from the configuration.
 */

import { SUBMISSION_STATUS_CONFIG, getStatusConfig } from '~/constants/distribution/distribution-status-config.constants';
import { ROLLOUT_COMPLETE_PERCENT } from '~/constants/distribution/distribution.constants';
import type { Platform, SubmissionStatus } from '~/types/distribution/distribution.types';

// ============================================================================
// STATUS FLAGS - Query SSOT Configuration
// ============================================================================

/**
 * Check if submission is paused (rollout halted temporarily)
 * Queries SSOT configuration flags
 */
export function isSubmissionPaused(status: SubmissionStatus): boolean {
  return SUBMISSION_STATUS_CONFIG[status].flags.isPaused;
}

/**
 * Check if submission is actively rolling out
 * Queries SSOT configuration flags
 */
export function isSubmissionActive(status: SubmissionStatus): boolean {
  return SUBMISSION_STATUS_CONFIG[status].flags.isActive;
}

/**
 * Check if submission is in error state (requires user action)
 * Queries SSOT configuration flags
 */
export function isSubmissionInErrorState(status: SubmissionStatus): boolean {
  return SUBMISSION_STATUS_CONFIG[status].flags.isError;
}

/**
 * Check if submission is in terminal state (no further actions possible)
 * Queries SSOT configuration flags
 */
export function isSubmissionTerminal(status: SubmissionStatus): boolean {
  return SUBMISSION_STATUS_CONFIG[status].flags.isTerminal;
}

/**
 * Check if submission is waiting for store review
 * Queries SSOT configuration flags
 */
export function isSubmissionInReview(status: SubmissionStatus): boolean {
  return SUBMISSION_STATUS_CONFIG[status].flags.isReviewable;
}

/**
 * Check if submission can be resubmitted (after rejection/cancellation)
 * Queries SSOT configuration flags
 */
export function canResubmitSubmission(status: SubmissionStatus): boolean {
  return SUBMISSION_STATUS_CONFIG[status].flags.canResubmit;
}

// ============================================================================
// ACTION AVAILABILITY - Query SSOT Configuration
// ============================================================================

/**
 * Check if rollout percentage can be updated
 * Uses getStatusConfig helper to apply platform overrides
 */
export function canUpdateRollout(status: SubmissionStatus, platform: Platform): boolean {
  const config = getStatusConfig(status, platform);
  return config.actions.canUpdateRollout;
}

/**
 * Check if rollout can be paused
 * Uses getStatusConfig helper to apply platform overrides
 */
export function canPauseSubmission(status: SubmissionStatus, platform: Platform): boolean {
  const config = getStatusConfig(status, platform);
  return config.actions.canPause;
}

/**
 * Check if rollout can be resumed
 * Uses getStatusConfig helper to apply platform overrides
 */
export function canResumeSubmission(status: SubmissionStatus, platform: Platform): boolean {
  const config = getStatusConfig(status, platform);
  return config.actions.canResume;
}

/**
 * Check if submission can be cancelled
 * Uses getStatusConfig helper to apply platform overrides
 */
export function canCancelSubmission(status: SubmissionStatus, platform: Platform): boolean {
  const config = getStatusConfig(status, platform);
  return config.actions.canCancel;
}

// ============================================================================
// COMPOSITE STATE CHECKS - Derived from SSOT + Runtime Data
// ============================================================================

/**
 * Check if submission is actively rolling out (not paused, not complete)
 * Combines SSOT flags with runtime rollout percentage
 */
export function isSubmissionActivelyRollingOut(
  status: SubmissionStatus,
  rolloutPercentage: number
): boolean {
  const isActive = isSubmissionActive(status);
  const isPaused = isSubmissionPaused(status);
  const isComplete = rolloutPercentage === ROLLOUT_COMPLETE_PERCENT;
  
  return isActive && !isPaused && !isComplete;
}

/**
 * Check if submission has reached 100% rollout
 * Terminal statuses or 100% rollout percentage
 */
export function isSubmissionComplete(
  status: SubmissionStatus,
  rolloutPercentage: number
): boolean {
  return isSubmissionTerminal(status) || rolloutPercentage === ROLLOUT_COMPLETE_PERCENT;
}

/**
 * Check if pause/resume controls should be shown
 * Can show if submission supports rollout management and isn't complete
 */
export function canManageRollout(
  status: SubmissionStatus,
  platform: Platform,
  rolloutPercentage: number
): boolean {
  // Check if complete
  if (isSubmissionComplete(status, rolloutPercentage)) {
    return false;
  }
  
  // Check if currently paused (can resume)
  if (isSubmissionPaused(status) && canResumeSubmission(status, platform)) {
    return true;
  }
  
  // Check if actively rolling out (can pause)
  if (isSubmissionActive(status) && canPauseSubmission(status, platform)) {
    return true;
  }
  
  return false;
}

/**
 * Check if rollout controls (slider + pause/resume) should be displayed
 * Submission must be active or paused, not complete, and platform must support it
 */
export function shouldShowRolloutControls(
  status: SubmissionStatus,
  platform: Platform,
  rolloutPercentage: number
): boolean {
  // Don't show for complete submissions
  if (isSubmissionComplete(status, rolloutPercentage)) {
    return false;
  }
  
  // Show if can update rollout OR can pause/resume
  const canUpdate = canUpdateRollout(status, platform);
  const canManage = canManageRollout(status, platform, rolloutPercentage);
  
  return canUpdate || canManage;
}

/**
 * Check if rejected/error view should be shown
 * Submission is in error state and can be resubmitted
 */
export function shouldShowRejectedView(status: SubmissionStatus): boolean {
  return isSubmissionInErrorState(status) && canResubmitSubmission(status);
}

/**
 * Check if progress bar should be displayed
 * Queries SSOT showsProgressBar flag
 */
export function shouldShowProgressBar(
  status: SubmissionStatus,
  rolloutPercentage: number
): boolean {
  const config = SUBMISSION_STATUS_CONFIG[status];
  
  // Query SSOT flag directly
  if (!config.flags.showsProgressBar) {
    return false;
  }
  
  // If SSOT says show progress, only hide if it's an active submission that's already at 100%
  if (config.flags.isActive && rolloutPercentage === ROLLOUT_COMPLETE_PERCENT) {
    return false;
  }
  
  return true;
}
