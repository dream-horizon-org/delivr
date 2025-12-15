/**
 * Rollout Module Backend Service
 * Handles rollout management for submissions
 */

import axios, { type AxiosResponse } from 'axios';
import { getBackendBaseURL } from '~/.server/utils/base-url.utils';
import type {
  HaltRolloutRequest,
  PauseRolloutRequest,
  RolloutUpdateResponse,
  Submission,
  UpdateRolloutRequest,
} from '~/types/distribution.types';
import { Platform } from '~/types/distribution.types';
import type { ApiResponse } from '~/utils/api-client';

class Rollout {
  private __client = axios.create({
    baseURL: getBackendBaseURL('/api/v1/submissions'),
    timeout: 10000,
  });

  /**
   * Update rollout percentage for a submission
   */
  async updateRollout(submissionId: string, request: UpdateRolloutRequest, platform: Platform): Promise<ApiResponse<RolloutUpdateResponse>> {
    const response = await this.__client.patch<UpdateRolloutRequest, AxiosResponse<ApiResponse<RolloutUpdateResponse>>>(
      `/api/v1/submissions/${submissionId}/rollout?platform=${platform}`,
      request
    );
    return response.data;
  }

  /**
   * Pause rollout (iOS only)
   */
  async pauseRollout(submissionId: string, request?: PauseRolloutRequest, platform: Platform = Platform.IOS): Promise<ApiResponse<Submission>> {
    const response = await this.__client.patch<PauseRolloutRequest | undefined, AxiosResponse<ApiResponse<Submission>>>(
      `/api/v1/submissions/${submissionId}/rollout/pause?platform=${platform}`,
      request
    );
    return response.data;
  }

  /**
   * Resume paused rollout (iOS only)
   */
  async resumeRollout(submissionId: string, platform: Platform = Platform.IOS): Promise<ApiResponse<Submission>> {
    const response = await this.__client.patch<null, AxiosResponse<ApiResponse<Submission>>>(
      `/api/v1/submissions/${submissionId}/rollout/resume?platform=${platform}`,
      null
    );
    return response.data;
  }

  /**
   * Emergency halt - stops rollout immediately
   */
  async haltRollout(submissionId: string, request: HaltRolloutRequest, platform: Platform): Promise<ApiResponse<Submission>> {
    const response = await this.__client.patch<HaltRolloutRequest, AxiosResponse<ApiResponse<Submission>>>(
      `/api/v1/submissions/${submissionId}/rollout/halt?platform=${platform}`,
      request
    );
    return response.data;
  }

  /**
   * Check if rollout can be increased
   */
  canIncreaseRollout(submission: Submission): boolean {
    return (
      submission.submissionStatus === 'LIVE' &&
      submission.rolloutPercent < 100
    );
  }
}

export default new Rollout();

