/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints and settings
 * Supports switching between mock and real backend via environment variables
 */

/**
 * API Base Configuration
 * 
 * Environment variables (in .env):
 *   PORT=3000                                        # Frontend port (default: 3000, can be overridden)
 *   DELIVR_BACKEND_URL=http://localhost:3010         # Real backend URL
 *   DELIVR_MOCK_URL=http://localhost:4000            # Mock server URL (for Distribution)
 *   DELIVR_HYBRID_MODE=true                          # Hybrid mode (Distribution→mock, rest→backend)
 */
export const API_CONFIG = {
  // Base URL for real backend
  BASE_URL: process.env.DELIVR_BACKEND_URL ?? 'http://localhost:3010',
  
  // Mock server URL for Distribution module (while backend not ready)
  MOCK_BASE_URL: process.env.DELIVR_MOCK_URL ?? 'http://localhost:4000',
  
  // Mock mode flag - when true, ALL requests go to mock server
  MOCK_MODE: process.env.DELIVR_MOCK_MODE === 'true',
  
  // Hybrid mode - Distribution APIs go to mock, everything else to real backend
  HYBRID_MODE: process.env.DELIVR_HYBRID_MODE === 'true',
  
  // Request timeout (30 seconds)
  TIMEOUT: 30000,
  
  // Polling interval for status updates (10 seconds)
  POLLING_INTERVAL: 10000,
  
  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000,      // 1 second
    MAX_DELAY: 10000,          // 10 seconds
    BACKOFF_MULTIPLIER: 2,     // Exponential backoff
  },
} as const;

/**
 * Distribution API patterns that should go to mock server in hybrid mode
 */
export const DISTRIBUTION_API_PATTERNS = [
  '/api/v1/distributions',
  '/api/v1/releases/*/builds',
  '/api/v1/releases/*/builds/*',
  '/api/v1/releases/*/builds/upload-aab',
  '/api/v1/releases/*/builds/verify-testflight',
  '/api/v1/releases/*/extra-commits',
  '/api/v1/releases/*/pm-status',
  '/api/v1/releases/*/approve',
  '/api/v1/releases/*/distribute',
  '/api/v1/releases/*/distribution/status',
  '/api/v1/releases/*/stores',
  '/api/v1/releases/*/submissions',
  '/api/v1/submissions/*',
  '/api/v1/submissions/*/status',
  '/api/v1/submissions/*/retry',
  '/api/v1/submissions/*/rollout',
  '/api/v1/submissions/*/rollout/pause',
  '/api/v1/submissions/*/rollout/resume',
  '/api/v1/submissions/*/rollout/halt',
  '/api/v1/submissions/*/history',
] as const;

/**
 * Release Process API patterns that should go to mock server in hybrid mode
 * Updated to match backend contract endpoints
 */
export const RELEASE_PROCESS_API_PATTERNS = [
  '/api/v1/tenants/*/releases/*',                    // Get Release Details (API #1)
  '/api/v1/tenants/*/releases/*/tasks',               // Get Stage Tasks (API #2) - with ?stage= query param
  '/api/v1/tenants/*/releases/*/tasks/*/retry',      // Retry Task (API #8)
  '/api/v1/tenants/*/releases/*/builds',            // Get All Builds (API #14)
  '/api/v1/tenants/*/releases/*/stages/*/builds/*',  // Upload Build (API #15) - Backend route: /stages/:stage/builds/:platform
  '/api/v1/tenants/*/releases/*/builds/*',           // Delete Build (API #16)
  '/api/v1/tenants/*/releases/*/test-management-run-status',  // Test Management Status (API #17)
  '/api/v1/tenants/*/releases/*/project-management-run-status',  // Project Management Status (API #18)
  '/api/v1/tenants/*/releases/*/check-cherry-pick-status',  // Cherry Pick Status (API #19)
  '/api/v1/tenants/*/releases/*/trigger-pre-release',  // Approve Regression (API #11)
  '/api/v1/tenants/*/releases/*/stages/pre-release/complete',  // Complete Pre-Release (API #12)
  '/api/v1/tenants/*/releases/*/notifications',       // Get Notifications (API #20)
  '/api/v1/tenants/*/releases/*/notify',              // Send Notification (API #21)
  '/api/v1/tenants/*/releases/*/activity-logs',       // Activity Logs (API #23)
  '/api/v1/tenants/*/releases/*/pause-resume',        // Pause/Resume Release (API #29, #30)
] as const;

/**
 * Check if a URL matches Distribution API patterns
 */
export function isDistributionAPI(url: string): boolean {
  // Normalize URL (remove base URL if present)
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  
  return DISTRIBUTION_API_PATTERNS.some(pattern => {
    // Convert pattern to regex: /api/v1/releases/*/builds -> /api/v1/releases/[^/]+/builds
    const regexPattern = pattern
      .replace(/\*/g, '[^/]+')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  });
}

