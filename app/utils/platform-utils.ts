/**
 * Platform Utilities
 * Helper functions for platform and target platform conversions
 */

import type { Platform, TargetPlatform } from '~/types/release-config';
import { PLATFORMS } from '~/types/release-config-constants';

/**
 * Derive mobile platforms from selected distribution targets
 * 
 * Maps distribution targets to their corresponding mobile platforms:
 * - PLAY_STORE → ANDROID
 * - APP_STORE → IOS
 * - WEB → (no mobile platform)
 * 
 * @param targets - Array of selected distribution targets
 * @returns Array of mobile platforms (ANDROID, IOS)
 */
export function derivePlatformsFromTargets(targets: TargetPlatform[]): Platform[] {
  const platforms = new Set<Platform>();

  targets.forEach((target) => {
    switch (target) {
      case 'PLAY_STORE':
        platforms.add(PLATFORMS.ANDROID);
        break;
      case 'APP_STORE':
        platforms.add(PLATFORMS.IOS);
        break;
      case 'WEB':
        // WEB doesn't map to a mobile platform
        break;
      default:
        // Handle unknown targets gracefully
        console.warn(`Unknown target platform: ${target}`);
    }
  });

  return Array.from(platforms);
}

/**
 * Check if a target requires a specific platform
 * 
 * @param target - Distribution target to check
 * @param platform - Mobile platform to check against
 * @returns true if the target requires the specified platform
 */
export function targetRequiresPlatform(
  target: TargetPlatform,
  platform: Platform
): boolean {
  const mapping: Record<TargetPlatform, Platform | null> = {
    PLAY_STORE: PLATFORMS.ANDROID,
    APP_STORE: PLATFORMS.IOS,
    WEB: null,
  };

  return mapping[target] === platform;
}

/**
 * Get all targets for a specific platform
 * 
 * @param platform - Mobile platform
 * @returns Array of targets that belong to this platform
 */
export function getTargetsForPlatform(platform: Platform): TargetPlatform[] {
  switch (platform) {
    case PLATFORMS.ANDROID:
      return ['PLAY_STORE'];
    case PLATFORMS.IOS:
      return ['APP_STORE'];
    default:
      return [];
  }
}

/**
 * Validate that selected targets have corresponding platforms
 * 
 * @param targets - Selected distribution targets
 * @param platforms - Configured mobile platforms
 * @returns Validation result with missing platforms
 */
export function validatePlatformTargetConsistency(
  targets: TargetPlatform[],
  platforms: Platform[]
): { isValid: boolean; missingPlatforms: Platform[] } {
  const requiredPlatforms = derivePlatformsFromTargets(targets);
  const missingPlatforms = requiredPlatforms.filter(
    (required) => !platforms.includes(required)
  );

  return {
    isValid: missingPlatforms.length === 0,
    missingPlatforms,
  };
}

