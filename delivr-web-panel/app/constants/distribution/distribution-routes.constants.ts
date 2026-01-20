/**
 * Distribution Module - Route Constants
 * Centralized route paths for navigation
 */

/**
 * Route paths (for programmatic navigation)
 */
export const DISTRIBUTION_ROUTES = {
  /**
   * Distribution management page - view/manage a specific distribution
   */
  DISTRIBUTION_DETAILS: (org: string, distributionId: string) =>
    `/dashboard/${org}/distributions/${distributionId}`,
  
  /**
   * Distribution list page - view all distributions
   */
  DISTRIBUTIONS_LIST: (org: string) =>
    `/dashboard/${org}/distributions`,
  
  /**
   * Release details page - includes distribution stage
   */
  RELEASE_DETAILS: (org: string, releaseId: string) =>
    `/dashboard/${org}/releases/${releaseId}`,
} as const;

/**
 * Query parameter keys
 */
export const DISTRIBUTION_QUERY_PARAMS = {
  PLATFORM: 'platform',
  STATUS: 'status',
  PAGE: 'page',
  PAGE_SIZE: 'pageSize',
} as const;

