/**
 * Client Service: Builds Management (Pre-Release Stage)
 * Calls Remix API routes (not backend directly)
 * Used by React components, loaders, and actions
 */

import { apiGet, apiPost } from '~/utils/api-client';
import type {
  BuildsResponse,
  UploadAABResponse,
  VerifyTestFlightRequest,
  VerifyTestFlightResponse,
  Platform,
  BuildUploadStatus,
  Build,
} from '~/types/distribution.types';

export class BuildsService {
  /**
   * Get all builds for a release
   */
  static async getBuilds(
    releaseId: string,
    platform?: Platform
  ): Promise<BuildsResponse> {
    const params = platform ? `?platform=${platform}` : '';
    return apiGet<BuildsResponse>(`/api/v1/releases/${releaseId}/builds${params}`);
  }

  /**
   * Upload Android AAB (manual mode)
   */
  static async uploadAAB(
    releaseId: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<UploadAABResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', 'ANDROID');

    // Note: For file uploads, we use fetch directly instead of apiClient
    // to support upload progress tracking
    const response = await fetch(`/api/v1/releases/${releaseId}/builds/upload-aab`, {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header - browser will set it with boundary
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload AAB');
    }

    return response.json();
  }

  /**
   * Verify iOS TestFlight build
   */
  static async verifyTestFlight(
    releaseId: string,
    request: VerifyTestFlightRequest
  ): Promise<VerifyTestFlightResponse> {
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
    const builds = response.data?.builds || [];
    const missingPlatforms: Platform[] = [];

    for (const platform of platforms) {
      const build = builds.find((b: Build) => b.platform === platform);
      if (
        !build ||
        build.buildUploadStatus !== BuildUploadStatus.UPLOADED ||
        (platform === Platform.IOS && build.buildStatus !== 'PROCESSED')
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
