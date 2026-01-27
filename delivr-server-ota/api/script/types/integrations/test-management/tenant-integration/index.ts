// Export enum-like consts as both values and types
export { TestManagementProviderType, VerificationStatus } from './tenant-integration.interface';

// Export App types (primary) — defined in tenant-integration.interface.ts
export type {
  CreateAppTestManagementIntegrationDto,
  FindAppIntegrationsFilter,
  AppTestManagementIntegration,
  AppTestManagementIntegrationConfig,
  UpdateAppTestManagementIntegrationDto,
  VerifyAppTestManagementIntegrationResult,
  TestManagementProviderType as TestManagementProviderTypeType,
  VerificationStatus as VerificationStatusType
} from './tenant-integration.interface';

// Export deprecated Tenant types for backward compatibility
export type {
  CreateTenantTestManagementIntegrationDto,
  FindTenantIntegrationsFilter,
  TenantTestManagementIntegration,
  TenantTestManagementIntegrationConfig,
  UpdateTenantTestManagementIntegrationDto,
  VerifyTenantTestManagementIntegrationResult
} from './tenant-integration.interface';

