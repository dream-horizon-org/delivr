/**
 * Error messages for build artifact download operations
 */
export const BUILD_ARTIFACT_DOWNLOAD_ERROR_MESSAGES = {
  INVALID_BUILD_ID: 'Build ID is required and must be a valid string',
  INVALID_TENANT_ID: 'Tenant ID is required and must be a valid string',
  BUILD_NOT_FOUND: 'Build not found or does not belong to this tenant',
  ARTIFACT_NOT_AVAILABLE: 'Artifact not available for this build',
  PRESIGNED_URL_FAILED: 'Failed to generate download URL'
} as const;

/**
 * Error codes for build artifact download operations
 */
export const BUILD_ARTIFACT_DOWNLOAD_ERROR_CODES = {
  BUILD_NOT_FOUND: 'BUILD_NOT_FOUND',
  ARTIFACT_NOT_AVAILABLE: 'ARTIFACT_NOT_AVAILABLE',
  PRESIGNED_URL_FAILED: 'PRESIGNED_URL_FAILED'
} as const;

