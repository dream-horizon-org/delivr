// Type definitions for app-level test management integrations
// App types are primary; Tenant types kept as deprecated aliases for backward compatibility
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
export type AppTestManagementIntegrationConfig = {
  baseUrl: string;
  authToken: string;
  [key: string]: unknown; // Allow provider-specific additional fields
};

/**
 * @deprecated Use AppTestManagementIntegrationConfig instead
 * Kept for backward compatibility
 */
export type TenantTestManagementIntegrationConfig = AppTestManagementIntegrationConfig;

// Main entity type
export type AppTestManagementIntegration = {
  id: string;
  appId: string;
  name: string;
  providerType: TestManagementProviderType;
  config: AppTestManagementIntegrationConfig;
  createdByAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * @deprecated Use AppTestManagementIntegration instead
 * Kept for backward compatibility
 */
export type TenantTestManagementIntegration = AppTestManagementIntegration;

// DTOs for API operations
export type CreateAppTestManagementIntegrationDto = {
  appId: string;
  name: string;
  providerType: TestManagementProviderType;
  config: AppTestManagementIntegrationConfig;
  createdByAccountId?: string;
};

/**
 * @deprecated Use CreateAppTestManagementIntegrationDto instead
 * Kept for backward compatibility
 */
export type CreateTenantTestManagementIntegrationDto = CreateAppTestManagementIntegrationDto;

export type UpdateAppTestManagementIntegrationDto = {
  name?: string;
  config?: Partial<AppTestManagementIntegrationConfig>;
};

/**
 * @deprecated Use UpdateAppTestManagementIntegrationDto instead
 * Kept for backward compatibility
 */
export type UpdateTenantTestManagementIntegrationDto = UpdateAppTestManagementIntegrationDto;

export type VerifyAppTestManagementIntegrationResult = {
  success: boolean;
  status: VerificationStatus;
  message: string;
  error?: string;
};

/**
 * @deprecated Use VerifyAppTestManagementIntegrationResult instead
 * Kept for backward compatibility
 */
export type VerifyTenantTestManagementIntegrationResult = VerifyAppTestManagementIntegrationResult;

// Query filters
export type FindAppIntegrationsFilter = {
  appId: string;
  providerType?: TestManagementProviderType;
};

/**
 * @deprecated Use FindAppIntegrationsFilter instead
 * Kept for backward compatibility
 */
export type FindTenantIntegrationsFilter = FindAppIntegrationsFilter;
