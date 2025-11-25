export const BUILD_UPLOAD_ERROR_MESSAGES = {
  ARTIFACT_REQUIRED: 'Build upload failed: artifact file is required',
  INVALID_TENANT_ID: 'Build upload failed: tenantId is required',
  INVALID_RELEASE_ID: 'Build upload failed: releaseId is required',
  INVALID_VERSION_NAME: 'Build upload failed: artifact_version_name is required',
  INVALID_VERSION_CODE: 'Build upload failed: artifact_version_code is required',
  INVALID_PLATFORM: 'Build upload failed: platform must be ANDROID',
  INVALID_STORE_TYPE: 'Build upload failed: storeType is required',
  S3_UPLOAD_FAILED: 'Build upload failed: could not upload artifact to storage',
  DB_SAVE_FAILED: 'Build upload failed: could not save build record'
} as const;

export const BUILD_UPLOAD_SUCCESS_MESSAGES = {
  UPLOAD_COMPLETED: 'Build uploaded successfully'
} as const;

export const BUILD_UPLOAD_STATUS = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
  FAILED: 'FAILED'
} as const;

export const BUILD_TYPE = {
  MANUAL: 'MANUAL',
  CI_CD: 'CI_CD'
} as const;


