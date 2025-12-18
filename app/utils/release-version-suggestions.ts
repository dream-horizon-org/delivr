/**
 * Release Version Suggestions Utility
 * 
 * Provides version suggestions and branch name generation for manual release creation
 * based on existing releases in the system.
 * 
 * Usage:
 * - Only for manual release creation (not edit mode)
 * - Analyzes all releases to find latest versions per platform-target
 * - Suggests next version based on release type (MAJOR/MINOR/HOTFIX)
 * - Generates branch name from suggested version
 * - User can override all suggestions
 */

import type { BackendReleaseResponse } from '~/types/release-management.types';
import type { ReleaseType, PlatformTargetWithVersion } from '~/types/release-creation-backend';

// ============================================================================
// Types
// ============================================================================

export interface VersionSuggestion {
  platform: PlatformTargetWithVersion['platform'];
  target: PlatformTargetWithVersion['target'];
  currentVersion: string | null;
  suggestedVersion: string;
}

export interface VersionSuggestionsResult {
  suggestions: VersionSuggestion[];
  branchName: string;
}

// ============================================================================
// Version Parsing & Bumping
// ============================================================================

/**
 * Parse semantic version string
 * Supports: "1.2.3", "v1.2.3", "1.2.3-beta"
 * Returns null if invalid
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  // Remove 'v' prefix if present
  const cleanVersion = version.replace(/^v/i, '');
  
  // Match semantic version: major.minor.patch (with optional pre-release/build)
  const match = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-[\w\.-]+)?(?:\+[\w\.-]+)?$/);
  
  if (!match) {
    return null;
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Bump version based on release type
 * - MAJOR: 1.2.3 → 2.0.0
 * - MINOR: 1.2.3 → 1.3.0
 * - HOTFIX: 1.2.3 → 1.2.4
 */
function bumpVersion(version: string, releaseType: ReleaseType): string {
  const parsed = parseVersion(version);
  
  if (!parsed) {
    // Invalid version - return default based on release type
    if (releaseType === 'MAJOR') return 'v2.0.0';
    if (releaseType === 'MINOR') return 'v1.1.0';
    return 'v1.0.1';
  }
  
  let { major, minor, patch } = parsed;
  
  if (releaseType === 'MAJOR') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (releaseType === 'MINOR') {
    minor += 1;
    patch = 0;
  } else if (releaseType === 'HOTFIX') {
    patch += 1;
  }
  
  return `v${major}.${minor}.${patch}`;
}

/**
 * Normalize version string (ensure consistent format)
 * Adds 'v' prefix if missing, removes pre-release/build metadata
 */
