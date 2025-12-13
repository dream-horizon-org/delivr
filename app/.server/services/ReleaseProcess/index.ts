/**
 * Release Process Module Backend Service
 * Proxies HTTP calls to OTA server or mock server
 * Follows same pattern as DistributionService
 * 
 * NOTE: Release Process APIs can be routed to mock server via DELIVR_MOCK_URL env var
 * When DELIVR_HYBRID_MODE=true, all Release Process APIs go to mock server
 */

import axios, { type AxiosResponse } from 'axios';
import type {
  KickoffStageResponse,
  RegressionStageResponse,
  PostRegressionStageResponse,
  RetryTaskResponse,
  BuildUploadResponse,
  ListBuildArtifactsResponse,
  TestManagementStatusResponse,
  ProjectManagementStatusResponse,
  CherryPickStatusResponse,
  ApproveRegressionStageRequest,
  ApproveRegressionStageResponse,
  CompletePreReleaseResponse,
  ActivityLogsResponse,
  GetReleaseDetailsResponse,
  GetBuildsResponse,
  NotificationsResponse,
  NotificationRequest,
  SendNotificationResponse,
} from '~/types/release-process.types';
import { TaskStage, Platform, BuildUploadStage } from '~/types/release-process-enums';
import { mapBuildUploadStageToTaskStage } from '~/utils/build-upload-mapper';

/**
 * Determine the base URL for Release Process APIs
 * - If DELIVR_HYBRID_MODE=true → use DELIVR_MOCK_URL (mock server)
 * - Otherwise → use DELIVR_BACKEND_URL (real backend)
 */
function getReleaseProcessBaseURL(): string {
  const isHybridMode = process.env.DELIVR_HYBRID_MODE === 'true';
  const mockURL = process.env.DELIVR_MOCK_URL || 'http://localhost:4000';
  const backendURL = process.env.DELIVR_BACKEND_URL || process.env.BACKEND_API_URL || 'http://localhost:3010';
  
  if (isHybridMode) {
    console.log('[ReleaseProcessService] Using mock server:', mockURL);
    return mockURL;
  }
  
  return backendURL;
}

class ReleaseProcess {
  private __client = axios.create({
    baseURL: getReleaseProcessBaseURL(),
    timeout: 30000,
  });

  // ======================
  // Stage APIs
  // ======================

