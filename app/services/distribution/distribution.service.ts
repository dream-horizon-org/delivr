/**
 * Client Service: Distribution & Submission Management
 * Calls Remix API routes (not backend directly)
 * Used by React components, loaders, and actions
 */

import { ROLLOUT_COMPLETE_PERCENT } from '~/constants/distribution/distribution.constants';
import type {
    DistributionStatusResponse,
    DistributionsResponse,
    Submission,
    SubmissionsResponse,
    SubmitToStoreRequest,
    SubmitToStoreResponse,
} from '~/types/distribution/distribution.types';
import { SubmissionStatus } from '~/types/distribution/distribution.types';
import type { ApiResponse } from '~/utils/api-client';
import { apiGet, apiPost } from '~/utils/api-client';

export class DistributionService {
  /**
   * List all distributions (paginated)
   * Returns distributions with their submissions
   * 
   * @param tenantId - Tenant/Organization ID (required)
   * @param page - Page number (1-indexed)
   * @param pageSize - Number of items per page
   */
  static async listDistributions(
    tenantId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<ApiResponse<DistributionsResponse>> {
    return apiGet<DistributionsResponse>(
      `/api/v1/distributions?tenantId=${encodeURIComponent(tenantId)}&page=${page}&pageSize=${pageSize}`
    );
  }

  /**
   * Submit release builds to stores (main entry point)
   */
  static async submitToStores(
    releaseId: string,
    request: SubmitToStoreRequest
  ): Promise<ApiResponse<SubmitToStoreResponse>> {
    return apiPost<SubmitToStoreResponse>(
      `/api/v1/releases/${releaseId}/distribute`,
      request
    );
  }

  /**
   * Get distribution status for a release
   */
  static async getDistributionStatus(
    releaseId: string
  ): Promise<ApiResponse<DistributionStatusResponse>> {
    return apiGet<DistributionStatusResponse>(
      `/api/v1/releases/${releaseId}/distribute`
    );
  }

  /**
   * Get all submissions for a release
   */
  static async getSubmissions(
    releaseId: string
  ): Promise<ApiResponse<SubmissionsResponse>> {
    return apiGet<SubmissionsResponse>(
      `/api/v1/releases/${releaseId}/submissions`
    );
  }

  /**
   * Get single submission details
   */
  static async getSubmission(
    submissionId: string
  ): Promise<ApiResponse<Submission>> {
    return apiGet<Submission>(
      `/api/v1/submissions/${submissionId}`
    );
  }

  /**
   * Poll submission status (lightweight)
   */
  static async pollSubmissionStatus(
    submissionId: string
  ): Promise<ApiResponse<Submission>> {
    return apiGet<Submission>(
      `/api/v1/submissions/${submissionId}/status`
    );
  }


  /**
   * Check if release is complete (all platforms at 100%)
   */
  static isReleaseComplete(
    distributionStatus: DistributionStatusResponse
  ): boolean {
    const statusData = distributionStatus.data;
    if (!statusData?.platforms) {
      return false;
    }
    
    const platformStatuses = Object.values(statusData.platforms);
    return platformStatuses.every(
      (p) =>
        p?.submitted &&
        p.status === SubmissionStatus.LIVE &&
        p.rolloutPercentage >= 100
    );
  }

  /**
   * Get failed submissions
   */
  static getFailedSubmissions(
    submissions: Submission[]
  ): Submission[] {
    return submissions.filter(
      (sub) => sub.status === SubmissionStatus.REJECTED
    );
  }

  /**
   * Get overall progress percentage
   */
  static getOverallProgress(
    distributionStatus: DistributionStatusResponse
  ): number {
    const statusData = distributionStatus.data;
    if (!statusData?.platforms) {
      return 0;
    }
    
    const platformStatuses = Object.values(statusData.platforms);
    if (platformStatuses.length === 0) {
      return 0;
    }

    const totalProgress = platformStatuses.reduce((sum: number, p) => {
      if (!p?.submitted) return sum;
      if (p.status === SubmissionStatus.LIVE && p.rolloutPercentage === ROLLOUT_COMPLETE_PERCENT) return sum + ROLLOUT_COMPLETE_PERCENT;
      if (p.status === SubmissionStatus.LIVE || p.status === SubmissionStatus.APPROVED)
        return sum + p.rolloutPercentage;
      if (p.status === SubmissionStatus.IN_REVIEW) return sum + 10; // Arbitrary small progress
      return sum;
    }, 0);

    return Math.min(100, totalProgress / platformStatuses.length);
  }
}
