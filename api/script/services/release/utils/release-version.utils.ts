/**
 * Release Version Validation Utilities
 * Validates user-provided versions for manual release creation
 */

import type { ReleaseType, VersionValidationResult } from '~types/release';
import { parseVersion, isValidVersion } from '~services/release-schedules/utils';
import { RELEASE_TYPE, RELEASE_VERSION_ERROR_MESSAGES } from '../release-version.constants';

/**
 * Validate that a version is valid for the given release type
 * 
 * Rules:
 * - If no previous version exists (latestVersion is null): any valid semver is OK
 * - MAJOR: version must have major > latest.major (e.g., 6.x.x → 7.0.0+)
 * - MINOR: version must have same major, minor > latest.minor (e.g., 6.8.x → 6.9.0+, but < 7.0.0)
 * - HOTFIX: version must have same major.minor, patch > latest.patch (e.g., 6.8.1 → 6.8.2+, but < 6.9.0)
 * 
 * @param version - Version to validate
 * @param latestVersion - Current latest version (null if first release)
 * @param releaseType - Type of release
 * @returns Validation result with valid flag and optional error message
 * 
 * @example
 * // Latest: 6.8.1
 * isVersionValidForReleaseType("7.0.0", "6.8.1", "MAJOR")  // { valid: true }
 * isVersionValidForReleaseType("6.9.0", "6.8.1", "MINOR")  // { valid: true }
 * isVersionValidForReleaseType("6.8.2", "6.8.1", "HOTFIX") // { valid: true }
 * isVersionValidForReleaseType("6.8.0", "6.8.1", "MINOR")  // { valid: false }
 * isVersionValidForReleaseType("7.0.0", "6.8.1", "MINOR")  // { valid: false } - exceeds major
 */
export const isVersionValidForReleaseType = (
  version: string,
  latestVersion: string | null,
  releaseType: ReleaseType
): VersionValidationResult => {
  // Validate format first
  const isFormatValid = isValidVersion(version);
  if (!isFormatValid) {
    return { valid: false, error: RELEASE_VERSION_ERROR_MESSAGES.INVALID_VERSION_FORMAT };
  }
  
  // If no previous version, any valid semver is OK (first release for this platform-target)
  const isFirstRelease = latestVersion === null;
  if (isFirstRelease) {
    return { valid: true };
  }
  
  const newVersion = parseVersion(version);
  const currentVersion = parseVersion(latestVersion);
  
  const isMajor = releaseType === RELEASE_TYPE.MAJOR;
  const isMinor = releaseType === RELEASE_TYPE.MINOR;
  const isHotfix = releaseType === RELEASE_TYPE.HOTFIX;
  
  if (isMajor) {
    // MAJOR: new major must be > current major
    const majorIsGreater = newVersion.major > currentVersion.major;
    if (!majorIsGreater) {
      return { 
        valid: false, 
        error: `${RELEASE_VERSION_ERROR_MESSAGES.VERSION_TOO_LOW_MAJOR}. Expected >= ${currentVersion.major + 1}.0.0, got ${version}` 
      };
    }
    return { valid: true };
  }
  
  if (isMinor) {
    // MINOR: same major, new minor must be > current minor
    const majorMismatch = newVersion.major !== currentVersion.major;
    if (majorMismatch) {
      const majorIsHigher = newVersion.major > currentVersion.major;
      if (majorIsHigher) {
        return { 
          valid: false, 
          error: `${RELEASE_VERSION_ERROR_MESSAGES.VERSION_EXCEEDS_MINOR_BOUND}. Expected major version ${currentVersion.major}.x.x, got ${version}` 
        };
      }
      return { 
        valid: false, 
        error: `${RELEASE_VERSION_ERROR_MESSAGES.VERSION_TOO_LOW_MINOR}. Expected >= ${currentVersion.major}.${currentVersion.minor + 1}.0, got ${version}` 
      };
    }
    
    // Check minor is greater
    const minorIsGreater = newVersion.minor > currentVersion.minor;
    if (!minorIsGreater) {
      return { 
        valid: false, 
        error: `${RELEASE_VERSION_ERROR_MESSAGES.VERSION_TOO_LOW_MINOR}. Expected >= ${currentVersion.major}.${currentVersion.minor + 1}.0, got ${version}` 
      };
    }
    return { valid: true };
  }
  
  if (isHotfix) {
    // HOTFIX: same major.minor, new patch must be > current patch
    const majorMismatch = newVersion.major !== currentVersion.major;
    const minorMismatch = newVersion.minor !== currentVersion.minor;
    
    if (majorMismatch || minorMismatch) {
      const isHigherMinorOrMajor = 
        newVersion.major > currentVersion.major ||
        (newVersion.major === currentVersion.major && newVersion.minor > currentVersion.minor);
      
      if (isHigherMinorOrMajor) {
        return { 
          valid: false, 
          error: `${RELEASE_VERSION_ERROR_MESSAGES.VERSION_EXCEEDS_HOTFIX_BOUND}. Expected version ${currentVersion.major}.${currentVersion.minor}.x, got ${version}` 
        };
      }
      return { 
        valid: false, 
        error: `${RELEASE_VERSION_ERROR_MESSAGES.VERSION_TOO_LOW_HOTFIX}. Expected >= ${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch + 1}, got ${version}` 
      };
    }
    
    // Check patch is greater
    const patchIsGreater = newVersion.patch > currentVersion.patch;
    if (!patchIsGreater) {
      return { 
        valid: false, 
        error: `${RELEASE_VERSION_ERROR_MESSAGES.VERSION_TOO_LOW_HOTFIX}. Expected >= ${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch + 1}, got ${version}` 
      };
    }
    return { valid: true };
  }
  
  // Fallback (should not reach here with proper types)
  return { valid: true };
};

