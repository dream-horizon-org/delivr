/**
 * Distribution Module Backend Service
 * Proxies HTTP calls to OTA server or mock server
 * Follows same pattern as CodepushService
 * 
 * NOTE: Distribution APIs can be routed to mock server via DELIVR_MOCK_URL env var
 * When DELIVR_HYBRID_MODE=true, all Distribution APIs go to mock server
 */

import axios, { type AxiosResponse } from 'axios';
import { getBackendBaseURL } from '~/.server/utils/base-url.utils';
import { getCurrentUser } from '~/.server/utils/request-context';
import type {
  APISuccessResponse,
  ApprovalResponse,
  BuildResponse,
  BuildsResponse,
  CreateResubmissionRequest,
  DistributionsResponse,
  DistributionWithSubmissions,
  ExtraCommitsResponse,
  ManualApprovalRequest,
  PauseRolloutRequest,
  Platform,
  PMStatusResponse,
  ReleaseStoresResponse,
  RolloutUpdateResponse,
  SubmissionResponse,
  SubmitSubmissionRequest,
  UpdateRolloutRequest,
  UploadAABResponse,
  VerifyTestFlightRequest,
  VerifyTestFlightResponse
} from '~/types/distribution/distribution.types';

class Distribution {
  private __client = axios.create({
    // Don't set baseURL here - we'll determine it per-request in the interceptor
    timeout: 10000,
  });

  constructor() {
    // Add request interceptor to:
    // 1. Dynamically set base URL based on HYBRID_MODE
    // 2. Automatically inject authentication headers from request context
    this.__client.interceptors.request.use((config) => {
      // Set base URL
      const url = config.url || '';
      const baseURL = getBackendBaseURL(url);
      config.baseURL = baseURL;

      // Inject authentication headers from request context
      const user = getCurrentUser();
      
      if (user) {
        const authHeaders = this.buildAuthHeaders(user);
        Object.assign(config.headers, authHeaders);
      } else {
        console.warn('[Distribution Service] No user in request context! Request may fail.');
      }

      return config;
    });
  }

  /**
   * Build authentication headers for backend API calls
   * Uses ONLY Bearer token authentication (no fallback)
   * 
   * Token is automatically refreshed by authenticate.ts before API calls
   * If refresh fails, user is logged out
   */
  private buildAuthHeaders(user: { user: { id: string; idToken: string | null } }): Record<string, string> {
    const headers: Record<string, string> = {};
    
    const idToken = user?.user?.idToken;

    if (idToken !== null && idToken !== undefined) {
      headers['Authorization'] = `Bearer ${idToken}`;
    } else {
      console.error('[Distribution Service] ❌ No idToken available - user needs to re-login');
    }
    
    return headers;
  }

  // ======================
  // Pre-Release Stage APIs
  // ======================

  /**
   * Get all builds for a release
   */
  async getBuilds(releaseId: string, platform?: Platform) {
    const params = platform ? { platform } : {};
    return this.__client.get<null, AxiosResponse<BuildsResponse>>(
      `/api/v1/releases/${releaseId}/builds`,
      { params }
    );
  }

  /**
   * Get single build details (pre-release builds only: PRODUCTION/TESTFLIGHT)
   */
  async getBuild(releaseId: string, buildId: string) {
    return this.__client.get<null, AxiosResponse<BuildResponse>>(
      `/api/v1/releases/${releaseId}/builds/${buildId}`
    );
  }

  /**
   * Upload Android AAB (manual mode)
   */
  async uploadAAB(releaseId: string, file: Blob, metadata?: { versionName?: string; versionCode?: string }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', 'ANDROID');
    formData.append('releaseId', releaseId);

    if (metadata?.versionName) {
      formData.append('versionName', metadata.versionName);
    }
    if (metadata?.versionCode) {
      formData.append('versionCode', metadata.versionCode);
    }

    return this.__client.post<null, AxiosResponse<UploadAABResponse>>(
      `/api/v1/releases/${releaseId}/builds/upload-aab`,
      formData
    );
  }

  /**
   * Verify iOS TestFlight build
   */
  async verifyTestFlight(releaseId: string, request: VerifyTestFlightRequest) {
    return this.__client.post<VerifyTestFlightRequest, AxiosResponse<VerifyTestFlightResponse>>(
      `/api/v1/releases/${releaseId}/builds/verify-testflight`,
      request
    );
  }

  /**
   * Retry failed build (triggers CI/CD workflow)
   * Available for builds with status 'FAILED'
   */
  async retryBuild(releaseId: string, buildId: string) {
    return this.__client.post<null, AxiosResponse<BuildResponse>>(
      `/api/v1/releases/${releaseId}/builds/${buildId}/retry`,
      null
    );
  }

