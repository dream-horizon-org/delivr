/**
 * Client Service: Rollout Management
 * Calls Remix API routes (not backend directly)
 * Used by React components, loaders, and actions
 */

import { ROLLOUT_PRESETS } from '~/constants/distribution.constants';
import type {
  HaltRolloutRequest,
  PauseRolloutRequest,
  RolloutUpdateResponse,
  Submission,
  UpdateRolloutRequest,
} from '~/types/distribution.types';
import { Platform, SubmissionStatus } from '~/types/distribution.types';
import type { ApiResponse } from '~/utils/api-client';
import { apiPatch, apiPost } from '~/utils/api-client';

export class RolloutService {
  /**
   * Update rollout percentage
   */
  static async updateRollout(
    submissionId: string,
    request: UpdateRolloutRequest,
    platform: Platform
  ): Promise<ApiResponse<RolloutUpdateResponse>> {
    return apiPatch<RolloutUpdateResponse>(
      `/api/v1/submissions/${submissionId}/rollout?platform=${platform}`,
      request
    );
  }

  /**
   * Pause rollout (iOS only)
   */
  static async pauseRollout(
    submissionId: string,
    request: PauseRolloutRequest,
    platform: Platform
  ): Promise<ApiResponse<Submission>> {
    return apiPost<Submission>(
      `/api/v1/submissions/${submissionId}/rollout/pause?platform=${platform}`,
      request
    );
  }

  /**
   * Resume rollout (iOS only)
   */
  static async resumeRollout(submissionId: string, platform: Platform): Promise<ApiResponse<Submission>> {
    return apiPost<Submission>(
      `/api/v1/submissions/${submissionId}/rollout/resume?platform=${platform}`
    );
  }

  /**
   * Emergency halt rollout
   */
  static async haltRollout(
    submissionId: string,
    request: HaltRolloutRequest,
    platform: Platform
  ): Promise<ApiResponse<Submission>> {
    return apiPost<Submission>(
      `/api/v1/submissions/${submissionId}/rollout/halt?platform=${platform}`,
      request
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
    currentPercentage: number,
    platform: Platform
  ): Promise<ApiResponse<RolloutUpdateResponse> | null> {
    const nextPercentage = this.getSuggestedNextPercentage(currentPercentage);
    if (nextPercentage) {
      return this.updateRollout(submissionId, { rolloutPercent: nextPercentage }, platform);
    }
    return null;
  }

  /**
   * Complete rollout (set to 100%)
   */
  static async completeRollout(submissionId: string, platform: Platform): Promise<ApiResponse<RolloutUpdateResponse>> {
    return this.updateRollout(submissionId, { rolloutPercent: 100 }, platform);
  }

  /**
   * Check if rollout can be increased
   */
  static canIncreaseRollout(
    submission: Submission
  ): boolean {
    return (
      submission.platform === Platform.ANDROID && // Only Android supports manual rollout
      (submission.submissionStatus === SubmissionStatus.LIVE || 
       submission.submissionStatus === SubmissionStatus.APPROVED) &&
      submission.rolloutPercent < 100
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
