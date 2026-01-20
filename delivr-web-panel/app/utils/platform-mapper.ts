/**
 * Platform Mapper Utility
 * Maps frontend TargetPlatform to backend TestPlatform enum
 * 
 * Frontend uses simple target IDs (PLAY_STORE, APP_STORE)
 * Backend uses compound enums (ANDROID_PLAY_STORE, IOS_APP_STORE, etc.)
 */

import type { TargetPlatform, Platform } from '~/types/release-config';
import { PLATFORMS, TARGET_PLATFORMS } from '~/types/release-config-constants';

/**
 * Backend TestPlatform enum (matches backend API contract)
 */
export type BackendTestPlatform = 
  | 'ANDROID_PLAY_STORE'
  | 'IOS_APP_STORE'
  | 'IOS_TESTFLIGHT'
  | 'ANDROID_INTERNAL_TESTING';

/**
 * Map of frontend TargetPlatform → Backend TestPlatform
 */
const TARGET_TO_TEST_PLATFORM_MAP: Record<TargetPlatform, BackendTestPlatform> = {
  PLAY_STORE: 'ANDROID_PLAY_STORE',
  APP_STORE: 'IOS_APP_STORE',
  WEB: 'ANDROID_PLAY_STORE', // Fallback (Web doesn't have test management)
  // Future mappings (when targets are added to frontend):
  // TESTFLIGHT: 'IOS_TESTFLIGHT',
  // INTERNAL_TESTING: 'ANDROID_INTERNAL_TESTING',
  // FIREBASE: 'ANDROID_INTERNAL_TESTING',
};

/**
 * Reverse map: Backend TestPlatform → Frontend Platform
 */
const TEST_PLATFORM_TO_PLATFORM_MAP: Record<BackendTestPlatform, Platform> = {
  ANDROID_PLAY_STORE: PLATFORMS.ANDROID,
  ANDROID_INTERNAL_TESTING: PLATFORMS.ANDROID,
  IOS_APP_STORE: PLATFORMS.IOS,
  IOS_TESTFLIGHT: PLATFORMS.IOS,
};

/**
 * Convert frontend TargetPlatform to backend TestPlatform
 * Used when sending data to backend (e.g., Test Management config)
 * 
 * @param target - Frontend target platform (e.g., 'PLAY_STORE', 'APP_STORE')
 * @returns Backend TestPlatform enum (e.g., 'ANDROID_PLAY_STORE', 'IOS_APP_STORE')
 * 
 * @example
 * targetToTestPlatform('PLAY_STORE') // → 'ANDROID_PLAY_STORE'
 * targetToTestPlatform('APP_STORE')  // → 'IOS_APP_STORE'
 */
export function targetToTestPlatform(target: TargetPlatform): BackendTestPlatform {
  return TARGET_TO_TEST_PLATFORM_MAP[target];
}

/**
 * Convert backend TestPlatform to frontend Platform
 * Used when receiving data from backend
 * 
 * @param testPlatform - Backend TestPlatform enum
 * @returns Frontend Platform ('ANDROID' | 'IOS')
 * 
 * @example
 * testPlatformToPlatform('ANDROID_PLAY_STORE') // → 'ANDROID'
 * testPlatformToPlatform('IOS_TESTFLIGHT')     // → 'IOS'
 */
export function testPlatformToPlatform(testPlatform: BackendTestPlatform): Platform {
  return TEST_PLATFORM_TO_PLATFORM_MAP[testPlatform];
}

/**
 * Get all backend TestPlatforms for selected frontend targets
 * Filters out duplicates and invalid targets
 * 
 * @param selectedTargets - Array of frontend TargetPlatform
 * @returns Array of backend TestPlatform enums
 * 
 * @example
 * getTestPlatformsForTargets(['PLAY_STORE', 'APP_STORE'])
 * // → ['ANDROID_PLAY_STORE', 'IOS_APP_STORE']
 */
export function getTestPlatformsForTargets(selectedTargets: TargetPlatform[]): BackendTestPlatform[] {
  return [...new Set(selectedTargets.map(targetToTestPlatform))];
}

