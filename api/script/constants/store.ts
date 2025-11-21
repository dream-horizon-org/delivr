export const ERROR_MESSAGES = {
  STORE_TYPE_REQUIRED: 'storeType is required',
  TENANT_ID_REQUIRED: 'tenantId is required',
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

