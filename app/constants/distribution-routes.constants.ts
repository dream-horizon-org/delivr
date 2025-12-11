/**
 * Distribution Module - Route Constants
 * Centralized route paths for navigation
 */

/**
 * Generate distribution page URL
 */
export function getDistributionPageUrl(org: string, releaseId: string): string {
  return `/dashboard/${org}/releases/${releaseId}/distribution`;
}

/**
 * Generate submission details page URL
 */
export function getSubmissionDetailsUrl(
  org: string,
  releaseId: string,
  submissionId: string
): string {
  return `/dashboard/${org}/releases/${releaseId}/submissions/${submissionId}`;
}

/**
 * Route paths (for programmatic navigation)
 */
export const DISTRIBUTION_ROUTES = {
  DISTRIBUTION: (org: string, releaseId: string) =>
    `/dashboard/${org}/releases/${releaseId}/distribution`,
  
  SUBMISSION_DETAILS: (org: string, releaseId: string, submissionId: string) =>
    `/dashboard/${org}/releases/${releaseId}/submissions/${submissionId}`,
  
  RELEASE_DETAILS: (org: string, releaseId: string) =>
    `/dashboard/${org}/releases/${releaseId}`,
} as const;

/**
 * Tab keys for distribution page
 */
export const DISTRIBUTION_TABS = {
  PRE_RELEASE: 'pre-release',
  DISTRIBUTION: 'distribution',
} as const;

/**
 * Query parameter keys
 */
export const DISTRIBUTION_QUERY_PARAMS = {
  TAB: 'tab',
  PLATFORM: 'platform',
  STATUS: 'status',
} as const;

