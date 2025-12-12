/**
 * Client Service: Rollout Management
 * Calls Remix API routes (not backend directly)
 * Used by React components, loaders, and actions
 */

import { ROLLOUT_PRESETS } from '~/constants/distribution.constants';
import type {
    HaltRolloutRequest,
    PauseRolloutRequest,
    UpdateRolloutRequest,
} from '~/types/distribution.types';
import { Platform, SubmissionStatus } from '~/types/distribution.types';
import { apiGet, apiPatch, apiPost } from '~/utils/api-client';

export class RolloutService {
  /**
   * Update rollout percentage
   */
  static async updateRollout(
    submissionId: string,
    request: UpdateRolloutRequest
  ): Promise<any> {
    return apiPatch<any>(
      `/api/v1/submissions/${submissionId}/rollout`,
      request
    );
  }

  /**
   * Pause rollout
   */
  static async pauseRollout(
    submissionId: string,
    request: PauseRolloutRequest
  ): Promise<any> {
    return apiPost<any>(
      `/api/v1/submissions/${submissionId}/rollout/pause`,
      request
    );
  }

  /**
   * Resume rollout
   */
  static async resumeRollout(submissionId: string): Promise<any> {
    return apiPost<any>(
      `/api/v1/submissions/${submissionId}/rollout/resume`
    );
  }

  /**
   * Emergency halt rollout
   */
  static async haltRollout(
    submissionId: string,
    request: HaltRolloutRequest
  ): Promise<any> {
    return apiPost<any>(
      `/api/v1/submissions/${submissionId}/rollout/halt`,
      request
    );
  }

  /**
   * Get submission history
   */
  static async getSubmissionHistory(
    submissionId: string,
    limit?: number,
    offset?: number
  ): Promise<any> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';

    return apiGet<any>(
      `/api/v1/submissions/${submissionId}/history${queryString}`
    );
  }

  /**
   * Get suggested next rollout percentage
   */
  static getSuggestedNextPercentage(currentPercentage: number): number | null {
    for (const preset of ROLLOUT_PRESETS) {
      if (preset > currentPercentage) {
        return preset;
      }
    }
    return null; // Already at 100% or no higher preset
  }

  /**
   * Increment rollout to next preset
   */
  static async incrementRollout(
    submissionId: string,
    currentPercentage: number
  ): Promise<any | null> {
    const nextPercentage = this.getSuggestedNextPercentage(currentPercentage);
    if (nextPercentage) {
      return this.updateRollout(submissionId, { submissionId, exposurePercent: nextPercentage });
    }
    return null;
  }

  /**
   * Complete rollout (set to 100%)
   */
  static async completeRollout(submissionId: string): Promise<any> {
    return this.updateRollout(submissionId, { submissionId, exposurePercent: 100 });
  }

  /**
   * Check if rollout can be increased
   */
  static canIncreaseRollout(
    submission: any
  ): boolean {
    return (
      submission.platform === Platform.ANDROID && // Only Android supports manual rollout
      (submission.submissionStatus === SubmissionStatus.LIVE || 
       submission.submissionStatus === SubmissionStatus.APPROVED) &&
      submission.exposurePercent < 100
    );
  }

  /**
   * Validate rollout percentage
   */
  static validateRolloutPercentage(
    currentPercentage: number,
    requestedPercentage: number
  ): boolean {
    return (
      requestedPercentage > currentPercentage &&
      requestedPercentage <= 100 &&
      requestedPercentage >= 0
    );
  }
}
