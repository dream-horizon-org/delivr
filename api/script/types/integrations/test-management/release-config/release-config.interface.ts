// Type definitions for release config test management configuration
// Combines integration selection + platform-specific parameters
// One configuration per release config (1:1 mapping)

// Platform-specific test parameters
export interface PlatformTestParameters {
  [key: string]: unknown; // Provider-specific parameters
}

// Checkmate-specific platform parameters (for type safety)
export interface CheckmatePlatformParameters extends PlatformTestParameters {
  projectId: number;
  sectionIds?: number[];
  labelIds?: number[];
  squadIds?: number[];
  platformId?: number;
  filterType?: 'and' | 'or';
}

// Platform configuration with parameters
export interface PlatformConfiguration {
  platform: string; // "ios", "android-web", "tvos", etc.
  parameters: PlatformTestParameters;
}

// Main entity interface
export interface ReleaseConfigTestManagement {
  id: string;
  releaseConfigId: string; // Unique - one config per release config
  integrationId: string;
  passThresholdPercent: number; // e.g., 70 means 70% tests must pass
  platformConfigurations: PlatformConfiguration[];
  createdByAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs for API operations
export interface SetReleaseConfigTestManagementDto {
  releaseConfigId: string;
  integrationId: string;
  passThresholdPercent: number;
  platformConfigurations: PlatformConfiguration[];
  createdByAccountId?: string;
}

export interface UpdateReleaseConfigTestManagementDto {
  integrationId?: string;
  passThresholdPercent?: number;
  platformConfigurations?: PlatformConfiguration[];
}

// Query filters
export interface FindReleaseConfigTestManagementFilter {
  releaseConfigId?: string;
  integrationId?: string;
}

// Extended response with integration details
export interface ReleaseConfigTestManagementWithIntegration extends ReleaseConfigTestManagement {
  integration: {
    id: string;
    name: string;
    providerType: string;
  };
}

// Test status with threshold evaluation
export interface TestStatusWithThreshold {
  platform: string;
  runId: string;
  status: string;
  total: number;
  passed: number;
  failed: number;
  untested: number;
  blocked: number;
  inProgress: number;
  url: string;
  passPercentage: number; // Calculated: (passed / total) * 100
  meetsThreshold: boolean; // true if passPercentage >= passThresholdPercent
  readyForApproval: boolean; // true if status is COMPLETED and meetsThreshold
}

