/**
 * Distribution Fetcher Utilities
 * 
 * Common utilities for handling Remix fetcher responses in distribution components.
 */

// ============================================================================
// TYPES
// ============================================================================

/** Standard API response structure */
export interface FetcherResponse {
  success?: boolean;
  error?: string;
  data?: unknown;
}

/** Parsed fetcher state */
export interface ParsedFetcherState {
  isSuccess: boolean;
  isError: boolean;
  error: string | undefined;
  data: unknown | undefined;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Parse fetcher data with type safety
 * Handles the common pattern of checking success/error in fetcher responses
 */
export function parseFetcherResponse(fetcherData: unknown): ParsedFetcherState {
  const data = fetcherData as FetcherResponse | undefined;
  
  return {
    isSuccess: data?.success === true,
    isError: data?.error !== undefined,
    error: data?.error,
    data: data?.data,
  };
}

/**
 * Check if fetcher is in submitting state
 */
export function isFetcherSubmitting(fetcherState: string): boolean {
  return fetcherState === 'submitting';
}

/**
 * Check if fetcher is idle and successful
 */
export function isFetcherIdleAndSuccessful(
  fetcherState: string,
  fetcherData: unknown
): boolean {
  const { isSuccess } = parseFetcherResponse(fetcherData);
  return fetcherState === 'idle' && isSuccess;
}