  /**
   * Get PM approval status
   */
  async getPMStatus(releaseId: string) {
    return this.__client.get<null, AxiosResponse<PMStatusResponse>>(
      `/api/v1/releases/${releaseId}/pm-status`
    );
  }

  /**
   * Manual approval (when no PM integration)
   */
  async manualApprove(releaseId: string, request: ManualApprovalRequest) {
    return this.__client.post<ManualApprovalRequest, AxiosResponse<ApprovalResponse>>(
      `/api/v1/releases/${releaseId}/approve`,
      request
    );
  }

  /**
   * Check for extra commits after last regression
   */
  async checkExtraCommits(releaseId: string) {
    return this.__client.get<null, AxiosResponse<ExtraCommitsResponse>>(
      `/api/v1/releases/${releaseId}/extra-commits`
    );
  }

  /**
   * Get store integrations configured for this release
   * (Release → ReleaseConfig → Store Integrations)
   */
  async getReleaseStores(releaseId: string) {
    return this.__client.get<null, AxiosResponse<ReleaseStoresResponse>>(
      `/api/v1/releases/${releaseId}/stores`
    );
  }

  // =======================
  // Distribution Stage APIs
  // =======================

  /**
   * List all active distributions across all releases (paginated)
   * Aggregates release + submission data from distribution, android_submissions, and ios_submissions tables
   * 
   * @param tenantId - Tenant/Organization ID (required)
   * @param page - Page number (1-indexed)
   * @param pageSize - Number of items per page
   * @param status - Filter by distribution status (optional)
   * @param platform - Filter by platform (optional)
   * @returns Paginated list of distributions with their submissions
   */
  async listDistributions(
    tenantId: string,
    page: number = 1,
    pageSize: number = 10,
    status: string | null = null,
    platform: string | null = null
  ) {
    const params: Record<string, string | number> = { tenantId, page, pageSize };
    if (status) {
      params.status = status;
    }
    if (platform) {
      params.platform = platform;
    }

    return this.__client.get<DistributionsResponse>(
      `/api/v1/distributions`,
      { params }
    );
  }

  // ======================
  // REMOVED LEGACY METHODS (Not in DISTRIBUTION_API_SPEC.md):
  // - submitToStores() → Use submitSubmission() per platform instead
  // - submitToStoresByDistributionId() → Use submitSubmission() per platform instead
  // - getDistributionStatus() → Use getReleaseDistribution() or getDistribution() instead
  // - getSubmissions() → Use getReleaseDistribution() or getDistribution() which includes submissions
  // - pollSubmissionStatus() → Use getSubmission() instead
  // ======================

  /**
   * Get single submission details
   * @param tenantId - Tenant ID for authorization
   * @param submissionId - Submission ID
   * @param platform - Required for backend to identify which table to query (android_submission_builds or ios_submission_builds)
   */
  async getSubmission(tenantId: string, submissionId: string, platform: Platform) {
    return this.__client.get<null, SubmissionResponse>(
      `/api/v1/tenants/${tenantId}/submissions/${submissionId}?platform=${platform}`
    );
  }

  /**
   * Get distribution details by distributionId
   * Returns full distribution object with all submissions and artifacts
   * @param tenantId - Tenant ID for authorization
   * @param distributionId - Distribution ID
   */
  async getDistribution(tenantId: string, distributionId: string) {
    return this.__client.get<null, AxiosResponse<APISuccessResponse<DistributionWithSubmissions>>>(
      `/api/v1/tenants/${tenantId}/distributions/${distributionId}`
    );
  }

