/**
 * Platform Rules - Centralized platform-specific rollout rules
 * 
 * Defines capabilities and constraints for:
 * - Android (Play Store staged rollout)
 * - iOS Phased Release (7-day automatic)
 * - iOS Manual Release (immediate 100%)
 * 
 * Reference: DISTRIBUTION_API_SPEC.md lines 46-82
 */

import { Platform } from '~/types/distribution.types';

// ============================================================================
// TYPES
// ============================================================================

export interface PlatformRules {
  /** Can user adjust rollout percentage? */
  canAdjustRollout: boolean;
  
  /** Can user set partial rollout (not just 100%)? */
  canSetPartialRollout: boolean;
  
  /** Can only skip to 100% (iOS phased complete early)? */
  canOnlyCompleteEarly: boolean;
  
  /** Can user pause the rollout? */
  canPause: boolean;
  
  /** Does this platform support decimal percentages? */
  allowsDecimals: boolean;
  
  /** Minimum allowed rollout percentage */
  minPercent: number;
  
  /** Maximum allowed rollout percentage */
  maxPercent: number;
  
  /** Common preset values for this platform */
  allowedSteps: number[];
  
  /** Step increment for slider */
  sliderStep: number;
}

export interface RolloutValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// PLATFORM RULES
// ============================================================================

/**
 * Get platform-specific rollout rules
 * 
 * @param platform - ANDROID or IOS
 * @param phasedRelease - For iOS: true = phased (7-day), false = manual (immediate)
 * @returns Platform-specific rules and constraints
 */
export function getPlatformRules(
  platform: Platform,
  phasedRelease?: boolean
): PlatformRules {
  // Android (Play Store Staged Rollout)
  if (platform === Platform.ANDROID) {
    return {
      canAdjustRollout: true,
      canSetPartialRollout: true,
      canOnlyCompleteEarly: false,
      canPause: false,
      allowsDecimals: true,
      minPercent: 0,
      maxPercent: 100,
      allowedSteps: [1, 5, 10, 25, 50, 100],
      sliderStep: 0.1, // Decimals allowed (e.g., 5.5%)
    };
  }
  
  // iOS Phased Release (7-day automatic by Apple)
  if (platform === Platform.IOS && phasedRelease === true) {
    return {
      canAdjustRollout: true,
      canSetPartialRollout: false,
      canOnlyCompleteEarly: true, // Can only set to 100%
      canPause: true,
      allowsDecimals: false,
      minPercent: 100,
      maxPercent: 100,
      allowedSteps: [100], // Only 100% allowed
      sliderStep: 100,
    };
  }
  
  // iOS Manual Release (immediate 100%)
  if (platform === Platform.IOS && phasedRelease === false) {
    return {
      canAdjustRollout: false, // Already at 100%
      canSetPartialRollout: false,
      canOnlyCompleteEarly: false,
      canPause: false,
      allowsDecimals: false,
      minPercent: 100,
      maxPercent: 100,
      allowedSteps: [100],
      sliderStep: 100,
    };
  }
  
  throw new Error(`Invalid platform configuration: platform=${platform}, phasedRelease=${phasedRelease}`);
}

/**
 * Validate rollout update request
 * 
 * @param platform - ANDROID or IOS
 * @param phasedRelease - For iOS: true = phased, false = manual
 * @param currentPercent - Current rollout percentage
 * @param newPercent - Requested new percentage
 * @returns Validation result with error message if invalid
 */
export function validateRolloutUpdate(
  platform: Platform,
  phasedRelease: boolean,
  currentPercent: number,
  newPercent: number
): RolloutValidationResult {
  const rules = getPlatformRules(platform, phasedRelease);
  
  // Check if rollout can be adjusted at all
  if (!rules.canAdjustRollout) {
    return { 
      valid: false, 
      error: 'Rollout cannot be adjusted for this platform. Already at 100%.' 
    };
  }
  
  // Check if within allowed range
  if (newPercent < rules.minPercent || newPercent > rules.maxPercent) {
    return { 
      valid: false, 
      error: `Rollout must be between ${rules.minPercent}% and ${rules.maxPercent}%` 
    };
  }
  
  // Android: Can only increase rollout
  if (platform === Platform.ANDROID && newPercent < currentPercent) {
    return { 
      valid: false, 
      error: 'Rollout percentage can only increase, not decrease' 
    };
  }
  
  // iOS Phased: Can only complete early (100%)
  if (rules.canOnlyCompleteEarly && newPercent !== 100) {
    return { 
      valid: false, 
      error: 'iOS phased release can only skip to 100% to complete early' 
    };
  }
  
  return { valid: true };
}

