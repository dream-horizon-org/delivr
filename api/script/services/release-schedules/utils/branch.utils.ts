/**
 * Branch Name Utilities
 * Generates release branch names from platform targets
 */

import type { PlatformTargetWithVersion } from '~types/release-schedules';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Branch name prefix
 */
const BRANCH_PREFIX = 'release/v';

/**
 * Target to suffix mapping for branch names
 */
const TARGET_SUFFIX_MAP: Record<string, string> = {
  'PLAY_STORE': 'ps',
  'APP_STORE': 'ios',
  'WEB': 'web'
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if all platform targets have the same version
 */
const allVersionsSame = (targets: PlatformTargetWithVersion[]): boolean => {
  const firstVersion = targets[0].version;
  return targets.every(t => t.version === firstVersion);
};

/**
 * Get the suffix for a target
 * @throws Error if target is not in TARGET_SUFFIX_MAP
 */
const getTargetSuffix = (target: string): string => {
  const suffix = TARGET_SUFFIX_MAP[target];
  const isUnknownTarget = suffix === undefined;
  
  if (isUnknownTarget) {
    const validTargets = Object.keys(TARGET_SUFFIX_MAP).join(', ');
    throw new Error(`Unknown target "${target}". Valid targets: ${validTargets}`);
  }
  
  return suffix;
};

// ============================================================================
// BRANCH NAME GENERATION
// ============================================================================

/**
 * Generate a release branch name from platform targets
 * 
 * Format depends on whether all versions are the same:
 * - Same versions: "release/v{version}-{suffix1}-{suffix2}"
 * - Different versions: "release/v{version1}-{suffix1}_{version2}-{suffix2}"
 * 
 * @param platformTargets - Array of platform-target-version combinations
 * @returns Branch name string
 * @throws Error if platformTargets is empty or contains unknown target
 * 
 * @example
 * // Same versions
 * const targets1 = [
 *   { platform: "ANDROID", target: "PLAY_STORE", version: "1.3.0" },
 *   { platform: "IOS", target: "APP_STORE", version: "1.3.0" }
 * ];
 * generateBranchName(targets1); // "release/v1.3.0-ps-ios"
 * 
 * // Different versions
 * const targets2 = [
 *   { platform: "ANDROID", target: "PLAY_STORE", version: "1.3.0" },
 *   { platform: "IOS", target: "APP_STORE", version: "1.4.0" }
 * ];
 * generateBranchName(targets2); // "release/v1.3.0-ps_1.4.0-ios"
 */
export const generateBranchName = (platformTargets: PlatformTargetWithVersion[]): string => {
  const isEmpty = platformTargets.length === 0;
  if (isEmpty) {
    throw new Error('Cannot generate branch name: platformTargets array is empty');
  }
  
  // Get suffixes for all targets (validates targets, throws if unknown)
  const targetSuffixes = platformTargets.map(pt => getTargetSuffix(pt.target));
  
  // Check if all versions are the same
  const sameVersions = allVersionsSame(platformTargets);
  
  if (sameVersions) {
    // Same versions: release/v1.0.0-ps-ios
    const version = platformTargets[0].version;
    const suffixesConcatenated = targetSuffixes.join('-');
    return `${BRANCH_PREFIX}${version}-${suffixesConcatenated}`;
  }
  
  // Different versions: release/v1.0.0-ps_1.1.0-ios
  const versionSuffixPairs = platformTargets.map((pt, index) => {
    const suffix = targetSuffixes[index];
    return `${pt.version}-${suffix}`;
  });
  
  return `${BRANCH_PREFIX}${versionSuffixPairs.join('_')}`;
};

/**
 * Extract version from branch name (reverse operation)
 * 
 * Handles both formats:
 * - Same versions: "release/v1.3.0-ps-ios" → "1.3.0"
 * - Different versions: "release/v1.3.0-ps_1.4.0-ios" → "1.3.0" (first version)
 * 
 * @param branchName - Branch name string
 * @returns Version string or null if pattern doesn't match
 * 
 * @example
 * extractVersionFromBranch("release/v1.3.0-ps-ios") // "1.3.0"
 * extractVersionFromBranch("release/v1.3.0-ps_1.4.0-ios") // "1.3.0"
 * extractVersionFromBranch("main") // null
 */
export const extractVersionFromBranch = (branchName: string): string | null => {
  const startsWithPrefix = branchName.startsWith(BRANCH_PREFIX);
  if (!startsWithPrefix) {
    return null;
  }
  
  // Remove prefix: "1.3.0-ps-ios" or "1.3.0-ps_1.4.0-ios"
  const withoutPrefix = branchName.slice(BRANCH_PREFIX.length);
  
  // Version is everything before the first dash followed by a known suffix
  // Pattern: version-suffix or version-suffix_version-suffix...
  const versionMatch = withoutPrefix.match(/^(\d+\.\d+\.\d+)/);
  
  if (!versionMatch) {
    return null;
  }
  
  return versionMatch[1];
};

