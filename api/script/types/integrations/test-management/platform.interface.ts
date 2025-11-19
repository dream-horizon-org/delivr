/**
 * Test Platform Types and Enum
 * 
 * Defines valid test platforms as combinations of Delivr's platforms and targets:
 * - IOS: iOS platform + App Store target
 * - ANDROID_WEB: Android platform + Web target
 * - ANDROID_PLAYSTORE: Android platform + Play Store target
 * 
 * These values MUST match the database test_platform enum in migration 007.
 */

export enum TestPlatform {
  IOS = 'IOS',
  ANDROID_WEB = 'ANDROID_WEB',
  ANDROID_PLAYSTORE = 'ANDROID_PLAYSTORE'
}

/**
 * Array of all valid test platforms
 * Useful for validation and iteration
 */
export const TEST_PLATFORMS = Object.values(TestPlatform) as TestPlatform[];

/**
 * Human-readable platform names for UI display
 */
export const TEST_PLATFORM_DISPLAY_NAMES: Record<TestPlatform, string> = {
  [TestPlatform.IOS]: 'iOS (App Store)',
  [TestPlatform.ANDROID_WEB]: 'Android (Web)',
  [TestPlatform.ANDROID_PLAYSTORE]: 'Android (Play Store)'
};


