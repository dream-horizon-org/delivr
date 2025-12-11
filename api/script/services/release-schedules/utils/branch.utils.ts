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
 * TODO: May be made configurable in future
 */
const BRANCH_PREFIX = 'release/v';

/**
 * Branch name suffix
 * TODO: May be derived from platform targets in future
 */
const BRANCH_SUFFIX = '_ps_ios';

// ============================================================================
// BRANCH NAME GENERATION
// ============================================================================

/**
 * Generate a release branch name from platform targets
 * 
 * Uses the version from the first platform target in the array.
 * Format: "release/v{version}_ps_ios"
 * 
 * @param platformTargets - Array of platform-target-version combinations
 * @returns Branch name string
 * @throws Error if platformTargets is empty
 * 
 * @example
 * const targets = [
 *   { platform: "ANDROID", target: "PLAY_STORE", version: "1.3.0" },
 *   { platform: "IOS", target: "APP_STORE", version: "1.3.0" }
 * ];
 * generateBranchName(targets); // "release/v1.3.0_ps_ios"
 * 
 * @note This logic may be refined in the future to:
 * - Support different branch patterns per release config
 * - Derive suffix from actual platforms in the release
 * - Handle platform-specific versioning
 */
export const generateBranchName = (platformTargets: PlatformTargetWithVersion[]): string => {
  const isEmpty = platformTargets.length === 0;
  if (isEmpty) {
    throw new Error('Cannot generate branch name: platformTargets array is empty');
  }
  
  // Use the version from the first platform target
  const firstTarget = platformTargets[0];
  const version = firstTarget.version;
  
  return `${BRANCH_PREFIX}${version}${BRANCH_SUFFIX}`;
};

/**
 * Extract version from branch name (reverse operation)
 * Useful for parsing existing branch names
 * 
 * @param branchName - Branch name string
 * @returns Version string or null if pattern doesn't match
 * 
 * @example
 * extractVersionFromBranch("release/v1.3.0_ps_ios") // "1.3.0"
 * extractVersionFromBranch("main") // null
 */
export const extractVersionFromBranch = (branchName: string): string | null => {
  const startsWithPrefix = branchName.startsWith(BRANCH_PREFIX);
  const endsWithSuffix = branchName.endsWith(BRANCH_SUFFIX);
  
  const matchesPattern = startsWithPrefix && endsWithSuffix;
  if (!matchesPattern) {
    return null;
  }
  
  // Extract version between prefix and suffix
  const prefixLength = BRANCH_PREFIX.length;
  const suffixLength = BRANCH_SUFFIX.length;
  const version = branchName.slice(prefixLength, branchName.length - suffixLength);
  
  return version;
};

