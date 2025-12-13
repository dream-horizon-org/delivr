/**
 * Store Integration Types
 * 
 * Defines TypeScript interfaces and enums for store integrations
 * (App Store Connect, Google Play, TestFlight, etc.)
 */

export enum StoreType {
  APP_STORE = 'APP_STORE',
  PLAY_STORE = 'PLAY_STORE',
  TESTFLIGHT = 'TESTFLIGHT',
  MICROSOFT_STORE = 'MICROSOFT_STORE',
  FIREBASE = 'FIREBASE'
}

export enum IntegrationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REVOKED = 'REVOKED'
}

export enum CredentialType {
  APPLE_API_KEY = 'APPLE_API_KEY',
  GOOGLE_SERVICE_ACCOUNT = 'GOOGLE_SERVICE_ACCOUNT',
  MICROSOFT_PARTNER_CENTER = 'MICROSOFT_PARTNER_CENTER',
  CUSTOM = 'CUSTOM'
}

export enum DefaultTrack {
  PRODUCTION = 'PRODUCTION',
  BETA = 'BETA',
  ALPHA = 'ALPHA',
  INTERNAL = 'INTERNAL',
  TESTFLIGHT = 'TESTFLIGHT'
}

/**
 * Store Integration (matches DB schema)
 */
export interface StoreIntegration {
  id: string;
  tenantId: string;
  storeType: StoreType;
  platform: 'ANDROID' | 'IOS';
  displayName: string;
  appIdentifier: string;
  targetAppId: string | null;
  defaultLocale: string | null;
  teamName: string | null;
  defaultTrack: DefaultTrack | null;
  status: IntegrationStatus;
  lastVerifiedAt: Date | null;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Store Credential (matches DB schema)
 */
export interface StoreCredential {
  id: string;
  integrationId: string;
  credentialType: CredentialType;
  encryptedPayload: Buffer;
  encryptionScheme: string;
  rotatedAt: Date | null;
  createdAt: Date;
}

/**
 * Safe Store Integration (without sensitive data)
 */
export interface SafeStoreIntegration extends Omit<StoreIntegration, 'createdByAccountId'> {
  hasCredentials?: boolean;
}

/**
 * Create Store Integration DTO
 */
export interface CreateStoreIntegrationDto {
  tenantId: string;
  storeType: StoreType;
  platform: 'ANDROID' | 'IOS';
  displayName: string;
  appIdentifier: string;
  targetAppId?: string | null;
  defaultLocale?: string | null;
  teamName?: string | null;
  defaultTrack?: DefaultTrack | null;
  createdByAccountId: string;
}

/**
 * Update Store Integration DTO
 */
export interface UpdateStoreIntegrationDto {
  platform?: 'ANDROID' | 'IOS';
  displayName?: string;
  appIdentifier?: string;
  targetAppId?: string | null;
  defaultLocale?: string | null;
  teamName?: string | null;
  defaultTrack?: DefaultTrack | null;
  status?: IntegrationStatus;
}

/**
 * Create Store Credential DTO
 */
export interface CreateStoreCredentialDto {
  integrationId: string;
  credentialType: CredentialType;
  encryptedPayload: Buffer;
  encryptionScheme?: string;
}

/**
 * Store Integration Filters
 */
export interface StoreIntegrationFilters {
  tenantId?: string;
  storeType?: StoreType;
  platform?: 'ANDROID' | 'IOS';
  status?: IntegrationStatus;
  appIdentifier?: string;
}

/**
 * App Store Connect Payload (for API requests)
 */
export interface AppStoreConnectPayload {
  displayName: string;
  targetAppId?: string;
  appIdentifier: string;
  issuerId: string;
  keyId: string;
  privateKeyPem: string;
  teamName?: string;
  defaultLocale?: string;
}

/**
 * Google Play Store Payload (for API requests)
 */
export interface GooglePlayStorePayload {
  displayName: string;
  appIdentifier: string;
  serviceAccountJson: {
    type: string;
    project_id?: string; // Optional for verification, but always present in service account JSON
    client_email: string;
    private_key: string;
    // Optional fields that may be present in service account JSON
    private_key_id?: string;
    client_id?: string;
    auth_uri?: string;
    token_uri?: string;
    auth_provider_x509_cert_url?: string;
    client_x509_cert_url?: string;
  };
  defaultTrack?: DefaultTrack;
}

/**
 * Connect Store Request Body
 */
export interface ConnectStoreRequestBody {
  storeType: StoreType;
  platform: 'ANDROID' | 'IOS' | 'android' | 'ios';
  tenantId: string;
  payload: AppStoreConnectPayload | GooglePlayStorePayload;
}

/**
 * Connect Store Response
 */
export interface ConnectStoreResponse {
  integrationId: string;
  status: IntegrationStatus;
}

/**
 * Validation helpers for store type and track combinations
 */
export const VALID_TRACKS_BY_STORE_TYPE = {
  [StoreType.APP_STORE]: [DefaultTrack.PRODUCTION, DefaultTrack.BETA, DefaultTrack.ALPHA, DefaultTrack.INTERNAL, DefaultTrack.TESTFLIGHT],
  [StoreType.TESTFLIGHT]: [DefaultTrack.PRODUCTION, DefaultTrack.BETA, DefaultTrack.ALPHA, DefaultTrack.INTERNAL, DefaultTrack.TESTFLIGHT],
  [StoreType.PLAY_STORE]: [DefaultTrack.PRODUCTION, DefaultTrack.BETA, DefaultTrack.ALPHA, DefaultTrack.INTERNAL],
  [StoreType.MICROSOFT_STORE]: [DefaultTrack.PRODUCTION, DefaultTrack.BETA, DefaultTrack.ALPHA, DefaultTrack.INTERNAL],
  [StoreType.FIREBASE]: [DefaultTrack.PRODUCTION, DefaultTrack.BETA, DefaultTrack.ALPHA, DefaultTrack.INTERNAL],
} as const;

/**
 * Check if a defaultTrack is valid for a given storeType
 */
export const isValidTrackForStoreType = (storeType: StoreType, defaultTrack: DefaultTrack | null): boolean => {
  if (defaultTrack === null) {
    return true; // NULL is always valid
  }
  
  const validTracks = VALID_TRACKS_BY_STORE_TYPE[storeType];
  const trackIsValid = (validTracks as readonly DefaultTrack[]).includes(defaultTrack);
  return trackIsValid;
};

/**
 * Get error message for invalid track/storeType combination
 */
export const getInvalidTrackErrorMessage = (storeType: StoreType, defaultTrack: DefaultTrack): string => {
  const validTracks = VALID_TRACKS_BY_STORE_TYPE[storeType];
  const validTracksList = validTracks.join(', ');
  return `Invalid defaultTrack "${defaultTrack}" for storeType "${storeType}". Valid tracks are: ${validTracksList}`;
};

/**
 * Map store type from API format (lowercase) to enum
 */
export const mapStoreTypeFromApi = (storeType: string): StoreType => {
  const storeTypeLower = storeType.toLowerCase();
  const storeTypeMap: Record<string, StoreType> = {
    'app_store': StoreType.APP_STORE,
    'play_store': StoreType.PLAY_STORE,
    'testflight': StoreType.TESTFLIGHT,
    'microsoft_store': StoreType.MICROSOFT_STORE,
    'firebase': StoreType.FIREBASE,
  };
  return storeTypeMap[storeTypeLower] || StoreType.APP_STORE;
};

/**
 * Upload AAB to Play Store Request
 */
export interface UploadAabToPlayStoreRequest {
  tenantId: string;
  storeType: string; // 'play_store'
  platform: string; // 'ANDROID'
  versionName: string;
  releaseNotes?: string;
}

/**
 * Upload AAB to Play Store Response
 */
export interface UploadAabToPlayStoreResponse {
  versionCode: number;
  versionSpecificUrl: string; // "https://play.google.com/apps/test/{packageName}/{versionCode}"
  packageName: string;
  versionName: string;
}

