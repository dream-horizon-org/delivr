/**
 * Client Service: Distribution & Submission Management
 * Calls Remix API routes (not backend directly)
 * Used by React components, loaders, and actions
 */

import { apiGet, apiPost } from '~/utils/api-client';
import type {
  SubmitToStoresRequest,
  SubmitToStoresResponse,
  DistributionStatusResponse,
  GetSubmissionsResponse,
  GetSubmissionDetailsResponse,
  PollSubmissionStatusResponse,
  RetrySubmissionRequest,
  RetrySubmissionResponse,
  SubmissionStatus,
  ReleaseStatus,
} from '~/types/distribution.types';

export class DistributionService {
  /**
   * Submit release builds to stores (main entry point)
   */
  static async submitToStores(
    releaseId: string,
    request: SubmitToStoresRequest
  ): Promise<SubmitToStoresResponse> {
    return apiPost<SubmitToStoresResponse>(
      `/api/v1/releases/${releaseId}/distribute`,
      request
    );
  }

  /**
   * Get distribution status for a release
   */
  static async getDistributionStatus(
    releaseId: string
  ): Promise<DistributionStatusResponse> {
    return apiGet<DistributionStatusResponse>(
      `/api/v1/releases/${releaseId}/distribute`
    );
  }

  /**
   * Get all submissions for a release
   */
  static async getSubmissions(releaseId: string): Promise<GetSubmissionsResponse> {
    return apiGet<GetSubmissionsResponse>(
      `/api/v1/releases/${releaseId}/submissions`
    );
  }

  /**
   * Get single submission details
   */
  static async getSubmission(
    submissionId: string
  ): Promise<GetSubmissionDetailsResponse> {
    return apiGet<GetSubmissionDetailsResponse>(
      `/api/v1/submissions/${submissionId}`
    );
  }

  /**
   * Poll submission status (lightweight)
   */
  static async pollSubmissionStatus(
    submissionId: string
  ): Promise<PollSubmissionStatusResponse> {
    return apiGet<PollSubmissionStatusResponse>(
      `/api/v1/submissions/${submissionId}/status`
    );
  }

  /**
   * Retry a failed submission
   */
  static async retrySubmission(
    submissionId: string,
    request?: RetrySubmissionRequest
  ): Promise<RetrySubmissionResponse> {
    return apiPost<RetrySubmissionResponse>(
      `/api/v1/submissions/${submissionId}`,
      request
    );
  }

  /**
   * Check if release is complete (all platforms at 100%)
   */
  static isReleaseComplete(
    distributionStatus: DistributionStatusResponse
  ): boolean {
    if (!distributionStatus.data?.platforms) {
      return false;
    }
    
    const platformStatuses = Object.values(distributionStatus.data.platforms);
    return platformStatuses.every(
      (p) =>
        p?.submitted &&
        p.status === SubmissionStatus.RELEASED &&
        p.exposurePercent >= 100
    );
  }

  /**
   * Get failed submissions
   */
  static getFailedSubmissions(
    submissions: GetSubmissionDetailsResponse['data']['submissions']
  ): GetSubmissionDetailsResponse['data']['submissions'] {
    return submissions.filter(
      (sub) => sub.submissionStatus === SubmissionStatus.REJECTED
    );
  }

  /**
   * Get overall progress percentage
   */
  static getOverallProgress(
    distributionStatus: DistributionStatusResponse
  ): number {
    if (!distributionStatus.data?.platforms) {
      return 0;
    }
    
    const platformStatuses = Object.values(distributionStatus.data.platforms);
    if (platformStatuses.length === 0) {
      return 0;
    }

    const totalProgress = platformStatuses.reduce((sum, p) => {
      if (!p?.submitted) return sum;
      if (p.status === SubmissionStatus.LIVE && p.exposurePercent === 100) return sum + 100;
      if (p.status === SubmissionStatus.LIVE || p.status === SubmissionStatus.APPROVED)
        return sum + p.exposurePercent;
      if (p.status === SubmissionStatus.IN_REVIEW) return sum + 10; // Arbitrary small progress
      return sum;
    }, 0);

    return Math.min(100, totalProgress / platformStatuses.length);
  }
}