function normalizeVersion(version: string): string {
  const parsed = parseVersion(version);
  if (!parsed) return version; // Return as-is if can't parse
  
  return `v${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);
  
  if (!parsed1 || !parsed2) return 0;
  
  if (parsed1.major !== parsed2.major) {
    return parsed1.major > parsed2.major ? 1 : -1;
  }
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor > parsed2.minor ? 1 : -1;
  }
  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch > parsed2.patch ? 1 : -1;
  }
  
  return 0;
}

// ============================================================================
// Latest Version Extraction
// ============================================================================

/**
 * Extract latest version for each platform-target combination
 * Excludes ARCHIVED releases (same logic as backend)
 */
function extractLatestVersions(
  releases: BackendReleaseResponse[]
): Map<string, { version: string; createdAt: string }> {
  const versionMap = new Map<string, { version: string; createdAt: string }>();
  
  // Filter out archived releases
  const activeReleases = releases.filter(
    (release) => release.status !== 'ARCHIVED'
  );
  
  // Process each release
  activeReleases.forEach((release) => {
    if (!release.platformTargetMappings || release.platformTargetMappings.length === 0) {
      return;
    }
    
    release.platformTargetMappings.forEach((mapping: any) => {
      const key = `${mapping.platform}:${mapping.target}`;
      const version = mapping.version;
      const createdAt = release.createdAt;
      
      if (!version) return;
      
      const existing = versionMap.get(key);
      
      // If no existing version, or this version is newer (by createdAt), use this one
      if (!existing || new Date(createdAt) > new Date(existing.createdAt)) {
        versionMap.set(key, { version, createdAt });
      } else {
        // If same date or older, compare versions to ensure we have the latest
        const existingVersion = existing.version;
        if (compareVersions(version, existingVersion) > 0) {
          versionMap.set(key, { version, createdAt });
        }
      }
    });
  });
  
  return versionMap;
}

// ============================================================================
// Version Suggestions
// ============================================================================

/**
 * Get version suggestions for manual release creation
 * 
 * @param releases - All releases from useReleases hook
 * @param releaseType - Type of release (MAJOR/MINOR/HOTFIX)
 * @param platformTargets - Platform-target combinations to suggest versions for
 * @returns Version suggestions and branch name
 */
export function getVersionSuggestions(
  releases: BackendReleaseResponse[],
  releaseType: ReleaseType,
  platformTargets: PlatformTargetWithVersion[]
): VersionSuggestionsResult {

  console.log('[getVersionSuggestions] releases:', releases, releaseType, platformTargets);
  // Extract latest versions per platform-target
  const latestVersions = extractLatestVersions(releases);
  
  // Generate suggestions for each platform-target
  const suggestions: VersionSuggestion[] = platformTargets.map((pt) => {
    const key = `${pt.platform}:${pt.target}`;
    const latest = latestVersions.get(key);
    
    const currentVersion = latest ? normalizeVersion(latest.version) : null;
    
    // If no previous version exists, suggest default based on release type
    if (!currentVersion) {
      const defaultVersion = releaseType === 'MAJOR' ? 'v2.0.0' : 
                            releaseType === 'MINOR' ? 'v1.1.0' : 
                            'v1.0.1';
      
      return {
        platform: pt.platform,
        target: pt.target,
        currentVersion: null,
        suggestedVersion: defaultVersion,
      };
    }
    
    // Bump from latest version
    const suggestedVersion = bumpVersion(currentVersion, releaseType);
    
    return {
      platform: pt.platform,
      target: pt.target,
      currentVersion,
      suggestedVersion,
    };
  });
  
  // Generate branch name from all platforms and their versions
  // Branch format: release/android-1.2.3-ios-2.0.0
  if (suggestions.length === 0) {
    // Fallback if no suggestions
    const defaultVersion = releaseType === 'MAJOR' ? 'v2.0.0' : releaseType === 'MINOR' ? 'v1.1.0' : 'v1.0.1';
    const branchVersion = defaultVersion.replace(/^v/i, '');
    return {
      suggestions,
      branchName: `release/${branchVersion}`,
    };
  }

  // Build branch name with all platforms and versions
  const branchParts = suggestions.map((suggestion) => {
    const platform = suggestion.platform.toLowerCase();
    const version = suggestion.suggestedVersion; // Keep 'v' prefix
    return `${platform}-${version}`;
  });

  const branchName = `release/${branchParts.join('-')}`;
  
  return {
    suggestions,
    branchName,
  };
}

/**
 * Generate branch name from version
 * 
 * @param version - Version string (e.g., "v1.0.0" or "1.0.0")
 * @returns Branch name (e.g., "release/1.0.0")
 */
export function generateBranchName(version: string): string {
  // Remove 'v' prefix if present
  const cleanVersion = version.replace(/^v/i, '');
  return `release/${cleanVersion}`;
}

/**
 * Apply version suggestions to platform targets
 * Updates version field for each platform-target with suggested version
 */
export function applyVersionSuggestions(
  platformTargets: PlatformTargetWithVersion[],
  suggestions: VersionSuggestion[]
): PlatformTargetWithVersion[] {
  return platformTargets.map((pt) => {
    const suggestion = suggestions.find(
      (s) => s.platform === pt.platform && s.target === pt.target
    );
    
    if (suggestion) {
      return {
        ...pt,
        version: suggestion.suggestedVersion,
      };
    }
    
    return pt;
  });
}

/**
 * Get latest version for a specific platform-target combination
 * Useful for displaying current version in UI
 */
export function getLatestVersionForPlatformTarget(
  releases: BackendReleaseResponse[],
  platform: PlatformTargetWithVersion['platform'],
  target: PlatformTargetWithVersion['target']
): string | null {
  const latestVersions = extractLatestVersions(releases);
  const key = `${platform}:${target}`;
  const latest = latestVersions.get(key);
  
  return latest ? normalizeVersion(latest.version) : null;
}

