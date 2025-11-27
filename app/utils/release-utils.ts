/**
 * Release Utilities
 * Helper functions for release-related operations
 */

import { RELEASE_TYPE, RELEASE_STATUS, TASK_STATUS, MANTINE_COLORS } from '~/constants/release-ui';

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
    case RELEASE_TYPE.PLANNED:
      return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    case RELEASE_TYPE.HOTFIX:
      return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    case RELEASE_TYPE.UNPLANNED:
      return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
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
    case RELEASE_TYPE.HOTFIX:
      return MANTINE_COLORS.RED;
    case RELEASE_TYPE.UNPLANNED:
      return MANTINE_COLORS.PURPLE;
    case RELEASE_TYPE.PLANNED:
      return MANTINE_COLORS.BLUE;
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

