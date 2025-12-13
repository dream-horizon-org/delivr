/**
 * TestFlight Build Verification Constants
 * 
 * Error messages and constants for TestFlight build verification via App Store Connect API
 */

export const TESTFLIGHT_BUILD_ERROR_MESSAGES = {
  BUILD_NOT_FOUND: 'TestFlight build not found in App Store Connect',
  BUILD_PROCESSING: 'TestFlight build is still processing',
  VERSION_MISMATCH: 'TestFlight version does not match release version',
  VERSION_MISMATCH_WITH_RELEASE: 'Version does not match iOS App Store version in release configuration',
  BUILD_ALREADY_EXISTS: 'iOS build already verified for this release',
  RELEASE_NOT_FOUND: 'Release not found',
  IOS_RELEASE_NOT_FOUND: 'iOS App Store platform not configured for this release',
  IOS_PLATFORM_NOT_CONFIGURED: 'iOS platform is not configured for this release',
  STORE_INTEGRATION_NOT_FOUND: 'App Store Connect integration not found for tenant',
  STORE_INTEGRATION_INVALID: 'App Store Connect integration is not verified or invalid',
  APP_STORE_CONNECT_ERROR: 'Error communicating with App Store Connect API',
  TESTFLIGHT_NUMBER_REQUIRED: 'testflightBuildNumber is required',
  VERSION_NAME_REQUIRED: 'versionName is required',
  RELEASE_ID_REQUIRED: 'releaseId is required',
} as const;

export const TESTFLIGHT_BUILD_SUCCESS_MESSAGES = {
  BUILD_VERIFIED: 'TestFlight build verified successfully',
} as const;

export const TESTFLIGHT_BUILD_SUGGESTIONS = {
  BUILD_NOT_FOUND: 'Verify build number and ensure it was uploaded to TestFlight',
  BUILD_PROCESSING: 'Wait for Apple to finish processing, then try again',
  VERSION_MISMATCH: 'Ensure the TestFlight build version matches the release version',
  VERSION_MISMATCH_WITH_RELEASE: 'Check the iOS App Store version in your release configuration and ensure it matches the build version',
  IOS_RELEASE_NOT_FOUND: 'Ensure your release includes iOS App Store as a target platform',
  STORE_INTEGRATION_NOT_FOUND: 'Connect your App Store Connect account in tenant settings',
  STORE_INTEGRATION_INVALID: 'Re-verify your App Store Connect credentials',
} as const;

/**
 * App Store Connect API endpoints
 */
export const APP_STORE_CONNECT_API = {
  BASE_URL: 'https://api.appstoreconnect.apple.com/v1',
  BUILDS_ENDPOINT: '/builds',
  APPS_ENDPOINT: '/apps',
} as const;

/**
 * Build processing states from App Store Connect
 */
export const APP_STORE_CONNECT_PROCESSING_STATES = {
  PROCESSING: 'PROCESSING',
  FAILED: 'FAILED',
  INVALID: 'INVALID',
  VALID: 'VALID',
} as const;

/**
 * HTTP timeout for App Store Connect API calls (in milliseconds)
 */
export const APP_STORE_CONNECT_TIMEOUTS = {
  DEFAULT: 30000,
  BUILD_LOOKUP: 15000,
} as const;

/**
 * TestFlight link base URL template
 */
export const TESTFLIGHT_LINK_BASE = 'https://testflight.apple.com/join/';

