/**
 * Client Service: Distribution & Submission Management
 * Calls Remix API routes (not backend directly)
 * Used by React components, loaders, and actions
 */

import type {
  DistributionStatusResponse,
  RetrySubmissionRequest,
  SubmitToStoreRequest
} from '~/types/distribution.types';
import { SubmissionStatus } from '~/types/distribution.types';
import { apiGet, apiPost } from '~/utils/api-client';

export class DistributionService {
  /**
   * Submit release builds to stores (main entry point)
   */
  static async submitToStores(
    releaseId: string,
    request: SubmitToStoreRequest
  ): Promise<any> {
    return apiPost<any>(
      `/api/v1/releases/${releaseId}/distribute`,
      request
    );
  }

  /**
   * Get distribution status for a release
   */
  static async getDistributionStatus(
    releaseId: string
  ): Promise<any> {
    return apiGet<any>(
      `/api/v1/releases/${releaseId}/distribute`
    );
  }

  /**
   * Get all submissions for a release
   */
  static async getSubmissions(releaseId: string): Promise<any> {
    return apiGet<any>(
      `/api/v1/releases/${releaseId}/submissions`
    );
  }

  /**
   * Get single submission details
   */
  static async getSubmission(
    submissionId: string
  ): Promise<any> {
    return apiGet<any>(
      `/api/v1/submissions/${submissionId}`
    );
  }

  /**
   * Poll submission status (lightweight)
   */
  static async pollSubmissionStatus(
    submissionId: string
  ): Promise<any> {
    return apiGet<any>(
      `/api/v1/submissions/${submissionId}/status`
    );
  }

  /**
   * Retry a failed submission
   */
  static async retrySubmission(
    submissionId: string,
    request?: RetrySubmissionRequest
  ): Promise<any> {
    return apiPost<any>(
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
        p.status === SubmissionStatus.LIVE &&
        p.exposurePercent >= 100
    );
  }

  /**
   * Get failed submissions
   */
  static getFailedSubmissions(
    submissions: any[]
  ): any[] {
    return submissions.filter(
      (sub: any) => sub.submissionStatus === SubmissionStatus.REJECTED
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
