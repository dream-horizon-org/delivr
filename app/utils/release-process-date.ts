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


