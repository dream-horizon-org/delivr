/**
 * Client Service: Release Management
 * Calls Remix API routes (not backend directly)
 * Used by React components, loaders, and actions
 */

import type { Release } from '~/types/distribution.types';
import { ReleaseStatus } from '~/types/distribution.types';
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
  status: ReleaseStatus;
};

type UpdateReleaseStatusResponse = {
  releaseId: string;
  status: ReleaseStatus;
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
  static isInPreRelease(status: ReleaseStatus): boolean {
    return status === ReleaseStatus.PRE_RELEASE;
  }

  /**
   * Check if release is ready for submission
   */
  static isReadyForSubmission(status: ReleaseStatus): boolean {
    return status === ReleaseStatus.READY_FOR_SUBMISSION;
  }

  /**
   * Check if release is completed
   */
  static isCompleted(status: ReleaseStatus): boolean {
    return status === ReleaseStatus.COMPLETED;
  }

  /**
   * Get human-readable release status
   */
  static getStatusLabel(status: ReleaseStatus): string {
    const labels: Record<ReleaseStatus, string> = {
      [ReleaseStatus.PRE_RELEASE]: 'Pre-Release',
      [ReleaseStatus.READY_FOR_SUBMISSION]: 'Ready to Submit',
      [ReleaseStatus.COMPLETED]: 'Completed',
    };
    return labels[status] || status;
  }

  /**
   * Get status color for UI
   */
  static getStatusColor(status: ReleaseStatus): string {
    const colors: Record<ReleaseStatus, string> = {
      [ReleaseStatus.PRE_RELEASE]: 'gray',
      [ReleaseStatus.READY_FOR_SUBMISSION]: 'cyan',
      [ReleaseStatus.COMPLETED]: 'green',
    };
    return colors[status] || 'gray';
  }
}
