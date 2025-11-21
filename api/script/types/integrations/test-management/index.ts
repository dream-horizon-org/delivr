// Export both types AND values (for enums)
export {
    TestManagementProviderType,
    VerificationStatus
} from './tenant-integration';

export { TEST_PLATFORM_DISPLAY_NAMES, TEST_PLATFORMS, TestPlatform } from './platform.interface';

export {
    isValidTestPlatform
} from './platform.utils';

// Export only types
export type {
    CreateTenantTestManagementIntegrationDto, FindTenantIntegrationsFilter, TenantTestManagementIntegration,
    TenantTestManagementIntegrationConfig, UpdateTenantTestManagementIntegrationDto, VerifyTenantTestManagementIntegrationResult
} from './tenant-integration';

export type {
    CreateTestManagementConfigDto, PlatformConfiguration,
    TestManagementConfig, UpdateTestManagementConfigDto
} from './test-management-config';

// Export both types AND values (for enums)
export { TestRunStatus } from './test-run';

// Export only types
export type {
    CreateTestRunsRequest,
    CreateTestRunsResponse,
    GetTestReportRequest,
    GetTestStatusRequest,
    PlatformTestRun,
    ResetTestRunResponse,
    TestReportResponse,
    TestRunActionRequest,
    TestStatusResponse
} from './test-run';

