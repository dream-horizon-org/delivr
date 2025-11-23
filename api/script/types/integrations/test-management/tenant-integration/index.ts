// Export enum-like consts as both values and types
export { TestManagementProviderType, VerificationStatus } from './tenant-integration.interface';

// Export only types
export type {
  CreateTenantTestManagementIntegrationDto, FindTenantIntegrationsFilter, TenantTestManagementIntegration,
  TenantTestManagementIntegrationConfig,
  TestManagementProviderType as TestManagementProviderTypeType, UpdateTenantTestManagementIntegrationDto, // Type alias for backwards compat
  VerificationStatus as VerificationStatusType, VerifyTenantTestManagementIntegrationResult
} from './tenant-integration.interface';

