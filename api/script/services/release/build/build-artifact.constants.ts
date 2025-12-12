/**
 * Build Artifact Service Constants
 * Domain-specific constants for build artifact operations
 */

/**
 * Error codes for build artifact operations
 */
export const BUILD_ARTIFACT_ERROR_CODE = {
  BUILD_NOT_FOUND: 'BUILD_NOT_FOUND',
  BUILD_NOT_FOUND_BY_ID: 'BUILD_NOT_FOUND_BY_ID',
  S3_UPLOAD_FAILED: 'S3_UPLOAD_FAILED',
  PRESIGNED_URL_FAILED: 'PRESIGNED_URL_FAILED',
  DB_CREATE_FAILED: 'DB_CREATE_FAILED',
  DB_UPDATE_FAILED: 'DB_UPDATE_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  STORE_DISTRIBUTION_FAILED: 'STORE_DISTRIBUTION_FAILED',
  TESTFLIGHT_VERIFICATION_FAILED: 'TESTFLIGHT_VERIFICATION_FAILED',
  TESTFLIGHT_NUMBER_INVALID: 'TESTFLIGHT_NUMBER_INVALID',
  VERSION_EXTRACTION_FAILED: 'VERSION_EXTRACTION_FAILED',
  PLAY_STORE_INTEGRATION_NOT_FOUND: 'PLAY_STORE_INTEGRATION_NOT_FOUND'
} as const;

/**
 * Error messages for build artifact operations
 * All messages include context about the build artifact domain
 */
export const BUILD_ARTIFACT_ERROR_MESSAGES = {
  BUILD_NOT_FOUND: 'Build not found for provided ci_run_id',
  BUILD_NOT_FOUND_BY_ID: 'Build not found for provided build_id',
  S3_UPLOAD_FAILED: 'Build upload failed: could not upload artifact to storage',
  PRESIGNED_URL_FAILED: 'Failed to generate presigned download URL',
  DB_CREATE_FAILED: 'Build upload failed: could not save build record',
  DB_UPDATE_FAILED: 'Build upload failed: could not update build record',
  DB_QUERY_FAILED: 'Failed to query build artifacts',
  STORE_DISTRIBUTION_FAILED: 'Failed to distribute AAB to internal track',
  TESTFLIGHT_VERIFICATION_FAILED: 'Failed to verify TestFlight build number',
  TESTFLIGHT_NUMBER_INVALID: 'TestFlight build number verification failed: build not found in TestFlight',
  VERSION_EXTRACTION_FAILED: 'Failed to extract version information from AAB file',
  PLAY_STORE_INTEGRATION_NOT_FOUND: 'Play Store integration not found for tenant. Please configure Play Store integration first.'
} as const;

/**
 * Success messages for build artifact operations
 */
export const BUILD_ARTIFACT_SUCCESS_MESSAGES = {
  UPLOAD_COMPLETED: 'Build artifact uploaded successfully',
  BUILD_CREATED: 'Build created successfully',
  ARTIFACTS_LISTED: 'Build artifacts retrieved successfully',
  TESTFLIGHT_VERIFIED: 'TestFlight build number verified and updated successfully'
} as const;

/**
 * Default configuration values for build artifact operations
 */
export const BUILD_ARTIFACT_DEFAULTS = {
  BUCKET_NAME: 'codepush-local-bucket',
  PRESIGNED_URL_EXPIRES_SECONDS: 3600  // 1 hour
} as const;

/**
 * File extension constants for build artifacts
 */
export const BUILD_ARTIFACT_FILE_EXTENSIONS = {
  AAB: '.aab'
} as const;

