/**
 * Client Service: Release Management
 * Calls Remix API routes (not backend directly)
 * Used by React components, loaders, and actions
 */

import type { Release } from '~/types/distribution.types';
import { DistributionStatus } from '~/types/distribution.types';
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
  status: DistributionStatus;
};

type UpdateReleaseStatusResponse = {
  releaseId: string;
  status: DistributionStatus;
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
  static isInPreRelease(status: DistributionStatus): boolean {
    return status === DistributionStatus.PRE_RELEASE;
  }

  /**
   * Check if release is ready for submission
   */
  static isReadyForSubmission(status: DistributionStatus): boolean {
    return status === DistributionStatus.READY_FOR_SUBMISSION;
  }

  /**
   * Check if release is completed
   */
  static isCompleted(status: DistributionStatus): boolean {
    return status === DistributionStatus.COMPLETED;
  }

  /**
   * Get human-readable release status
   */
  static getStatusLabel(status: DistributionStatus): string {
    const labels: Record<DistributionStatus, string> = {
      [DistributionStatus.PRE_RELEASE]: 'Pre-Release',
      [DistributionStatus.READY_FOR_SUBMISSION]: 'Ready to Submit',
      [DistributionStatus.COMPLETED]: 'Completed',
    };
    return labels[status] || status;
  }

  /**
   * Get status color for UI
   */
  static getStatusColor(status: DistributionStatus): string {
    const colors: Record<DistributionStatus, string> = {
      [DistributionStatus.PRE_RELEASE]: 'gray',
      [DistributionStatus.READY_FOR_SUBMISSION]: 'cyan',
      [DistributionStatus.COMPLETED]: 'green',
    };
    return colors[status] || 'gray';
  }
}
