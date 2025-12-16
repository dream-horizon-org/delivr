/**
 * Test Platform Types and Enum
 * 
 * Defines valid test platforms:
 * - IOS: iOS platform (covers App Store, TestFlight, etc.)
 * - ANDROID: Android platform (covers Play Store, Internal Testing, etc.)
 * 
 * These values are stored in JSON format in test_management_configs table.
 */

export enum TestPlatform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB'
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
  [TestPlatform.IOS]: 'iOS',
  [TestPlatform.ANDROID]: 'Android',
  [TestPlatform.WEB]: 'Web'
};