/**
 * Check if a URL matches Release Process API patterns
 */
export function isReleaseProcessAPI(url: string): boolean {
  // Normalize URL (remove base URL if present)
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  
  return RELEASE_PROCESS_API_PATTERNS.some(pattern => {
    // Convert pattern to regex: /api/v1/tenants/*/releases/*/stages/* -> /api/v1/tenants/[^/]+/releases/[^/]+/stages/[^/]+
    const regexPattern = pattern
      .replace(/\*/g, '[^/]+')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  });
}

/**
 * Get the appropriate base URL for a request
 */
export function getBaseURLForRequest(url: string): string {
  // Full mock mode - everything goes to mock
  if (API_CONFIG.MOCK_MODE) {
    return API_CONFIG.MOCK_BASE_URL;
  }
  
  // Hybrid mode - Distribution and Release Process APIs go to mock, everything else to real backend
  if (API_CONFIG.HYBRID_MODE) {
    if (isDistributionAPI(url) || isReleaseProcessAPI(url)) {
      return API_CONFIG.MOCK_BASE_URL;
    }
  }
  
  // Default - use real backend
  return API_CONFIG.BASE_URL;
}

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // ============================================================================
  // PRE-RELEASE STAGE APIs
  // ============================================================================
  
  // Builds
  GET_BUILDS: (releaseId: string) => `/api/v1/releases/${releaseId}/builds`,
  GET_BUILD: (buildId: string) => `/api/v1/releases/builds/${buildId}`,
  UPLOAD_AAB: (releaseId: string) => `/api/v1/releases/${releaseId}/builds/upload-aab`,
  VERIFY_TESTFLIGHT: (releaseId: string) => `/api/v1/releases/${releaseId}/builds/verify-testflight`,
  
  // Approval
  GET_EXTRA_COMMITS: (releaseId: string) => `/api/v1/releases/${releaseId}/extra-commits`,
  GET_PM_STATUS: (releaseId: string) => `/api/v1/releases/${releaseId}/pm-status`,
  MANUAL_APPROVE: (releaseId: string) => `/api/v1/releases/${releaseId}/approve`,
  
  // ============================================================================
  // DISTRIBUTION STAGE APIs
  // ============================================================================
  
  // Submission
  SUBMIT_TO_STORES: (releaseId: string) => `/api/v1/releases/${releaseId}/distribute`,
  GET_DISTRIBUTION_STATUS: (releaseId: string) => `/api/v1/releases/${releaseId}/distribution/status`,
  GET_SUBMISSIONS: (releaseId: string) => `/api/v1/releases/${releaseId}/submissions`,
  GET_SUBMISSION: (submissionId: string) => `/api/v1/submissions/${submissionId}`,
  POLL_SUBMISSION_STATUS: (submissionId: string) => `/api/v1/submissions/${submissionId}/status`,
  RETRY_SUBMISSION: (submissionId: string) => `/api/v1/submissions/${submissionId}/retry`,
  
  // ============================================================================
  // ROLLOUT CONTROL APIs
  // ============================================================================
  
  UPDATE_ROLLOUT: (submissionId: string) => `/api/v1/submissions/${submissionId}/rollout`,
  PAUSE_ROLLOUT: (submissionId: string) => `/api/v1/submissions/${submissionId}/rollout/pause`,
  RESUME_ROLLOUT: (submissionId: string) => `/api/v1/submissions/${submissionId}/rollout/resume`,
  HALT_ROLLOUT: (submissionId: string) => `/api/v1/submissions/${submissionId}/rollout/halt`,
  GET_SUBMISSION_HISTORY: (submissionId: string) => `/api/v1/submissions/${submissionId}/history`,
  
  // ============================================================================
  // RELEASE MANAGEMENT APIs
  // ============================================================================
  
  GET_RELEASE: (releaseId: string) => `/api/v1/releases/${releaseId}`,
  UPDATE_RELEASE_STATUS: (releaseId: string) => `/api/v1/releases/${releaseId}/status`,
  GET_RELEASE_TIMELINE: (releaseId: string) => `/api/v1/releases/${releaseId}/timeline`,
  
  // ============================================================================
  // INTEGRATION/CONFIG APIs
  // ============================================================================
  
  LIST_STORE_INTEGRATIONS: () => `/api/v1/integrations/stores`,
  GET_STORE_INTEGRATION: (integrationId: string) => `/api/v1/integrations/stores/${integrationId}`,
  VERIFY_STORE_INTEGRATION: (integrationId: string) => `/api/v1/integrations/stores/${integrationId}/verify`,
} as const;

/**
 * HTTP Methods
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  MULTI_STATUS: 207,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Content Types
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
} as const;

