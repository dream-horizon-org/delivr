// Type definitions for tenant-level test management integrations
// Strict typing - no 'any' types, explicit type definitions

// Enum-like const object pattern - provides both type AND value
// Values are lowercase to match URL paths (e.g., /integrations/:id/checkmate/metadata/...)
const TestManagementProviderTypeValues = {
  CHECKMATE: 'checkmate',
  TESTRAIL: 'testrail',
  XRAY: 'xray',
  ZEPHYR: 'zephyr'
} as const;

export type TestManagementProviderType = typeof TestManagementProviderTypeValues[keyof typeof TestManagementProviderTypeValues];
export const TestManagementProviderType = TestManagementProviderTypeValues;

// Enum-like const object pattern - provides both type AND value
const VerificationStatusValues = {
  PENDING: 'PENDING',
  VALID: 'VALID',
  INVALID: 'INVALID',
  ERROR: 'ERROR'
} as const;

export type VerificationStatus = typeof VerificationStatusValues[keyof typeof VerificationStatusValues];
export const VerificationStatus = VerificationStatusValues;

// Base configuration type - provider-specific
export type TenantTestManagementIntegrationConfig = {
  baseUrl: string;
  authToken: string;
  [key: string]: unknown; // Allow provider-specific additional fields
};

// Main entity type
export type TenantTestManagementIntegration = {
  id: string;
  tenantId: string;
  name: string;
  providerType: TestManagementProviderType;
  config: TenantTestManagementIntegrationConfig;
  createdByAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// DTOs for API operations
export type CreateTenantTestManagementIntegrationDto = {
  tenantId: string;
  name: string;
  providerType: TestManagementProviderType;
  config: TenantTestManagementIntegrationConfig;
  createdByAccountId?: string;
};

export type UpdateTenantTestManagementIntegrationDto = {
  name?: string;
  config?: Partial<TenantTestManagementIntegrationConfig>;
};

export type VerifyTenantTestManagementIntegrationResult = {
  success: boolean;
  status: VerificationStatus;
  message: string;
  error?: string;
  details?: any;
};

// Query filters
export type FindTenantIntegrationsFilter = {
  tenantId: string;
  providerType?: TestManagementProviderType;
};

