// Export enum-like consts as both values and types
export { TestManagementProviderType, VerificationStatus } from './project-integration.interface';

// Export only types
export type {
  ProjectTestManagementIntegration,
  ProjectTestManagementIntegrationConfig,
  TestManagementProviderType as TestManagementProviderTypeType, // Type alias for backwards compat
  VerificationStatus as VerificationStatusType, // Type alias for backwards compat
  CreateProjectTestManagementIntegrationDto,
  UpdateProjectTestManagementIntegrationDto,
  FindProjectIntegrationsFilter,
  VerifyProjectTestManagementIntegrationResult
} from './project-integration.interface';
