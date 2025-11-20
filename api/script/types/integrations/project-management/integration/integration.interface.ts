/**
 * Project Management Provider Types
 */
export enum ProjectManagementProviderType {
  JIRA = 'JIRA',
  LINEAR = 'LINEAR',
  ASANA = 'ASANA',
  MONDAY = 'MONDAY',
  CLICKUP = 'CLICKUP'
}

export const PROJECT_MANAGEMENT_PROVIDER_TYPES = Object.values(
  ProjectManagementProviderType
) as ProjectManagementProviderType[];

export enum VerificationStatus {
  NOT_VERIFIED = 'NOT_VERIFIED',
  VALID = 'VALID',
  INVALID = 'INVALID',
  EXPIRED = 'EXPIRED'
}

/**
 * Base configuration interface - provider-specific
 */
export type ProjectManagementIntegrationConfig = {
  baseUrl: string;
  [key: string]: unknown; // Allow provider-specific fields
};

/**
 * JIRA-specific configuration
 */
export type JiraIntegrationConfig = ProjectManagementIntegrationConfig & {
  apiToken: string;
  email: string;
  jiraType: 'CLOUD' | 'SERVER' | 'DATA_CENTER';
};

/**
 * Linear-specific configuration (future)
 */
export type LinearIntegrationConfig = ProjectManagementIntegrationConfig & {
  apiKey: string;
  teamId: string;
};

/**
 * Main Integration Entity
 */
export type ProjectManagementIntegration = {
  id: string;
  projectId: string;
  name: string;
  providerType: ProjectManagementProviderType;
  config: ProjectManagementIntegrationConfig;
  isEnabled: boolean;
  verificationStatus: VerificationStatus;
  lastVerifiedAt: Date | null;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * DTOs
 */
export type CreateProjectManagementIntegrationDto = {
  projectId: string;
  name: string;
  providerType: ProjectManagementProviderType;
  config: ProjectManagementIntegrationConfig;
  createdByAccountId?: string;
};

export type UpdateProjectManagementIntegrationDto = {
  name?: string;
  config?: Partial<ProjectManagementIntegrationConfig>;
  isEnabled?: boolean;
};

export type VerifyProjectManagementIntegrationResult = {
  success: boolean;
  status: VerificationStatus;
  message: string;
  error?: string;
};

