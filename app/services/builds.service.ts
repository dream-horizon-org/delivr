/**
 * Client Service: Builds Management (Pre-Release Stage)
 * Calls Remix API routes (not backend directly)
 * Used by React components, loaders, and actions
 */

import type {
  Build,
  BuildsResponse,
  UploadAABResponse,
  VerifyTestFlightRequest,
  VerifyTestFlightResponse,
} from '~/types/distribution.types';
import { BuildUploadStatus, Platform } from '~/types/distribution.types';
import type { ApiResponse } from '~/utils/api-client';
import { apiGet, apiPost } from '~/utils/api-client';

type ProgressEvent = {
  loaded: number;
  total: number;
};

export class BuildsService {
  /**
   * Get all builds for a release
   */
  static async getBuilds(
    releaseId: string,
    platform?: Platform
  ): Promise<ApiResponse<BuildsResponse>> {
    const params = platform ? `?platform=${platform}` : '';
    return apiGet<BuildsResponse>(`/api/v1/releases/${releaseId}/builds${params}`);
  }

  /**
   * Upload Android AAB (manual mode)
   */
  static async uploadAAB(
    releaseId: string,
    file: File,
    onUploadProgress?: (progressEvent: ProgressEvent) => void
  ): Promise<ApiResponse<UploadAABResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', Platform.ANDROID);

    // Note: For file uploads, we use fetch directly instead of apiClient
    // to support upload progress tracking
    const response = await fetch(`/api/v1/releases/${releaseId}/builds/upload-aab`, {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header - browser will set it with boundary
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? 'Failed to upload AAB');
    }

    const result = await response.json() as ApiResponse<UploadAABResponse>;
    return result;
  }

  /**
   * Verify iOS TestFlight build
   */
  static async verifyTestFlight(
    releaseId: string,
    request: VerifyTestFlightRequest
  ): Promise<ApiResponse<VerifyTestFlightResponse>> {
    return apiPost<VerifyTestFlightResponse>(
      `/api/v1/releases/${releaseId}/builds/verify-testflight`,
      request
    );
  }

  /**
   * Check if all builds are ready for distribution
   */
  static async areBuildsReady(
    releaseId: string,
    platforms: Platform[]
  ): Promise<{ ready: boolean; missingPlatforms: Platform[] }> {
    const response = await this.getBuilds(releaseId);
    const builds = response.data?.data?.builds ?? [];
    const missingPlatforms: Platform[] = [];

    for (const platform of platforms) {
      const build = builds.find((b: Build) => b.platform === platform);
      
      // Type-safe check for TestFlight PROCESSED status
      type BuildWithStatus = Build & { buildStatus?: string };
      const buildWithStatus = build as BuildWithStatus | undefined;
      
      if (
        !build ||
        build.buildUploadStatus !== BuildUploadStatus.UPLOADED ||
        (platform === Platform.IOS && buildWithStatus?.buildStatus !== 'PROCESSED')
      ) {
        missingPlatforms.push(platform);
      }
    }

    return {
      ready: missingPlatforms.length === 0,
      missingPlatforms,
    };
  }

  /**
   * Get build for a specific platform
   */
  static getBuildForPlatform(
    builds: Build[],
    platform: Platform
  ): Build | undefined {
    return builds.find((build) => build.platform === platform);
  }
}
