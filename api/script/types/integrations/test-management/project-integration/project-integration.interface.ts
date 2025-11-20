// Type definitions for project-level test management integrations
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
export type ProjectTestManagementIntegrationConfig = {
  baseUrl: string;
  authToken: string;
  [key: string]: unknown; // Allow provider-specific additional fields
};

// Main entity type
export type ProjectTestManagementIntegration = {
  id: string;
  projectId: string;
  name: string;
  providerType: TestManagementProviderType;
  config: ProjectTestManagementIntegrationConfig;
  createdByAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// DTOs for API operations
export type CreateProjectTestManagementIntegrationDto = {
  projectId: string;
  name: string;
  providerType: TestManagementProviderType;
  config: ProjectTestManagementIntegrationConfig;
  createdByAccountId?: string;
};

export type UpdateProjectTestManagementIntegrationDto = {
  name?: string;
  config?: Partial<ProjectTestManagementIntegrationConfig>;
};

export type VerifyProjectTestManagementIntegrationResult = {
  success: boolean;
  status: VerificationStatus;
  message: string;
  error?: string;
};

// Query filters
export type FindProjectIntegrationsFilter = {
  projectId: string;
  providerType?: TestManagementProviderType;
};

