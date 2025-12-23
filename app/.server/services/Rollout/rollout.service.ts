/**
 * Rollout Module Backend Service
 * Handles rollout management for submissions
 */

import axios, { type AxiosResponse } from 'axios';
import { getBackendBaseURL } from '~/.server/utils/base-url.utils';
import { ROLLOUT_COMPLETE_PERCENT } from '~/constants/distribution/distribution.constants';
import type {
  PauseRolloutRequest,
  RolloutUpdateResponse,
  Submission,
  UpdateRolloutRequest
} from '~/types/distribution/distribution.types';
import { Platform, SubmissionStatus } from '~/types/distribution/distribution.types';
import type { ApiResponse } from '~/utils/api-client';

class Rollout {
  private __client = axios.create({
    // Don't set baseURL here - we'll determine it per-request in the interceptor
    timeout: 10000,
  });

  constructor() {
    // Add request interceptor to dynamically set base URL based on HYBRID_MODE
    this.__client.interceptors.request.use((config) => {
      const url = config.url || '';
      const baseURL = getBackendBaseURL(url); // Pass URL to check hybrid mode
      config.baseURL = baseURL;
      return config;
    });
  }

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
   * Check if rollout can be increased
   */
  canIncreaseRollout(submission: Submission): boolean {
    return (
      submission.status === SubmissionStatus.LIVE &&
      submission.rolloutPercentage < ROLLOUT_COMPLETE_PERCENT
    );
  }
}

export default new Rollout();