  /**
   * Get distribution details by releaseId (for release process distribution step)
   * Returns full distribution object with all submissions and artifacts
   * Reference: DISTRIBUTION_API_SPEC.md - Line 303
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID
   */
  async getReleaseDistribution(tenantId: string, releaseId: string) {
    return this.__client.get<null, AxiosResponse<APISuccessResponse<DistributionWithSubmissions>>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/distribution`
    );
  }

  /**
   * Submit an existing PENDING submission (first-time submission)
   * Updates submission details and changes status from PENDING to IN_REVIEW
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param submissionId - Submission ID
   * @param request - Submission details
   * @param platform - Required for backend to identify which table to query (android_submission_builds or ios_submission_builds)
   */
  async submitSubmission(tenantId: string, releaseId: string, submissionId: string, request: SubmitSubmissionRequest, platform: Platform) {
    return this.__client.put<SubmitSubmissionRequest, AxiosResponse<SubmissionResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/submissions/${submissionId}/submit?platform=${platform}`,
      request
    );
  }

  /**
   * Create a new submission (resubmission after rejection or cancellation)
   * Creates completely new submission with new artifact
   * For Android: Handles multipart/form-data with AAB upload
   * For iOS: Handles application/json with TestFlight build number
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param distributionId - Distribution ID
   * @param request - Request data (FormData for Android, JSON for iOS)
   */
  async createResubmission(
    tenantId: string,
    releaseId: string,
    distributionId: string,
    request: CreateResubmissionRequest | FormData
  ) {
    return this.__client.post<
      CreateResubmissionRequest | FormData,
      AxiosResponse<SubmissionResponse>
    >(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/distributions/${distributionId}/submissions`,
      request,
      {
        headers:
          request instanceof FormData
            ? { 'Content-Type': 'multipart/form-data' }
            : { 'Content-Type': 'application/json' },
        // Override timeout for AAB bundle uploads (can take longer, especially for large files)
        // Matches pre-release phase TASK_TIMEOUT_MS: 600000 (10 minutes)
        timeout: 600000, // 10 minutes
      }
    );
  }

  /**
   * Retry a failed submission (creates NEW submission ID)
   * NOTE: This is legacy - Use createResubmission() instead per API spec
   */
  /**
   * Cancel a submission (IN_REVIEW, APPROVED, etc.)
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param submissionId - Submission ID
   * @param request - Cancel request with reason
   * @param platform - Required for backend to identify which table to update (android_submission_builds or ios_submission_builds)
   */
  async cancelSubmission(tenantId: string, releaseId: string, submissionId: string, request: { reason?: string }, platform: Platform) {
    return this.__client.patch<{ reason: string }, SubmissionResponse>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/submissions/${submissionId}/cancel?platform=${platform}`,
      request
    );
  }

  /**
   * Edit existing submission (stage-dependent fields only)
   * @param tenantId - Tenant ID for authorization
   * @param submissionId - Submission ID
   * @param updates - Fields to update
   */
  async editSubmission(tenantId: string, submissionId: string, updates: Partial<{
    releaseNotes: string;
    rolloutPercentage: number;
    releaseType: string;
  }>) {
    return this.__client.patch<typeof updates, SubmissionResponse>(
      `/api/v1/tenants/${tenantId}/submissions/${submissionId}`,
      updates
    );
  }

  // ====================
  // Rollout Control APIs
  // ====================

  /**
   * Update rollout percentage
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param submissionId - Submission ID
   * @param request - Rollout update request
   * @param platform - Required for backend to identify which table to update (android_submission_builds or ios_submission_builds)
   */
  async updateRollout(tenantId: string, releaseId: string, submissionId: string, request: UpdateRolloutRequest, platform: Platform) {
    return this.__client.patch<UpdateRolloutRequest, RolloutUpdateResponse>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/submissions/${submissionId}/rollout?platform=${platform}`,
      request
    );
  }

  /**
   * Pause rollout (iOS only)
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param submissionId - Submission ID
   * @param request - Pause request with reason
   * @param platform - Must be "IOS" (Android does not support pause)
   */
  async pauseRollout(tenantId: string, releaseId: string, submissionId: string, request: PauseRolloutRequest, platform: Platform) {
    return this.__client.patch<PauseRolloutRequest, RolloutUpdateResponse>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/submissions/${submissionId}/rollout/pause?platform=${platform}`,
      request
    );
  }

  /**
   * Resume rollout (iOS only)
   * @param tenantId - Tenant ID for authorization
   * @param releaseId - Release ID for ownership validation
   * @param submissionId - Submission ID
   * @param platform - Must be "IOS" (Android does not support resume)
   */
  async resumeRollout(tenantId: string, releaseId: string, submissionId: string, platform: Platform) {
    return this.__client.patch<null, RolloutUpdateResponse>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/submissions/${submissionId}/rollout/resume?platform=${platform}`
    );
  }

  /**
   * Get presigned artifact download URL
   * Returns a time-limited S3 URL to download the submission artifact (AAB or IPA)
   * @param tenantId - Required for authorization (ensures user has access to this submission)
   * @param submissionId - Submission ID
   * @param platform - ANDROID or IOS (determines artifact type)
   */
  async getArtifactDownloadUrl(tenantId: string, submissionId: string, platform: Platform) {
    return this.__client.get<null, AxiosResponse<APISuccessResponse<{
      url: string;
      expiresAt: string;
    }>>>(
      `/api/v1/tenants/${tenantId}/submissions/${submissionId}/artifact?platform=${platform}`
    );
  }

}

export const DistributionService = new Distribution();

