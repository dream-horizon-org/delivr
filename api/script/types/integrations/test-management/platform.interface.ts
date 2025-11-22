/**
 * Test Platform Types and Enum
 * 
 * Defines valid test platforms as combinations of Delivr's platforms and targets:
 * - IOS_APP_STORE: iOS platform + App Store target
 * - ANDROID_PLAY_STORE: Android platform + Play Store target
 * - IOS_TESTFLIGHT: iOS platform + TestFlight target
 * - ANDROID_INTERNAL_TESTING: Android platform + Internal Testing target
 * 
 * These values are stored in JSON format in test_management_configs table.
 */

export enum TestPlatform {
  IOS_APP_STORE = 'IOS_APP_STORE',
  ANDROID_PLAY_STORE = 'ANDROID_PLAY_STORE',
  IOS_TESTFLIGHT = 'IOS_TESTFLIGHT',
  ANDROID_INTERNAL_TESTING = 'ANDROID_INTERNAL_TESTING'
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
  [TestPlatform.IOS_APP_STORE]: 'iOS (App Store)',
  [TestPlatform.ANDROID_PLAY_STORE]: 'Android (Play Store)',
  [TestPlatform.IOS_TESTFLIGHT]: 'iOS (TestFlight)',
  [TestPlatform.ANDROID_INTERNAL_TESTING]: 'Android (Internal Testing)'
};


