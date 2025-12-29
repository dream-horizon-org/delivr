/**
 * Rollout Module Backend Service
 * Handles rollout management for submissions
 */

import axios, { type AxiosResponse } from 'axios';
import { getBackendBaseURL } from '~/.server/utils/base-url.utils';
import { getCurrentUser } from '~/.server/utils/request-context';
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
    // Add request interceptor to:
    // 1. Dynamically set base URL based on HYBRID_MODE
    // 2. Automatically inject authentication headers from request context
    this.__client.interceptors.request.use((config) => {
      // Set base URL
      const url = config.url || '';
      const baseURL = getBackendBaseURL(url);
      config.baseURL = baseURL;

      // Inject authentication headers from request context
      const user = getCurrentUser();
      
      if (user) {
        const authHeaders = this.buildAuthHeaders(user);
        Object.assign(config.headers, authHeaders);
      } else {
        console.warn('[Rollout Service] No user in request context! Request may fail.');
      }

      return config;
    });
  }

  /**
   * Build authentication headers for backend API calls
   * Uses ONLY Bearer token authentication (no fallback)
   * 
   * Token is automatically refreshed by authenticate.ts before API calls
   * If refresh fails, user is logged out
   */
  private buildAuthHeaders(user: { user: { id: string; idToken: string | null } }): Record<string, string> {
    const headers: Record<string, string> = {};
    const idToken = user?.user?.idToken;

    if (idToken !== null && idToken !== undefined) {
      headers['Authorization'] = `Bearer ${idToken}`;
    } else {
      console.error('[Rollout Service] ❌ No idToken available!', {
        hasUser: !!user,
        hasUserObj: !!user?.user,
        idToken: idToken,
      });
      console.error('[Rollout Service] This likely means:');
      console.error('  1. Old session without idToken - User needs to logout and login again');
      console.error('  2. Token refresh failed - Check token-refresh.ts logs');
    }
    return headers;
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

