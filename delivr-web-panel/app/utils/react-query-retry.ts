/**
 * React Query Retry Utilities
 * Shared retry logic that prevents retrying on auth errors
 */

/**
 * Retry function that doesn't retry on auth errors
 * Prevents cascading failures when authentication expires
 * 
 * @param failureCount - Number of times the query has failed
 * @param error - The error that occurred
 * @returns true if query should retry, false otherwise
 */
export function shouldRetryOnError(failureCount: number, error: unknown): boolean {
  // Don't retry if it's an authentication error (401)
  if (error && typeof error === 'object') {
    const err = error as { isAuthError?: boolean; status?: number };
    if (err.isAuthError === true || err.status === 401) {
      return false;
    }
  }
  // Retry once for other errors
  return failureCount < 1;
}
