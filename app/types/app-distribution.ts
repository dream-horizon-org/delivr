/**
 * App Distribution Integration Types
 * Aligned with backend API structure at /integrations/store/*
 */

export type StoreType = 'play_store' | 'app_store';
export type Platform = 'ANDROID' | 'IOS';
export type VerificationStatus = 'PENDING' | 'VALID' | 'INVALID';

// Main integration interface (matches backend response)
export interface AppDistributionIntegration {
  integrationId: string;
  storeType: StoreType;
  tenantId: string;
  userId: string;
  platforms: Platform[]; // User-selected platforms
  status: VerificationStatus;
  payload: PlayStorePayload | AppStorePayload;
  createdAt?: string;
  updatedAt?: string;
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
  defaultTrack: 'internal' | 'alpha' | 'beta' | 'production';
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

// API Request Types (matches backend /integrations/store/connect)
export interface ConnectStoreRequest {
  storeType: StoreType;
  tenantId: string;
  userId: string;
  platforms: Platform[]; // NEW: User-selected platforms
  payload: PlayStorePayload | AppStorePayload;
}

// API Response Types (matches backend)
export interface ConnectStoreResponse {
  success: boolean;
  data?: {
    integrationId: string;
    status: VerificationStatus;
  };
  error?: string;
  message?: string;
}

export interface VerifyStoreRequest {
  storeType: StoreType;
  tenantId: string;
  userId: string;
  payload: Partial<PlayStorePayload> | Partial<AppStorePayload>;
}

export interface VerifyStoreResponse {
  success: boolean;
  verified?: boolean;
  message?: string;
  details?: any;
  error?: string;
}

export interface ListDistributionsResponse {
  success: boolean;
  integrations?: AppDistributionIntegration[];
  error?: string;
}

// ============================================================================
// System Metadata Constants
// These are used by the BFF to enrich system metadata response
// IMPORTANT: Keep in sync with backend integration IDs (play_store, app_store)
// ============================================================================

// Allowed platforms per store type (matches backend logic)
export const ALLOWED_PLATFORMS: Record<string, string[]> = {
  play_store: ['ANDROID'],
  app_store: ['IOS'],
  firebase: ['ANDROID', 'IOS', 'WEB'],
};

// Store type metadata (matches SystemMetadataBackend.appDistribution.availableStoreTypes)
export interface StoreTypeMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  allowedPlatforms: string[];
  requiresCredentials: boolean;
}

// IMPORTANT: IDs must match backend integration provider IDs
// These are returned in SystemMetadataBackend.releaseManagement.integrations.APP_DISTRIBUTION
export const STORE_TYPES: StoreTypeMetadata[] = [
  {
    id: 'play_store',
    name: 'Google Play Store',
    description: 'Distribute Android apps to Google Play Store',
    icon: 'play-store',
    allowedPlatforms: ['ANDROID'],
    requiresCredentials: true,
  },
  {
    id: 'app_store',
    name: 'Apple App Store',
    description: 'Distribute iOS apps to Apple App Store',
    icon: 'app-store',
    allowedPlatforms: ['IOS'],
    requiresCredentials: true,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

// Helper to get store type from platform
export function getStoreTypeForPlatform(platform: Platform): StoreType | null {
  switch (platform) {
    case 'ANDROID':
      return 'play_store';
    case 'IOS':
      return 'app_store';
    default:
      return null;
  }
}

// Helper to get display name
export function getStoreDisplayName(storeType: StoreType): string {
  const metadata = STORE_TYPES.find(s => s.id === storeType);
  return metadata?.name || storeType;
}

// New interfaces for BFF layer
export interface AppDistributionConnectRequest {
  storeType: StoreType;
  platforms: Platform[];
  payload: PlayStorePayload | AppStorePayload;
}

export interface AppDistributionVerifyRequest {
  storeType: StoreType;
  payload: Partial<PlayStorePayload> | Partial<AppStorePayload>;
}

export interface AppDistributionResponse {
  success: boolean;
  data?: {
    integrationId: string;
    status: VerificationStatus;
  };
  error?: string;
  message?: string;
}

export interface AppDistributionVerifyResponse {
  success: boolean;
  verified?: boolean;
  message?: string;
  details?: any;
  error?: string;
}

export interface AppDistributionListResponse {
  success: boolean;
  data?: AppDistributionIntegration[];
  error?: string;
}

