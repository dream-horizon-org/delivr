/**
 * Version Utilities
 * Handles semantic version parsing and bumping for scheduled releases
 */

import * as semver from 'semver';
import type {
  SemanticVersion,
  ReleaseType,
  PlatformTargetWithVersion
} from '~types/release-schedules';
import { RELEASE_TYPE, SCHEDULED_RELEASE_ERROR_MESSAGES } from '../release-schedule.constants';

// ============================================================================
// VERSION PARSING
// ============================================================================

/**
 * Parse a semantic version string into its components
 * Supports formats: "1.2.3", "v1.2.3", "1.2.3-beta", etc.
 * 
 * @param version - Version string (e.g., "1.2.3")
 * @returns Object with major, minor, patch numbers
 * @throws Error if version format is invalid
 * 
 * @example
 * parseVersion("1.2.3")     // { major: 1, minor: 2, patch: 3 }
 * parseVersion("v2.0.0")    // { major: 2, minor: 0, patch: 0 }
 * parseVersion("1.0.0-rc1") // { major: 1, minor: 0, patch: 0 }
 */
export const parseVersion = (version: string): SemanticVersion => {
  // Use semver library to parse and validate version
  // Handles all edge cases: leading zeros, invalid formats, pre-release tags, etc.
  const parsed = semver.parse(version);
  
  const isInvalid = parsed === null;
  if (isInvalid) {
    throw new Error(SCHEDULED_RELEASE_ERROR_MESSAGES.INVALID_VERSION_FORMAT);
  }
  
  return {
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch
  };
};

// ============================================================================
// VERSION BUMPING
// ============================================================================

/**
 * Bump a version based on release type
 * 
 * - MAJOR: 1.2.3 → 2.0.0 (resets minor and patch)
 * - MINOR: 1.2.3 → 1.3.0 (resets patch)
 * - HOTFIX: 1.2.3 → 1.2.4
 * 
 * Note: Pre-release tags (e.g., "1.0.0-beta") are stripped before bumping
 * to maintain consistent behavior with the original implementation.
 * 
 * @param version - Current version string
 * @param releaseType - Type of release (MAJOR, MINOR, HOTFIX)
 * @returns Bumped version string
 * 
 * @example
 * bumpVersion("1.2.3", "MAJOR")       // "2.0.0"
 * bumpVersion("1.2.3", "MINOR")       // "1.3.0"
 * bumpVersion("1.2.3", "HOTFIX")      // "1.2.4"
 * bumpVersion("1.0.0-beta", "MAJOR")  // "2.0.0" (strips -beta first)
 */
export const bumpVersion = (version: string, releaseType: ReleaseType): string => {
  // Coerce version to strip pre-release tags and build metadata
  // This maintains the old behavior where "1.0.0-beta" → "1.0.0" → bump → "2.0.0"
  const coerced = semver.coerce(version);
  if (coerced === null) {
    throw new Error(SCHEDULED_RELEASE_ERROR_MESSAGES.INVALID_VERSION_FORMAT);
  }
  const cleanVersion = coerced.version;
  
  const isMajor = releaseType === RELEASE_TYPE.MAJOR;
  const isMinor = releaseType === RELEASE_TYPE.MINOR;
  const isHotfix = releaseType === RELEASE_TYPE.HOTFIX;
  
  if (isMajor) {
    const bumped = semver.inc(cleanVersion, 'major');
    if (bumped === null) {
      throw new Error(SCHEDULED_RELEASE_ERROR_MESSAGES.INVALID_VERSION_FORMAT);
    }
    return bumped;
  }
  
  if (isMinor) {
    const bumped = semver.inc(cleanVersion, 'minor');
    if (bumped === null) {
      throw new Error(SCHEDULED_RELEASE_ERROR_MESSAGES.INVALID_VERSION_FORMAT);
    }
    return bumped;
  }
  
  if (isHotfix) {
    const bumped = semver.inc(cleanVersion, 'patch');
    if (bumped === null) {
      throw new Error(SCHEDULED_RELEASE_ERROR_MESSAGES.INVALID_VERSION_FORMAT);
    }
    return bumped;
  }
  
  // Fallback (should never reach here with proper types)
  return version;
};

// ============================================================================
// PLATFORM TARGET VERSION BUMPING
// ============================================================================

/**
 * Bump versions for all platform targets
 * 
 * @param platformTargets - Array of platform-target-version combinations
 * @param releaseType - Type of release for version bumping
 * @returns New array with bumped versions
 * 
 * @example
 * const targets = [
 *   { platform: "ANDROID", target: "PLAY_STORE", version: "1.2.3" },
 *   { platform: "IOS", target: "APP_STORE", version: "1.2.3" }
 * ];
 * bumpPlatformTargetVersions(targets, "MINOR");
 * // Returns:
 * // [
 * //   { platform: "ANDROID", target: "PLAY_STORE", version: "1.3.0" },
 * //   { platform: "IOS", target: "APP_STORE", version: "1.3.0" }
 * // ]
 */
export const bumpPlatformTargetVersions = (
  platformTargets: PlatformTargetWithVersion[],
  releaseType: ReleaseType
): PlatformTargetWithVersion[] => {
  return platformTargets.map(pt => ({
    platform: pt.platform,
    target: pt.target,
    version: bumpVersion(pt.version, releaseType)
  }));
};

/**
 * Validate that a version string is in valid semantic version format
 * 
 * @param version - Version string to validate
 * @returns true if valid, false otherwise
 */
export const isValidVersion = (version: string): boolean => {
  return semver.valid(version) !== null;
};

/**
 * Compare two versions
 * 
 * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export const compareVersions = (v1: string, v2: string): number => {
  return semver.compare(v1, v2);
};

// ============================================================================
// SCHEDULED RELEASE VERSION RESOLUTION
// ============================================================================

/**
 * Resolve the version to use for the first release of a schedule
 * 
 * Logic:
 * 1. If no previous version for tenant+platform+target → use initialVersion
 * 2. If previous exists → use MAX(initialVersion, bumpedVersion)
 * 
 * This ensures:
 * - First release respects initialVersion configuration
 * - But also respects existing tenant-wide versions (won't go backwards)
 * 
 * @param initialVersion - Version from schedule's initialVersions config
 * @param latestVersion - Latest version for tenant+platform+target (null if none)
 * @param releaseType - Type of release for version bumping
 * @returns Version to use for the release
 * 
 * @example
 * // No previous version - use initial
 * resolveVersionForFirstScheduledRelease("1.0.0", null, "MINOR")     // "1.0.0"
 * 
 * // Previous exists, initial is lower - bump from previous
 * resolveVersionForFirstScheduledRelease("1.0.0", "1.2.0", "MINOR")  // "1.3.0"
 * 
 * // Previous exists, initial is higher - use initial
 * resolveVersionForFirstScheduledRelease("2.0.0", "1.2.0", "MINOR")  // "2.0.0"
 */
export const resolveVersionForFirstScheduledRelease = (
  initialVersion: string,
  latestVersion: string | null,
  releaseType: ReleaseType
): string => {
  // No previous version - use initial
  const noPreviousVersion = latestVersion === null;
  if (noPreviousVersion) {
    return initialVersion;
  }
  
  // Previous exists - calculate bumped version and compare with initial
  const bumpedVersion = bumpVersion(latestVersion, releaseType);
  const comparison = compareVersions(initialVersion, bumpedVersion);
  
  // Return the higher one
  const initialIsHigherOrEqual = comparison >= 0;
  return initialIsHigherOrEqual ? initialVersion : bumpedVersion;
};

