/**
 * TestFlight Build Verification Constants
 * 
 * Error messages and constants for TestFlight build verification via App Store Connect API
 */

export const TESTFLIGHT_BUILD_ERROR_MESSAGES = {
  BUILD_NOT_FOUND: 'TestFlight build not found in App Store Connect',
  VERSION_MISMATCH: 'Version mismatch with App Store Connect',
  VERSION_MISMATCH_WITH_RELEASE: 'Version does not match iOS App Store version in release configuration',
  RELEASE_NOT_FOUND: 'Release not found',
  RELEASE_TENANT_MISMATCH: 'Release does not belong to the specified tenant',
  IOS_RELEASE_NOT_FOUND: 'No iOS App Store configuration found for release',
  STORE_INTEGRATION_NOT_FOUND: 'App Store Connect integration not found for tenant',
  STORE_INTEGRATION_INVALID: 'App Store Connect integration is not verified or invalid',
  APP_STORE_CONNECT_ERROR: 'Error communicating with App Store Connect API',
  TESTFLIGHT_NUMBER_REQUIRED: 'testflightBuildNumber is required',
  VERSION_NAME_REQUIRED: 'versionName is required',
  RELEASE_ID_REQUIRED: 'releaseId is required',
  RELEASE_UPLOADS_REPO_NOT_INITIALIZED: 'Release uploads repository not initialized',
  PLATFORM_MAPPING_NOT_FOUND: 'Platform mapping not found for iOS',
  FAILED_TO_STAGE_TESTFLIGHT_BUILD: 'Failed to stage TestFlight build',
} as const;

export const TESTFLIGHT_BUILD_SUGGESTIONS = {
  BUILD_NOT_FOUND: 'Verify build number and ensure it was uploaded to TestFlight',
  VERSION_MISMATCH: 'Ensure the TestFlight build version matches the provided version',
  VERSION_MISMATCH_WITH_RELEASE: 'Check the iOS App Store version in your release configuration',
  RELEASE_NOT_FOUND: 'Verify the releaseId is correct',
  RELEASE_TENANT_MISMATCH: 'Verify you are using the correct tenant context for this release',
  IOS_RELEASE_NOT_FOUND: 'Add iOS App Store as a target platform in your release configuration',
  STORE_INTEGRATION_NOT_FOUND: 'Connect your App Store Connect account in tenant settings',
  STORE_INTEGRATION_INVALID: 'Re-verify your App Store Connect credentials',
} as const;

/**
 * App Store Connect API endpoints
 */
export const APP_STORE_CONNECT_API = {
  BASE_URL: 'https://api.appstoreconnect.apple.com/v1',
} as const;

/**
 * HTTP timeout for App Store Connect API calls (in milliseconds)
 */
export const APP_STORE_CONNECT_TIMEOUTS = {
  BUILD_LOOKUP: 15000,
} as const;

