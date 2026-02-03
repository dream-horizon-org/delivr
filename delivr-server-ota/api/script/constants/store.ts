export const ERROR_MESSAGES = {
  STORE_TYPE_REQUIRED: 'storeType is required',
  APP_ID_REQUIRED: 'appId is required',
  USER_ID_REQUIRED: 'userId is required',
  PAYLOAD_REQUIRED: 'payload is required',
  DISPLAY_NAME_REQUIRED: 'displayName is required',
  APP_IDENTIFIER_REQUIRED: 'appIdentifier is required',
  INVALID_STORE_TYPE: 'Invalid storeType. Must be one of: app_store, play_store, testflight, microsoft_store, firebase',
  INVALID_APP_STORE_PAYLOAD: 'Invalid App Store payload. Required: issuerId, keyId, privateKeyPem',
  INVALID_PLAY_STORE_PAYLOAD: 'Invalid Play Store payload. Required: serviceAccountJson',
  INTEGRATION_NOT_FOUND: 'Store integration not found',
  INTEGRATION_CREATE_FAILED: 'Failed to create store integration',
  INTEGRATION_UPDATE_FAILED: 'Failed to update store integration',
  INTEGRATION_DELETE_FAILED: 'Failed to delete store integration',
  CREDENTIAL_CREATE_FAILED: 'Failed to create credentials',
  CREDENTIAL_ENCRYPTION_FAILED: 'Failed to encrypt credentials',
  VERIFICATION_FAILED: 'Failed to verify store connection',
  VERIFICATION_UPDATE_FAILED: 'Failed to update verification status',
  INVALID_TRACK_FOR_STORE_TYPE: 'Invalid defaultTrack for storeType. TESTFLIGHT track is only valid for APP_STORE and TESTFLIGHT store types',
} as const;

export const SUCCESS_MESSAGES = {
  INTEGRATION_CREATED: 'Store integration created successfully',
  INTEGRATION_UPDATED: 'Store integration updated successfully',
  INTEGRATION_DELETED: 'Store integration deleted successfully',
  VERIFICATION_UPDATED: 'Verification status updated successfully',
} as const;

export const STORE_TYPE_MAP = {
  APP_STORE: 'app_store',
  PLAY_STORE: 'play_store',
  TESTFLIGHT: 'testflight',
  MICROSOFT_STORE: 'microsoft_store',
  FIREBASE: 'firebase',
} as const;

export const CREDENTIAL_TYPE_MAP = {
  APPLE_API_KEY: 'APPLE_API_KEY',
  GOOGLE_SERVICE_ACCOUNT: 'GOOGLE_SERVICE_ACCOUNT',
  MICROSOFT_PARTNER_CENTER: 'MICROSOFT_PARTNER_CENTER',
  CUSTOM: 'CUSTOM',
} as const;

export const ENCRYPTION_SCHEME = {
  DEFAULT: 'AES-256-GCM',
} as const;

export const PLAY_STORE_UPLOAD_CONSTANTS = {
  DEFAULT_RELEASE_NOTES: 'Release uploaded via API',
  INTERNAL_TRACK: 'internal',
  API_BASE_URL: 'https://androidpublisher.googleapis.com/androidpublisher/v3',
} as const;

/**
 * Google Play API track release status values
 * These are the status values returned by Google Play Console API for track releases
 */
export const GOOGLE_PLAY_RELEASE_STATUS = {
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
  HALTED: 'halted'
} as const;

export const GOOGLE_PLAY_RELEASE_STATUSES = Object.values(GOOGLE_PLAY_RELEASE_STATUS);
export type GooglePlayReleaseStatus = typeof GOOGLE_PLAY_RELEASE_STATUS[keyof typeof GOOGLE_PLAY_RELEASE_STATUS];

export const PLAY_STORE_UPLOAD_ERROR_MESSAGES = {
  INTEGRATION_NOT_FOUND_FOR_UPLOAD: 'Store integration not found for upload. Please ensure a Play Store integration exists for the specified tenant, storeType, and platform.',
  CREDENTIALS_NOT_FOUND: 'Credentials not found for store integration',
  AAB_FILE_REQUIRED: '.aab file is required in the request',
  INVALID_AAB_FILE: 'Invalid .aab file. File must have .aab extension',
  PLAY_STORE_UPLOAD_FAILED: 'Failed to upload .aab to Google Play Store',
  VERSION_NAME_REQUIRED: 'versionName is required',
  INTEGRATION_STATUS_REVOKED: 'Integration status is Revoked. Please verify the integration before uploading.',
  INTEGRATION_STATUS_PENDING: 'Integration status is Pending. Please verify the integration before uploading.',
  INTEGRATION_STATUS_INVALID: 'Integration status is invalid. Integration must be verified before uploading.',
  RELEASE_ID_REQUIRED: 'releaseId is required',
  RELEASE_NOT_FOUND: 'Release not found for the specified releaseId and appId',
  RELEASE_PLATFORM_TARGET_MAPPING_NOT_FOUND: 'Release platform target mapping not found for the specified releaseId, storeType, and platform',
  VERSION_MISMATCH: 'The artifact version does not match the release version. Please ensure the versionName matches the version configured for this release.',
} as const;

