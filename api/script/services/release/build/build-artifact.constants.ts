/**
 * Build Artifact Service Constants
 * Domain-specific constants for build artifact operations
 */

/**
 * Error codes for build artifact operations
 */
export const BUILD_ARTIFACT_ERROR_CODE = {
  BUILD_NOT_FOUND: 'BUILD_NOT_FOUND',
  S3_UPLOAD_FAILED: 'S3_UPLOAD_FAILED',
  PRESIGNED_URL_FAILED: 'PRESIGNED_URL_FAILED',
  DB_CREATE_FAILED: 'DB_CREATE_FAILED',
  DB_UPDATE_FAILED: 'DB_UPDATE_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED'
} as const;

/**
 * Error messages for build artifact operations
 * All messages include context about the build artifact domain
 */
export const BUILD_ARTIFACT_ERROR_MESSAGES = {
  BUILD_NOT_FOUND: 'Build not found for provided ci_run_id',
  S3_UPLOAD_FAILED: 'Build upload failed: could not upload artifact to storage',
  PRESIGNED_URL_FAILED: 'Failed to generate presigned download URL',
  DB_CREATE_FAILED: 'Build upload failed: could not save build record',
  DB_UPDATE_FAILED: 'Build upload failed: could not update build record',
  DB_QUERY_FAILED: 'Failed to query build artifacts'
} as const;

/**
 * Success messages for build artifact operations
 */
export const BUILD_ARTIFACT_SUCCESS_MESSAGES = {
  UPLOAD_COMPLETED: 'Build artifact uploaded successfully',
  BUILD_CREATED: 'Build created successfully',
  ARTIFACTS_LISTED: 'Build artifacts retrieved successfully'
} as const;

/**
 * Default configuration values for build artifact operations
 */
export const BUILD_ARTIFACT_DEFAULTS = {
  BUCKET_NAME: 'codepush-local-bucket',
  PRESIGNED_URL_EXPIRES_SECONDS: 3600  // 1 hour
} as const;

