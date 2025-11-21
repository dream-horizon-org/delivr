/**
 * App Distribution Integration Types
 * Aligned with backend API structure at /integrations/store/*
 */

// Store types match backend enum (UPPERCASE)
export type StoreType = 'APP_STORE' | 'PLAY_STORE' | 'TESTFLIGHT' | 'FIREBASE' | 'MICROSOFT_STORE';

export type Platform = 'ANDROID' | 'IOS';

// Status values match backend enum
export type IntegrationStatus = 'PENDING' | 'VERIFIED' | 'REVOKED';

// Track values match backend enum (UPPERCASE)
export type DefaultTrack = 'PRODUCTION' | 'BETA' | 'ALPHA' | 'INTERNAL' | 'TESTFLIGHT';

// Main integration interface (matches backend response)
export interface AppDistributionIntegration {
  integrationId: string;
  storeType: StoreType;
  tenantId: string;
  platform: Platform; // Backend uses singular
  status: IntegrationStatus;
  displayName: string;
  appIdentifier: string;
  targetAppId?: string | null;
  defaultLocale?: string | null;
  teamName?: string | null;
  defaultTrack?: DefaultTrack | null;
  lastVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Play Store Payload (matches backend)
export interface PlayStorePayload {
  displayName: string;
  appIdentifier: string; // Package name (e.g., com.example.app)
  serviceAccountJson: {
    type: string;
    project_id: string;
    client_email: string;
    private_key: string;
  };
  defaultTrack?: DefaultTrack;
}

// App Store Payload (matches backend)
export interface AppStorePayload {
  displayName: string;
  targetAppId: string;
  appIdentifier: string; // Bundle ID (e.g., com.example.app)
  issuerId: string;
  keyId: string;
  privateKeyPem: string;
  teamName: string;
  defaultLocale: string;
}

// API Request Types (matches backend /integrations/store/*)
export interface VerifyStoreRequest {
  storeType: StoreType;
  tenantId: string;
  platform: Platform; // Singular, not array
  userId: string;
  payload: Partial<PlayStorePayload> | Partial<AppStorePayload>;
}

export interface ConnectStoreRequest {
  storeType: StoreType;
  tenantId: string;
  platform: Platform; // Singular, not array
  userId: string;
  payload: PlayStorePayload | AppStorePayload;
}

// API Response Types (matches backend)
export interface VerifyStoreResponse {
  success: boolean;
  verified?: boolean;
  message?: string;
  details?: any;
  error?: string;
}

export interface ConnectStoreResponse {
  success: boolean;
  data?: {
    integrationId: string;
    status: IntegrationStatus;
  };
  error?: string;
  message?: string;
}

// List response is grouped by platform
export interface ListDistributionsResponse {
  success: boolean;
  data?: {
    IOS?: AppDistributionIntegration[];
    ANDROID?: AppDistributionIntegration[];
  };
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

// Map store type ID from system metadata to display name
export function getStoreDisplayName(storeType: StoreType): string {
  const names: Record<StoreType, string> = {
    APP_STORE: 'Apple App Store',
    PLAY_STORE: 'Google Play Store',
    TESTFLIGHT: 'TestFlight',
    FIREBASE: 'Firebase App Distribution',
    MICROSOFT_STORE: 'Microsoft Store',
  };
  return names[storeType] || storeType;
}

// Map platform to default store type
export function getDefaultStoreTypeForPlatform(platform: Platform): StoreType | null {
  switch (platform) {
    case 'ANDROID':
      return 'PLAY_STORE';
    case 'IOS':
      return 'APP_STORE';
    default:
      return null;
  }
}

