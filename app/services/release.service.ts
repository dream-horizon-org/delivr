/**
 * Client Service: Release Management
 * Calls Remix API routes (not backend directly)
 * Used by React components, loaders, and actions
 */

import type { Release } from '~/types/distribution.types';
import { DistributionReleaseStatus } from '~/types/distribution.types';
import type { ApiResponse } from '~/utils/api-client';
import { apiGet, apiPatch } from '~/utils/api-client';

type ReleaseTimeline = {
  releaseId: string;
  events: Array<{
    timestamp: string;
    type: string;
    description: string;
    user: string;
  }>;
};

type UpdateReleaseStatusRequest = {
  status: DistributionReleaseStatus;
};

type UpdateReleaseStatusResponse = {
  releaseId: string;
  status: DistributionReleaseStatus;
  updatedAt: string;
};

export class ReleaseService {
  /**
   * Get release details
   */
  static async getRelease(releaseId: string): Promise<ApiResponse<Release>> {
    // Note: This endpoint might be in a different route format
    // Adjust based on your actual release API structure
    return apiGet<Release>(`/api/v1/releases/${releaseId}`);
  }

  /**
   * Update release status (used by orchestrator)
   */
  static async updateReleaseStatus(
    releaseId: string,
    request: UpdateReleaseStatusRequest
  ): Promise<ApiResponse<UpdateReleaseStatusResponse>> {
    return apiPatch<UpdateReleaseStatusResponse>(
      `/api/v1/releases/${releaseId}/status`,
      request
    );
  }

  /**
   * Get release timeline/events
   */
  static async getReleaseTimeline(
    releaseId: string
  ): Promise<ApiResponse<ReleaseTimeline>> {
    return apiGet<ReleaseTimeline>(
      `/api/v1/releases/${releaseId}/timeline`
    );
  }

  // Helper functions for release status checks

  /**
   * Check if release is in Pre-Release stage
   */
  static isInPreRelease(status: DistributionReleaseStatus): boolean {
    return status === DistributionReleaseStatus.PRE_RELEASE;
  }

  /**
   * Check if release is ready for submission
   */
  static isReadyForSubmission(status: DistributionReleaseStatus): boolean {
    return status === DistributionReleaseStatus.READY_FOR_SUBMISSION;
  }

  /**
   * Check if release is completed
   */
  static isCompleted(status: DistributionReleaseStatus): boolean {
    return status === DistributionReleaseStatus.COMPLETED;
  }

  /**
   * Get human-readable release status
   */
  static getStatusLabel(status: DistributionReleaseStatus): string {
    const labels: Record<DistributionReleaseStatus, string> = {
      [DistributionReleaseStatus.PRE_RELEASE]: 'Pre-Release',
      [DistributionReleaseStatus.READY_FOR_SUBMISSION]: 'Ready to Submit',
      [DistributionReleaseStatus.COMPLETED]: 'Completed',
    };
    return labels[status] || status;
  }

  /**
   * Get status color for UI
   */
  static getStatusColor(status: DistributionReleaseStatus): string {
    const colors: Record<DistributionReleaseStatus, string> = {
      [DistributionReleaseStatus.PRE_RELEASE]: 'gray',
      [DistributionReleaseStatus.READY_FOR_SUBMISSION]: 'cyan',
      [DistributionReleaseStatus.COMPLETED]: 'green',
    };
    return colors[status] || 'gray';
  }
}