  /**
   * Get stage tasks - Matches backend contract API #2
   * Single endpoint with stage query parameter
   */
  async getStageTasks(tenantId: string, releaseId: string, stage: TaskStage) {
    return this.__client.get<null, AxiosResponse<KickoffStageResponse | RegressionStageResponse | PostRegressionStageResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/tasks`,
      { params: { stage } }
    );
  }

  /**
   * Get kickoff stage data - Convenience method
   */
  async getKickoffStage(tenantId: string, releaseId: string) {
    return this.getStageTasks(tenantId, releaseId, TaskStage.KICKOFF) as Promise<AxiosResponse<KickoffStageResponse>>;
  }

  /**
   * Get regression stage data - Convenience method
   */
  async getRegressionStage(tenantId: string, releaseId: string) {
    return this.getStageTasks(tenantId, releaseId, TaskStage.REGRESSION) as Promise<AxiosResponse<RegressionStageResponse>>;
  }

  /**
   * Get post-regression stage data - Convenience method
   */
  async getPostRegressionStage(tenantId: string, releaseId: string) {
    return this.getStageTasks(tenantId, releaseId, TaskStage.POST_REGRESSION) as Promise<AxiosResponse<PostRegressionStageResponse>>;
  }

  // ======================
  // Task APIs
  // ======================

  /**
   * Retry a failed task - Matches backend contract API #8
   */
  async retryTask(tenantId: string, releaseId: string, taskId: string) {
    return this.__client.post<null, AxiosResponse<RetryTaskResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/tasks/${taskId}/retry`
    );
  }

  // ======================
  // Build APIs
  // ======================

  /**
   * Upload manual build - Matches backend contract
   * POST /tenants/:tenantId/releases/:releaseId/stages/:stage/builds/:platform
   * 
   * Maps BuildUploadStage to TaskStage and uses backend route structure
   */
  async uploadBuild(
    tenantId: string,
    releaseId: string,
    file: Blob,
    platform: Platform,
    stage: BuildUploadStage,
    filename?: string
  ) {
    // Map BuildUploadStage to TaskStage for backend
    const backendStage = mapBuildUploadStageToTaskStage(stage);
    
    const formData = new FormData();
    
    // Append blob directly - Node.js FormData accepts Blob
    // If filename is provided, include it (some backends require filename for proper file handling)
    if (filename) {
      formData.append('artifact', file, filename); // Backend expects 'artifact' field
    } else {
      formData.append('artifact', file);
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f9402839-8b19-4c73-b767-d6dcf38aa8d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReleaseProcess/index.ts:127',message:'FormData created before axios request',data:{formDataKeys:Array.from(formData.keys()),fileSize:file.size,fileType:file.type,filename},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    console.log('[ReleaseProcessService.uploadBuild]', {
      tenantId,
      releaseId,
      backendStage,
      platform,
      filename,
      fileSize: file.size,
      fileType: file.type,
      formDataKeys: Array.from(formData.keys()),
    });

    // Note: Don't set Content-Type header manually - axios will set it automatically
    // with the correct boundary for multipart/form-data
        // API contract specifies PUT for upload
        return this.__client.put<FormData, AxiosResponse<BuildUploadResponse>>(
          `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/${backendStage}/builds/${platform}`,
          formData
        );
  }

  /**
   * Delete uploaded build
   */
  async deleteBuild(tenantId: string, releaseId: string, buildId: string) {
    return this.__client.delete<null, AxiosResponse<{ success: boolean; message: string }>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/builds/${buildId}`
    );
  }

  // ======================
  // Status Check APIs
  // ======================

  /**
   * Get test management status - Matches backend contract API #17
   */
  async getTestManagementStatus(tenantId: string, releaseId: string, platform?: Platform) {
    const params = platform ? { platform } : {};
    return this.__client.get<null, AxiosResponse<TestManagementStatusResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/test-management-run-status`,
      { params }
    );
  }

  /**
   * Get project management status - Matches backend contract API #18
   */
  async getProjectManagementStatus(tenantId: string, releaseId: string, platform?: Platform) {
    const params = platform ? { platform } : {};
    return this.__client.get<null, AxiosResponse<ProjectManagementStatusResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/project-management-run-status`,
      { params }
    );
  }

  /**
   * Get cherry pick status - Matches backend contract API #19
   */
  async getCherryPickStatus(tenantId: string, releaseId: string) {
    return this.__client.get<null, AxiosResponse<CherryPickStatusResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/check-cherry-pick-status`
    );
  }

  // ======================
  // Approval APIs
  // ======================

  /**
   * Approve regression stage - Matches backend contract API #10
   */
  async approveRegressionStage(tenantId: string, releaseId: string, request: ApproveRegressionStageRequest) {
    return this.__client.post<ApproveRegressionStageRequest, AxiosResponse<ApproveRegressionStageResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/regression/approve`,
      request
    );
  }

  /**
   * Complete post-regression stage - Matches backend contract API #12
   */
  async completePostRegressionStage(tenantId: string, releaseId: string) {
    return this.__client.post<null, AxiosResponse<CompletePreReleaseResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/post-regression/complete`
    );
  }

  // ======================
  // Notification APIs
  // ======================

  /**
   * Get release notifications - Matches backend contract API #20
   */
  async getNotifications(tenantId: string, releaseId: string) {
    return this.__client.get<null, AxiosResponse<NotificationsResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/notifications`
    );
  }

  /**
   * Send release notification - Matches backend contract API #21
   */
  async sendNotification(tenantId: string, releaseId: string, request: NotificationRequest) {
    return this.__client.post<NotificationRequest, AxiosResponse<SendNotificationResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/notify`,
      request
    );
  }

  // ======================
  // Activity Log API
  // ======================

  /**
   * Get activity logs - Matches backend contract API #23
   */
  async getActivityLogs(tenantId: string, releaseId: string) {
    return this.__client.get<null, AxiosResponse<ActivityLogsResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/activity-logs`
    );
  }

  // ======================
  // Release Details API
  // ======================

  /**
   * Get release details - Matches backend contract API #1
   */
  async getReleaseDetails(tenantId: string, releaseId: string) {
    return this.__client.get<null, AxiosResponse<GetReleaseDetailsResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}`
    );
  }

  // ======================
  // Builds API
  // ======================

  /**
   * List build artifacts - Matches backend contract
   * GET /tenants/:tenantId/releases/:releaseId/builds/artifacts
   */
  async listBuildArtifacts(
    tenantId: string,
    releaseId: string,
    filters?: { platform?: Platform; buildStage?: string }
  ) {
    const params: Record<string, string> = {};
    if (filters?.platform) params.platform = filters.platform;
    if (filters?.buildStage) params.buildStage = filters.buildStage;

    return this.__client.get<null, AxiosResponse<ListBuildArtifactsResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/builds/artifacts`,
      { params }
    );
  }

  /**
   * Delete build artifact - Matches backend contract
   * DELETE /tenants/:tenantId/releases/:releaseId/builds/artifacts/:uploadId
   */
  async deleteBuildArtifact(tenantId: string, releaseId: string, uploadId: string) {
    return this.__client.delete<null, AxiosResponse<{ success: boolean; message: string }>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/builds/artifacts/${uploadId}`
    );
  }

  /**
   * Verify TestFlight build - Matches backend contract
   * POST /tenants/:tenantId/releases/:releaseId/stages/:stage/builds/ios/verify-testflight
   */
  async verifyTestFlight(
    tenantId: string,
    releaseId: string,
    stage: BuildUploadStage,
    request: { testflightBuildNumber: string; versionName: string }
  ) {
    // Map BuildUploadStage to TaskStage for backend
    const backendStage = mapBuildUploadStageToTaskStage(stage);
    
    return this.__client.post<
      { testflightBuildNumber: string; versionName: string },
      AxiosResponse<BuildUploadResponse>
    >(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/stages/${backendStage}/builds/ios/verify-testflight`,
      request
    );
  }

  /**
   * Get all builds - Matches backend contract API #14
   */
  async getAllBuilds(
    tenantId: string,
    releaseId: string,
    filters?: { stage?: 'KICK_OFF' | 'REGRESSION' | 'PRE_RELEASE'; platform?: Platform; status?: 'PENDING' | 'UPLOADED' | 'FAILED' }
  ) {
    const params = filters || {};
    return this.__client.get<null, AxiosResponse<GetBuildsResponse>>(
      `/api/v1/tenants/${tenantId}/releases/${releaseId}/builds`,
      { params }
    );
  }
}

export const ReleaseProcessService = new ReleaseProcess();


