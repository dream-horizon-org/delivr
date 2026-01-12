/**
 * Release Process Date Formatting Utilities
 * Consistent date formatting for release process components
 */

/**
 * Format ISO date string to readable date and time
 * Format: "Jan 15, 2024, 02:30 PM"
 */
export function formatReleaseDateTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Unknown date';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format ISO date string to readable date only
 * Format: "Jan 15, 2024"
 */
export function formatReleaseDate(isoString: string | null | undefined): string {
  if (!isoString) return 'Unknown date';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format timestamp to readable date/time with relative time
 * Returns relative time for recent dates (e.g., "5 minutes ago", "2 hours ago")
 * Returns formatted date for older dates
 */
export function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
}


