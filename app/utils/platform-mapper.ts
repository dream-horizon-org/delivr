/**
 * Platform Mapper Utility
 * Maps frontend TargetPlatform to backend TestPlatform enum
 * 
 * Frontend uses simple target IDs (PLAY_STORE, APP_STORE)
 * Backend uses compound enums (ANDROID_PLAY_STORE, IOS_APP_STORE, etc.)
 */

import type { TargetPlatform, Platform } from '~/types/release-config';

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
  ANDROID_PLAY_STORE: 'ANDROID',
  ANDROID_INTERNAL_TESTING: 'ANDROID',
  IOS_APP_STORE: 'IOS',
  IOS_TESTFLIGHT: 'IOS',
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
 * @returns Platform ('ANDROID' | 'IOS' | 'WEB')
 * 
 * @example
 * getPlatformForTarget('PLAY_STORE')  // → 'ANDROID'
 * getPlatformForTarget('APP_STORE')   // → 'IOS'
 */
export function getPlatformForTarget(target: TargetPlatform): Platform {
  const testPlatform = targetToTestPlatform(target);
  return testPlatformToPlatform(testPlatform);
}

/**
 * Check if a target is Android-based
 */
export function isAndroidTarget(target: TargetPlatform): boolean {
  return getPlatformForTarget(target) === 'ANDROID';
}

/**
 * Check if a target is iOS-based
 */
export function isIOSTarget(target: TargetPlatform): boolean {
  return getPlatformForTarget(target) === 'IOS';
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
export function groupTargetsByPlatform(selectedTargets: TargetPlatform[]): Record<Platform, TargetPlatform[]> {
  const grouped: Record<Platform, TargetPlatform[]> = {
    ANDROID: [],
    IOS: [],
    WEB: [],
  };

  selectedTargets.forEach(target => {
    const platform = getPlatformForTarget(target);
    grouped[platform].push(target);
  });

  return grouped;
}

