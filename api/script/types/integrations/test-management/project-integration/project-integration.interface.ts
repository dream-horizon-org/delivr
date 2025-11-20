// Type definitions for project-level test management integrations
// Strict typing - no 'any' types, explicit type definitions

// Enum-like const object pattern - provides both type AND value
const TestManagementProviderTypeValues = {
  CHECKMATE: 'CHECKMATE',
  TESTRAIL: 'TESTRAIL',
  XRAY: 'XRAY',
  ZEPHYR: 'ZEPHYR'
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

// Base configuration interface - provider-specific
export interface ProjectTestManagementIntegrationConfig {
  baseUrl: string;
  authToken: string;
  [key: string]: unknown; // Allow provider-specific additional fields
}

// Main entity interface
export interface ProjectTestManagementIntegration {
  id: string;
  projectId: string;
  name: string;
  providerType: TestManagementProviderType;
  config: ProjectTestManagementIntegrationConfig;
  createdByAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs for API operations
export interface CreateProjectTestManagementIntegrationDto {
  projectId: string;
  name: string;
  providerType: TestManagementProviderType;
  config: ProjectTestManagementIntegrationConfig;
  createdByAccountId?: string;
}

export interface UpdateProjectTestManagementIntegrationDto {
  name?: string;
  config?: Partial<ProjectTestManagementIntegrationConfig>;
}

export interface VerifyProjectTestManagementIntegrationResult {
  success: boolean;
  status: VerificationStatus;
  message: string;
  error?: string;
}

// Query filters
export interface FindProjectIntegrationsFilter {
  projectId: string;
  providerType?: TestManagementProviderType;
}

