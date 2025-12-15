/**
 * Distribution UI Utilities
 * Pure utility functions for formatting and display logic
 * NO React, NO JSX - pure functions only
 */

import { DistributionStatus, RolloutDisplayStatus, SubmissionStatus } from '~/types/distribution.types';

/**
 * Get color for distribution or submission status
 */
export function getStatusColor(status: string): string {
  // Distribution-level statuses
  if (status === DistributionStatus.PENDING) return 'gray';
  if (status === DistributionStatus.PARTIALLY_SUBMITTED) return 'cyan';
  if (status === DistributionStatus.SUBMITTED) return 'blue';
  if (status === DistributionStatus.PARTIALLY_RELEASED) return 'violet';
  if (status === DistributionStatus.RELEASED) return 'green';
  
  // Submission-level statuses
  const colors: Record<string, string> = {
    [SubmissionStatus.IN_REVIEW]: 'yellow',
    [SubmissionStatus.APPROVED]: 'cyan',
    [SubmissionStatus.LIVE]: 'green',
    [SubmissionStatus.PAUSED]: 'orange',
    [SubmissionStatus.REJECTED]: 'red',
    [SubmissionStatus.HALTED]: 'red',
    [SubmissionStatus.CANCELLED]: 'gray',
  };
  
  return colors[status] ?? 'gray';
}

/**
 * Format date to short human-readable string
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  // Fallback to absolute date for older items
  return formatDate(dateString);
}

/**
 * Format status enum to human-readable label
 */
export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

/**
 * Get platform color (Android green, iOS blue)
 */
export function getPlatformColor(platform: string): string {
  return platform === 'ANDROID' ? 'green' : 'blue';
}

/**
 * Get rollout status based on percentage and state
 */
export function getRolloutStatus(
  currentPercentage: number,
  isComplete: boolean,
  canResume: boolean,
  rolloutCompletePercent: number = 100
): RolloutDisplayStatus {
  if (isComplete || currentPercentage === rolloutCompletePercent) {
    return RolloutDisplayStatus.COMPLETE;
  }
  if (canResume) {
    return RolloutDisplayStatus.PAUSED;
  }
  return RolloutDisplayStatus.ACTIVE;
}

/**
 * Get platform rollout label
 */
export function getPlatformRolloutLabel(platform: string): string {
  return platform === 'ANDROID' ? 'Staged Rollout' : 'Phased Release';
}