/**
 * Determine which platform a target belongs to
 * 
 * @param target - Frontend TargetPlatform
 * @returns Platform ('ANDROID' | 'IOS')
 * 
 * @example
 * getPlatformForTarget('PLAY_STORE')  // → 'ANDROID'
 * getPlatformForTarget('APP_STORE')   // → 'IOS'
 * getPlatformForTarget('WEB')         // → 'ANDROID' (fallback)
 */
export function getPlatformForTarget(target: TargetPlatform): Platform {
  // WEB doesn't have a mobile platform, use ANDROID as fallback
  if (target === TARGET_PLATFORMS.WEB) {
    return PLATFORMS.ANDROID;
  }
  const testPlatform = targetToTestPlatform(target);
  return testPlatformToPlatform(testPlatform);
}

/**
 * Check if a target is Android-based
 */
export function isAndroidTarget(target: TargetPlatform): boolean {
  return getPlatformForTarget(target) === PLATFORMS.ANDROID;
}

/**
 * Check if a target is iOS-based
 */
export function isIOSTarget(target: TargetPlatform): boolean {
  return getPlatformForTarget(target) === PLATFORMS.IOS;
}

/**
 * Group selected targets by platform
 * Useful for platform-specific configuration
 * 
 * @param selectedTargets - Array of frontend TargetPlatform
 * @returns Object with platforms as keys and their targets as values
 * 
 * @example
 * groupTargetsByPlatform(['PLAY_STORE', 'APP_STORE'])
 * // → { ANDROID: ['PLAY_STORE'], IOS: ['APP_STORE'] }
 */
export function groupTargetsByPlatform(selectedTargets: TargetPlatform[]): Partial<Record<Platform, TargetPlatform[]>> {
  const grouped: Partial<Record<Platform, TargetPlatform[]>> = {
    ANDROID: [],
    IOS: [],
  };

  selectedTargets.forEach(target => {
    // Skip WEB target as it doesn't map to mobile platforms
    if (target === TARGET_PLATFORMS.WEB) return;
    
    const platform = getPlatformForTarget(target);
    if (!grouped[platform]) {
      grouped[platform] = [];
    }
    grouped[platform]!.push(target);
  });

  return grouped;
}

// ============================================================================
// PLATFORM TARGET TRANSFORMATIONS (New API Contract)
// ============================================================================

/**
 * PlatformTarget interface matching new API contract
 */
export interface PlatformTarget {
  platform: Platform;
  target: TargetPlatform;
}

/**
 * PlatformTargetWithVersion for Release Creation
 */
export interface PlatformTargetWithVersion extends PlatformTarget {
  version: string;
}

/**
 * Transform UI TargetPlatform array to backend PlatformTarget array
 * Used for Release Config creation/update
 * 
 * Converts: ['PLAY_STORE', 'APP_STORE'] 
 * To: [{ platform: 'ANDROID', target: 'PLAY_STORE' }, { platform: 'IOS', target: 'APP_STORE' }]
 * 
 * @param selectedTargets - Array of TargetPlatform from UI
 * @returns Array of PlatformTarget objects for backend
 * 
 * @example
 * transformToPlatformTargetsArray(['PLAY_STORE', 'APP_STORE'])
 * // → [
 * //   { platform: 'ANDROID', target: 'PLAY_STORE' },
 * //   { platform: 'IOS', target: 'APP_STORE' }
 * // ]
 */
export function transformToPlatformTargetsArray(
  selectedTargets: TargetPlatform[]
): PlatformTarget[] {
  return selectedTargets.map(target => ({
    platform: getPlatformForTarget(target),
    target,
  }));
}

