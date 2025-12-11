/**
 * Distribution Module Backend Service
 * Proxies HTTP calls to OTA server or mock server
 * Follows same pattern as CodepushService
 * 
 * NOTE: Distribution APIs can be routed to mock server via DELIVR_MOCK_URL env var
 * When DELIVR_HYBRID_MODE=true, all Distribution APIs go to mock server
 */

import axios, { type AxiosResponse } from 'axios';
import type {
  ApprovalResponse,
  BuildResponse,
  BuildsResponse,
  DistributionStatusResponse,
  ExtraCommitsResponse,
  HaltRolloutRequest,
  ManualApprovalRequest,
  PauseRolloutRequest,
  Platform,
  PMStatusResponse,
  ReleaseStoresResponse,
  RetrySubmissionRequest,
  RolloutUpdateResponse,
  SubmissionHistoryResponse,
  SubmissionResponse,
  SubmissionsResponse,
  SubmitToStoreRequest,
  SubmitToStoreResponse,
  UpdateRolloutRequest,
  VerifyTestFlightRequest
} from '~/types/distribution.types';

// Response types for endpoints without specific types
type UploadAABResponse = { success: boolean; data?: { build: unknown }; error?: { message: string } };
type VerifyTestFlightResponse = { success: boolean; data?: { build: unknown }; error?: { message: string } };

/**
 * Determine the base URL for Distribution APIs
 * - If DELIVR_HYBRID_MODE=true → use DELIVR_MOCK_URL (mock server)
 * - Otherwise → use DELIVR_BACKEND_URL (real backend)
 */
function getDistributionBaseURL(): string {
  const isHybridMode = process.env.DELIVR_HYBRID_MODE === 'true';
  const mockURL = process.env.DELIVR_MOCK_URL || 'http://localhost:4000';
  const backendURL = process.env.DELIVR_BACKEND_URL || process.env.BACKEND_API_URL || 'http://localhost:3010';
  
  if (isHybridMode) {
    console.log('[DistributionService] Using mock server:', mockURL);
    return mockURL;
  }
  
  return backendURL;
}

class Distribution {
  private __client = axios.create({
    baseURL: getDistributionBaseURL(),
    timeout: 30000,
  });

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

  // NOTE: No retryBuild() method - CICD builds are auto-triggered by Release Orchestrator
  // If a CI build fails, user retries via their CI system (Jenkins, GitHub Actions, etc.)
  // Delivr just tracks the status via Chronicle polling

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
   * List all active distributions across all releases
   * Aggregates release + submission data
   */
  async listDistributions() {
    return this.__client.get<{ success: boolean; data: { distributions: unknown[] }; error?: { message: string } }>(
      '/api/v1/distributions'
    );
  }

  /**
   * Submit release builds to stores (main entry point)
   */
  async submitToStores(releaseId: string, request: SubmitToStoreRequest) {
    return this.__client.post<SubmitToStoreRequest, AxiosResponse<SubmitToStoreResponse>>(
      `/api/v1/releases/${releaseId}/distribute`,
      request
    );
  }

  /**
   * Get distribution status for a release
   * @param platform - Optional platform filter (ANDROID or IOS)
   */
  async getDistributionStatus(releaseId: string, platform?: Platform) {
    const params = platform ? { platform } : {};
    return this.__client.get<null, AxiosResponse<DistributionStatusResponse>>(
      `/api/v1/releases/${releaseId}/distribution/status`,
      { params }
    );
  }

  /**
   * Get all submissions for a release
   */
  async getSubmissions(releaseId: string) {
    return this.__client.get<null, AxiosResponse<SubmissionsResponse>>(
      `/api/v1/releases/${releaseId}/submissions`
    );
  }

  /**
   * Get single submission details
   */
  async getSubmission(submissionId: string) {
    return this.__client.get<null, SubmissionResponse>(
      `/api/v1/submissions/${submissionId}`
    );
  }

  /**
   * Poll submission status (lightweight)
   */
  async pollSubmissionStatus(submissionId: string) {
    return this.__client.get<null, SubmissionResponse>(
      `/api/v1/submissions/${submissionId}/status`
    );
  }

  /**
   * Retry a failed submission
   */
  async retrySubmission(submissionId: string, request?: RetrySubmissionRequest) {
    return this.__client.post<RetrySubmissionRequest | undefined, SubmissionResponse>(
      `/api/v1/submissions/${submissionId}/retry`,
      request
    );
  }

  // ====================
  // Rollout Control APIs
  // ====================

  /**
   * Update rollout percentage
   */
  async updateRollout(submissionId: string, request: UpdateRolloutRequest) {
    return this.__client.patch<UpdateRolloutRequest, RolloutUpdateResponse>(
      `/api/v1/submissions/${submissionId}/rollout`,
      request
    );
  }

  /**
   * Pause rollout
   */
  async pauseRollout(submissionId: string, request: PauseRolloutRequest) {
    return this.__client.post<PauseRolloutRequest, RolloutUpdateResponse>(
      `/api/v1/submissions/${submissionId}/rollout/pause`,
      request
    );
  }

  /**
   * Resume rollout
   */
  async resumeRollout(submissionId: string) {
    return this.__client.post<null, RolloutUpdateResponse>(
      `/api/v1/submissions/${submissionId}/rollout/resume`
    );
  }

  /**
   * Emergency halt rollout
   */
  async haltRollout(submissionId: string, request: HaltRolloutRequest) {
    return this.__client.post<HaltRolloutRequest, RolloutUpdateResponse>(
      `/api/v1/submissions/${submissionId}/rollout/halt`,
      request
    );
  }

  /**
   * Get submission history
   */
  async getSubmissionHistory(submissionId: string, limit?: number, offset?: number) {
    const params = { limit, offset };
    return this.__client.get<null, SubmissionHistoryResponse>(
      `/api/v1/submissions/${submissionId}/history`,
      { params }
    );
  }
}

export const DistributionService = new Distribution();

