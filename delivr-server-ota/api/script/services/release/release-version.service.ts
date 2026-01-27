/**
 * Release Version Service
 * Handles version operations: validation, latest version lookup, next version suggestions
 */

import type { ReleasePlatformTargetMappingRepository } from '~models/release/release-platform-target-mapping.repository';
import type {
  ReleaseType,
  VersionValidationResult,
  NextVersionsResult,
  Platform,
  Target
} from '~types/release';
import { bumpVersion } from '~services/release-schedules/utils';
import { isVersionValidForReleaseType } from './utils/release-version.utils';

/**
 * Release Version Service
 * Encapsulates version-related operations for releases
 */
export class ReleaseVersionService {
  constructor(
    private readonly platformTargetMappingRepo: ReleasePlatformTargetMappingRepository
  ) {}

  /**
   * Get the latest version for a tenant + platform + target combination
   * Excludes ARCHIVED releases
   * 
   * @param appId - app id
   * @param platform - Platform (ANDROID, IOS, WEB)
   * @param target - Target (WEB, PLAY_STORE, APP_STORE)
   * @returns Latest version string, or null if no releases exist
   */
  getLatestVersion = async (
    appId: string,
    platform: Platform,
    target: Target
  ): Promise<string | null> => {
    return this.platformTargetMappingRepo.getLatestVersionForTenant(
      appId,
      platform,
      target
    );
  };

  /**
   * Validate a user-provided version for a manual release
   * 
   * @param appId - app id
   * @param platform - Platform
   * @param target - Target
   * @param version - User-provided version to validate
   * @param releaseType - Type of release (MAJOR, MINOR, HOTFIX)
   * @returns Validation result with valid flag and optional error message
   */
  validateVersion = async (
    appId: string,
    platform: Platform,
    target: Target,
    version: string,
    releaseType: ReleaseType
  ): Promise<VersionValidationResult> => {
    const latestVersion = await this.getLatestVersion(appId, platform, target);
    return isVersionValidForReleaseType(version, latestVersion, releaseType);
  };

  /**
   * Get suggested next versions for all release types
   * Used by future API to show available version options
   * 
   * @param appId - app id
   * @param platform - Platform
   * @param target - Target
   * @returns Current version and suggested next versions for MAJOR, MINOR, HOTFIX
   */
  getNextVersions = async (
    appId: string,
    platform: Platform,
    target: Target
  ): Promise<NextVersionsResult> => {
    const latestVersion = await this.getLatestVersion(appId, platform, target);
    
    // No previous version - can't suggest next versions
    const noPreviousVersion = latestVersion === null;
    if (noPreviousVersion) {
      return {
        currentVersion: null,
        nextVersions: null
      };
    }
    
    return {
      currentVersion: latestVersion,
      nextVersions: {
        MAJOR: bumpVersion(latestVersion, 'MAJOR'),
        MINOR: bumpVersion(latestVersion, 'MINOR'),
        HOTFIX: bumpVersion(latestVersion, 'HOTFIX')
      }
    };
  };
}