/**
 * Transform backend PlatformTarget array to UI TargetPlatform array
 * Used when loading Release Config for edit/clone
 * 
 * Converts: [{ platform: 'ANDROID', target: 'PLAY_STORE' }, { platform: 'IOS', target: 'APP_STORE' }]
 * To: ['PLAY_STORE', 'APP_STORE']
 * 
 * @param platformTargets - Array of PlatformTarget from backend
 * @returns Array of TargetPlatform for UI
 * 
 * @example
 * transformFromPlatformTargetsArray([
 *   { platform: 'ANDROID', target: 'PLAY_STORE' },
 *   { platform: 'IOS', target: 'APP_STORE' }
 * ])
 * // → ['PLAY_STORE', 'APP_STORE']
 */
export function transformFromPlatformTargetsArray(
  platformTargets: PlatformTarget[]
): TargetPlatform[] {
  return platformTargets.map(pt => pt.target);
}

/**
 * Transform UI data to Release Creation format with versions
 * Used when creating a new release
 * 
 * Converts:
 *   targets: ['PLAY_STORE', 'APP_STORE']
 *   versions: { ANDROID: 'v6.5.0', IOS: 'v6.3.0' }
 * To:
 *   [
 *     { platform: 'ANDROID', target: 'PLAY_STORE', version: 'v6.5.0' },
 *     { platform: 'IOS', target: 'APP_STORE', version: 'v6.3.0' }
 *   ]
 * 
 * @param releaseTargets - Array of TargetPlatform from UI
 * @param versions - Map of Platform to version string
 * @returns Array of PlatformTargetWithVersion for backend
 * 
 * @example
 * transformToReleaseCreationFormat(
 *   ['PLAY_STORE', 'APP_STORE'],
 *   { ANDROID: 'v6.5.0', IOS: 'v6.3.0' }
 * )
 * // → [
 * //   { platform: 'ANDROID', target: 'PLAY_STORE', version: 'v6.5.0' },
 * //   { platform: 'IOS', target: 'APP_STORE', version: 'v6.3.0' }
 * // ]
 */
export function transformToReleaseCreationFormat(
  releaseTargets: TargetPlatform[],
  versions: Record<Platform, string>
): PlatformTargetWithVersion[] {
  return releaseTargets.map(target => {
    const platform = getPlatformForTarget(target);
    return {
      platform,
      target,
      version: versions[platform] || '',
    };
  });
}

/**
 * Extract platform versions from backend PlatformTargetWithVersion array
 * Used when displaying release details or editing release
 * 
 * Converts:
 *   [
 *     { platform: 'ANDROID', target: 'PLAY_STORE', version: 'v6.5.0' },
 *     { platform: 'IOS', target: 'APP_STORE', version: 'v6.3.0' }
 *   ]
 * To:
 *   {
 *     platforms: ['ANDROID', 'IOS'],
 *     targets: ['PLAY_STORE', 'APP_STORE'],
 *     versions: { ANDROID: 'v6.5.0', IOS: 'v6.3.0' }
 *   }
 * 
 * @param platformTargets - Array of PlatformTargetWithVersion from backend
 * @returns Object with separated platforms, targets, and versions
 * 
 * @example
 * extractPlatformVersions([
 *   { platform: 'ANDROID', target: 'PLAY_STORE', version: 'v6.5.0' },
 *   { platform: 'IOS', target: 'APP_STORE', version: 'v6.3.0' }
 * ])
 * // → {
 * //   platforms: ['ANDROID', 'IOS'],
 * //   targets: ['PLAY_STORE', 'APP_STORE'],
 * //   versions: { ANDROID: 'v6.5.0', IOS: 'v6.3.0' }
 * // }
 */
export function extractPlatformVersions(
  platformTargets: PlatformTargetWithVersion[]
): {
  platforms: Platform[];
  targets: TargetPlatform[];
  versions: Record<Platform, string>;
} {
  const platforms: Platform[] = [];
  const targets: TargetPlatform[] = [];
  const versions: Record<Platform, string> = {} as Record<Platform, string>;

  platformTargets.forEach(pt => {
    if (!platforms.includes(pt.platform)) {
      platforms.push(pt.platform);
    }
    targets.push(pt.target);
    versions[pt.platform] = pt.version;
  });

  return { platforms, targets, versions };
}