/**
 * Check if pause action is available for this submission
 * 
 * @param platform - ANDROID or IOS
 * @param phasedRelease - For iOS: true = phased, false = manual
 * @returns true if pause is available
 */
export function canPauseRollout(
  platform: Platform,
  phasedRelease?: boolean
): boolean {
  const rules = getPlatformRules(platform, phasedRelease);
  return rules.canPause;
}

/**
 * Check if resume action is available for this submission
 * Same as pause - only iOS phased release
 * 
 * @param platform - ANDROID or IOS
 * @param phasedRelease - For iOS: true = phased, false = manual
 * @returns true if resume is available
 */
export function canResumeRollout(
  platform: Platform,
  phasedRelease?: boolean
): boolean {
  return canPauseRollout(platform, phasedRelease);
}

/**
 * Get rollout control type for UI rendering
 * 
 * @param platform - ANDROID or IOS
 * @param phasedRelease - For iOS: true = phased, false = manual
 * @returns Control type identifier
 */
export function getRolloutControlType(
  platform: Platform,
  phasedRelease?: boolean
): 'slider' | 'complete-early' | 'readonly' {
  if (platform === Platform.ANDROID) {
    return 'slider'; // Android slider with decimals
  }
  
  if (platform === Platform.IOS && phasedRelease === true) {
    return 'complete-early'; // iOS phased: only 100% button
  }
  
  if (platform === Platform.IOS && phasedRelease === false) {
    return 'readonly'; // iOS manual: no controls
  }
  
  return 'readonly';
}

/**
 * Get preset rollout percentages for platform
 * 
 * @param platform - ANDROID or IOS
 * @param phasedRelease - For iOS: true = phased, false = manual
 * @returns Array of preset percentage values
 */
export function getRolloutPresets(
  platform: Platform,
  phasedRelease?: boolean
): number[] {
  const rules = getPlatformRules(platform, phasedRelease);
  return rules.allowedSteps;
}

/**
 * Calculate current day in iOS phased release (7-day cycle)
 * 
 * @param rolloutPercent - Current rollout percentage
 * @returns Day number (1-7) in the phased release cycle
 */
export function getIOSPhasedReleaseDay(rolloutPercent: number): number {
  // Apple's 7-day phased release:
  // Day 1: ~1%, Day 2: ~2%, Day 3: ~5%, Day 4: ~10%
  // Day 5: ~20%, Day 6: ~50%, Day 7: 100%
  
  if (rolloutPercent >= 100) return 7;
  if (rolloutPercent >= 50) return 6;
  if (rolloutPercent >= 20) return 5;
  if (rolloutPercent >= 10) return 4;
  if (rolloutPercent >= 5) return 3;
  if (rolloutPercent >= 2) return 2;
  return 1;
}

/**
 * Get user-friendly description of platform rollout type
 * 
 * @param platform - ANDROID or IOS
 * @param phasedRelease - For iOS: true = phased, false = manual
 * @returns Human-readable description
 */
export function getPlatformRolloutDescription(
  platform: Platform,
  phasedRelease?: boolean
): string {
  if (platform === Platform.ANDROID) {
    return 'Staged rollout with manual control. You can gradually increase the percentage.';
  }
  
  if (platform === Platform.IOS && phasedRelease === true) {
    return 'Automatic 7-day phased release by Apple. You can complete early or pause if needed.';
  }
  
  if (platform === Platform.IOS && phasedRelease === false) {
    return 'Immediate release to 100% of users. No gradual rollout available.';
  }
  
  return 'Unknown rollout type';
}

