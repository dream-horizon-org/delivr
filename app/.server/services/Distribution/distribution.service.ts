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
import type {
  APISuccessResponse,
  ApprovalResponse,
  BuildResponse,
  BuildsResponse,
  CreateResubmissionRequest,
  DistributionsResponse,
  DistributionWithSubmissions,
  ExtraCommitsResponse,
  HaltRolloutRequest,
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
    // In HYBRID_MODE or MOCK_MODE, Distribution APIs go to mock server
    // Base URL should be just the backend URL, not including /api/v1/distributions
    baseURL: getBackendBaseURL(),
    timeout: 10000,
  });

  /**
   * Build headers with userId for authentication
   * Backend accepts 'userid' header as fallback when Authorization token is not present
   */
  private buildHeaders(userId: string, additionalHeaders?: Record<string, string>) {
    return {
      'userid': userId,
      ...(additionalHeaders || {}),
    };
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
      '/api/v1/distributions',
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
   * @param platform - Required for backend to identify which table to query (android_submission_builds or ios_submission_builds)
   */
  async getSubmission(submissionId: string, platform: Platform) {
    return this.__client.get<null, SubmissionResponse>(
      `/api/v1/submissions/${submissionId}?platform=${platform}`
    );
  }

  /**
   * Get distribution details by distributionId
   * Returns full distribution object with all submissions and artifacts
   */
  async getDistribution(distributionId: string) {
    return this.__client.get<null, AxiosResponse<APISuccessResponse<DistributionWithSubmissions>>>(
      `/api/v1/distributions/${distributionId}`
    );
  }

  /**
   * Get distribution details by releaseId (for release process distribution step)
   * Returns full distribution object with all submissions and artifacts
   * Reference: DISTRIBUTION_API_SPEC.md - Line 303
   */
  async getReleaseDistribution(releaseId: string, userId: string) {
    return this.__client.get<null, AxiosResponse<APISuccessResponse<DistributionWithSubmissions>>>(
      `/api/v1/releases/${releaseId}/distribution`,
      {
        headers: this.buildHeaders(userId)
      }
    );
  }

  /**
   * Submit an existing PENDING submission (first-time submission)
   * Updates submission details and changes status from PENDING to IN_REVIEW
   * @param platform - Required for backend to identify which table to query (android_submission_builds or ios_submission_builds)
   */
  async submitSubmission(submissionId: string, request: SubmitSubmissionRequest, platform: Platform) {
    return this.__client.put<SubmitSubmissionRequest, AxiosResponse<SubmissionResponse>>(
      `/api/v1/submissions/${submissionId}/submit?platform=${platform}`,
      request
    );
  }

  /**
   * Create a new submission (resubmission after rejection or cancellation)
   * Creates completely new submission with new artifact
   * For Android: Handles multipart/form-data with AAB upload
   * For iOS: Handles application/json with TestFlight build number
   */
  async createResubmission(
    distributionId: string,
    request: CreateResubmissionRequest | FormData
  ) {
    return this.__client.post<
      CreateResubmissionRequest | FormData,
      AxiosResponse<SubmissionResponse>
    >(
      `/api/v1/distributions/${distributionId}/submissions`,
      request,
      {
        headers:
          request instanceof FormData
            ? { 'Content-Type': 'multipart/form-data' }
            : { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Retry a failed submission (creates NEW submission ID)
   * NOTE: This is legacy - Use createResubmission() instead per API spec
   */
  /**
   * Cancel a submission (IN_REVIEW, APPROVED, etc.)
   * @param platform - Required for backend to identify which table to update (android_submission_builds or ios_submission_builds)
   */
  async cancelSubmission(submissionId: string, request: { reason?: string }, platform: Platform) {
    return this.__client.delete<{ reason: string }, SubmissionResponse>(
      `/api/v1/submissions/${submissionId}/cancel?platform=${platform}`,
      { data: request }
    );
  }

  /**
   * Edit existing submission (stage-dependent fields only)
   */
  async editSubmission(submissionId: string, updates: Partial<{
    releaseNotes: string;
    rolloutPercentage: number;
    releaseType: string;
  }>) {
    return this.__client.patch<typeof updates, SubmissionResponse>(
      `/api/v1/submissions/${submissionId}`,
      updates
    );
  }

  // ====================
  // Rollout Control APIs
  // ====================

  /**
   * Update rollout percentage
   * @param platform - Required for backend to identify which table to update (android_submission_builds or ios_submission_builds)
   */
  async updateRollout(submissionId: string, request: UpdateRolloutRequest, platform: Platform) {
    return this.__client.patch<UpdateRolloutRequest, RolloutUpdateResponse>(
      `/api/v1/submissions/${submissionId}/rollout?platform=${platform}`,
      request
    );
  }

  /**
   * Pause rollout (iOS only)
   * @param platform - Must be "IOS" (Android does not support pause)
   */
  async pauseRollout(submissionId: string, request: PauseRolloutRequest, platform: Platform) {
    return this.__client.post<PauseRolloutRequest, RolloutUpdateResponse>(
      `/api/v1/submissions/${submissionId}/rollout/pause?platform=${platform}`,
      request
    );
  }

  /**
   * Resume rollout (iOS only)
   * @param platform - Must be "IOS" (Android does not support resume)
   */
  async resumeRollout(submissionId: string, platform: Platform) {
    return this.__client.post<null, RolloutUpdateResponse>(
      `/api/v1/submissions/${submissionId}/rollout/resume?platform=${platform}`
    );
  }

  /**
   * Emergency halt rollout
   * @param platform - Required for backend to identify which table to update (android_submission_builds or ios_submission_builds)
   */
  async haltRollout(submissionId: string, request: HaltRolloutRequest, platform: Platform) {
    return this.__client.post<HaltRolloutRequest, RolloutUpdateResponse>(
      `/api/v1/submissions/${submissionId}/rollout/halt?platform=${platform}`,
      request
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

