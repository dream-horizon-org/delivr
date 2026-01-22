/**
 * Release Utilities
 * Helper functions for release-related operations
 */

import { RELEASE_TYPE, RELEASE_STATUS, TASK_STATUS, MANTINE_COLORS, RELEASE_ACTIVE_STATUS } from '~/constants/release-ui';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { StageStatus } from '~/types/release-process-enums';

/**
 * Format date for display in release cards
 * Returns a short date format like "Jan 15, 2024" or "Not set" if null
 */
export function formatReleaseDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Get release type gradient color
 * Returns CSS gradient string based on release type
 */
export function getReleaseTypeGradient(type: string): string {
  switch (type) {
    case RELEASE_TYPE.MAJOR:
      return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    case RELEASE_TYPE.MINOR:
      return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    case RELEASE_TYPE.HOTFIX:
      return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    default:
      return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  }
}

/**
 * Get status badge color
 * Returns Mantine color string based on release status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case RELEASE_STATUS.COMPLETED:
      return MANTINE_COLORS.GREEN;
    case RELEASE_STATUS.ARCHIVED:
      return MANTINE_COLORS.GRAY;
    case RELEASE_STATUS.IN_PROGRESS:
      return MANTINE_COLORS.BLUE;
    default:
      return MANTINE_COLORS.GRAY;
  }
}

/**
 * Get type badge color
 * Returns Mantine color string based on release type
 */
export function getTypeColor(type: string): string {
  switch (type) {
    case RELEASE_TYPE.MAJOR:
      return MANTINE_COLORS.PURPLE;
    case RELEASE_TYPE.MINOR:
      return MANTINE_COLORS.BLUE;
    case RELEASE_TYPE.HOTFIX:
      return MANTINE_COLORS.RED;
    default:
      return MANTINE_COLORS.GRAY;
  }
}

/**
 * Get task status badge color
 * Returns Mantine color string based on task status
 */
export function getTaskStatusColor(status: string): string {
  switch (status) {
    case TASK_STATUS.COMPLETED:
      return MANTINE_COLORS.GREEN;
    case TASK_STATUS.IN_PROGRESS:
      return MANTINE_COLORS.YELLOW;
    case TASK_STATUS.FAILED:
      return MANTINE_COLORS.RED;
    default:
      return MANTINE_COLORS.GRAY;
  }
}

/**
 * Derive UI active status from backend release data
 * Calculated at runtime based on:
 * - kickOffDate for UPCOMING
 * - status and cronJob.pauseType for RUNNING/PAUSED
 * - status for COMPLETED
 * 
 * @param release - Backend release response
 * @returns UI active status (UPCOMING, RUNNING, PAUSED, or COMPLETED)
 */
export function getReleaseActiveStatus(release: BackendReleaseResponse): typeof RELEASE_ACTIVE_STATUS[keyof typeof RELEASE_ACTIVE_STATUS] {
  const now = new Date();
  
  // ARCHIVED: status is ARCHIVED (separate from COMPLETED)
  if (release.status === RELEASE_STATUS.ARCHIVED) {
    return RELEASE_ACTIVE_STATUS.ARCHIVED;
  }
  
  // COMPLETED: status is COMPLETED
  if (release.status === RELEASE_STATUS.COMPLETED) {
    return RELEASE_ACTIVE_STATUS.COMPLETED;
  }
  
  // Check if cronJob is paused - use isReleasePaused helper which handles special cases
  if (isReleasePaused(release)) {
    return RELEASE_ACTIVE_STATUS.PAUSED;
  }
  
  // UPCOMING: kickOffDate is in the future
  if (release.kickOffDate) {
    const kickOffDate = new Date(release.kickOffDate);
    if (kickOffDate > now) {
      return RELEASE_ACTIVE_STATUS.UPCOMING;
    }
  }
  
  // RUNNING: kickOffDate has passed, status is IN_PROGRESS, and not paused
  // (We already checked for PAUSED above, so if we reach here and status is IN_PROGRESS, it's RUNNING)
  if (release.status === RELEASE_STATUS.IN_PROGRESS) {
    return RELEASE_ACTIVE_STATUS.RUNNING;
  }
  
  // Default fallback: if no kickOffDate and status is IN_PROGRESS, consider it RUNNING
  // This handles edge cases where kickOffDate might not be set yet
  return RELEASE_ACTIVE_STATUS.RUNNING;
}

/**
 * Check if release is paused
 * 
 * EXCEPTION: When cronStatus is COMPLETED but stage4Status is IN_PROGRESS and release status is IN_PROGRESS,
 * the release is still active in distribution stage (no automated tasks, but release is still in progress).
 * In this case, don't treat it as paused even if pauseType is set.
 * 
 * @param release - Backend release response
 * @returns true if release is paused, false otherwise
 */
export function isReleasePaused(release: BackendReleaseResponse): boolean {
  const pauseType = release.cronJob?.pauseType;
  const hasPauseType = !!(pauseType && pauseType !== 'NONE');
  
  // Special case: Distribution stage with completed cron but active release
  // When cronStatus is COMPLETED (no automated tasks) but stage4Status is IN_PROGRESS
  // and release status is IN_PROGRESS, the release is still active, not paused
  const cronStatus = release.cronJob?.cronStatus;
  const stage4Status = release.cronJob?.stage4Status;
  const isDistributionStageActive = 
    cronStatus === 'COMPLETED' && 
    stage4Status === 'IN_PROGRESS' && 
    release.status === RELEASE_STATUS.IN_PROGRESS;
  
  // If distribution stage is active, don't treat as paused
  if (isDistributionStageActive) {
    return false;
  }
  
  return hasPauseType;
}

/**
 * Get UI active status badge color
 * Returns Mantine color string based on UI active status
 */
export function getActiveStatusColor(status: typeof RELEASE_ACTIVE_STATUS[keyof typeof RELEASE_ACTIVE_STATUS]): string {
  switch (status) {
    case RELEASE_ACTIVE_STATUS.UPCOMING:
      return MANTINE_COLORS.BLUE;
    case RELEASE_ACTIVE_STATUS.RUNNING:
      return MANTINE_COLORS.GREEN;
    case RELEASE_ACTIVE_STATUS.PAUSED:
      return MANTINE_COLORS.YELLOW;
    case RELEASE_ACTIVE_STATUS.COMPLETED:
      return MANTINE_COLORS.GREEN;
    case RELEASE_ACTIVE_STATUS.ARCHIVED:
      return MANTINE_COLORS.GRAY;
    default:
      return MANTINE_COLORS.GRAY;
  }
}

/**
 * Check if pre-release stage or later stages have started
 * Used to determine if regression slots can be added/edited
 * 
 * @param isEditMode - Whether we're in edit mode
 * @param existingRelease - The existing release (optional)
 * @returns true if pre-release has started or completed, false otherwise
 */
export function isPreReleaseInProgress(
  isEditMode: boolean,
  existingRelease?: BackendReleaseResponse | null
): boolean {
  if (!isEditMode || !existingRelease || !existingRelease.cronJob) return false;
  const cronJob = existingRelease.cronJob as any;
  const stage3Status = cronJob.stage3Status;
  const stage4Status = cronJob.stage4Status;
  
  if (stage3Status === StageStatus.IN_PROGRESS || stage3Status === StageStatus.COMPLETED) {
    return true;
  }
  
  if (stage4Status === StageStatus.IN_PROGRESS || stage4Status === StageStatus.COMPLETED) {
    return true;
  }
  
  return false;
}
