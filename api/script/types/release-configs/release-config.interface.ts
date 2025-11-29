/**
 * Release Config Type Definitions
 * Release configuration profiles linking to various integration configs
 */

import type { TestPlatform } from '~types/integrations/test-management/platform.interface';
import type { 
  PlatformConfiguration as TestManagementPlatformConfiguration,
  CreateTestManagementConfigDto,
  TestManagementConfig
} from '~types/integrations/test-management/test-management-config';
import type { TenantCICDConfig } from '~types/integrations/ci-cd/config.interface';
import type { ProjectManagementConfig } from '~types/integrations/project-management/configuration';
import type { TenantCommChannel } from '~types/integrations/comm/comm-integration';

/**
 * Platform-Target pair for release config
 */
export type PlatformTarget = {
  platform: string;
  target: string;
};

/**
 * Release Configuration (Database Model)
 * Contains integration config IDs for database relationships
 * NOTE: For API responses, use VerboseReleaseConfiguration which has nested objects
 */
export type ReleaseConfiguration = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  platformTargets: PlatformTarget[];
  baseBranch: string | null;
  ciConfigId: string | null;
  testManagementConfigId: string | null;
  projectManagementConfigId: string | null;
  commsConfigId: string | null;
  scheduling: ReleaseScheduling;
  hasManualBuildUpload: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * DTO for creating release config
 */
export type CreateReleaseConfigDto = {
  tenantId: string;
  name: string;
  description?: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  platformTargets: PlatformTarget[];
  baseBranch?: string;
  ciConfigId?: string;
  testManagementConfigId?: string;
  projectManagementConfigId?: string;
  commsConfigId?: string;
  scheduling?: ReleaseScheduling;
  hasManualBuildUpload?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  createdByAccountId: string;
};

/**
 * DTO for updating release config
 */
export type UpdateReleaseConfigDto = {
  name?: string;
  description?: string;
  releaseType?: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  platformTargets?: PlatformTarget[];
  baseBranch?: string | null;
  ciConfigId?: string | null;
  testManagementConfigId?: string | null;
  projectManagementConfigId?: string | null;
  commsConfigId?: string | null;
  scheduling?: ReleaseScheduling;
  hasManualBuildUpload?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
};

/**
 * Request body structure from client for creating release configuration
 * STANDARDIZED: All integration keys have "Config" suffix (ciConfig, testManagementConfig, projectManagementConfig, communicationConfig)
 */
export type CreateReleaseConfigRequest = {
  tenantId: string;
  name: string;
  description?: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  isDefault?: boolean;
  platformTargets: PlatformTarget[];
  baseBranch?: string;
  scheduling?: ReleaseScheduling;
  hasManualBuildUpload?: boolean;
  
  // INTEGRATION CONFIGS (standardized keys with "Config" suffix, nested objects)
  // These will be processed to create/link integration configs
  ciConfig?: {
    id?: string;  // Optional: reuse existing config
    workflows: Workflow[];
  };
  testManagementConfig?: TestManagementRequestConfig;
  projectManagementConfig?: any; // TODO: Use proper PM config type
  communicationConfig?: any;     // TODO: Use proper Communication config type
};

/**
 * Request body structure from client for updating release configuration
 * Matches the GET verbose response format (nested integration configs)
 * 
 * Pattern 2 (Null Convention) - Three-state system for integration configs:
 * - undefined (absent) = KEEP existing config (no change)
 * - null = REMOVE config (detach from release config)
 * - object = UPSERT config (update if id present, create if not)
 * 
 * STANDARDIZED: All integration keys have "Config" suffix
 */
export type UpdateReleaseConfigRequest = Partial<Omit<CreateReleaseConfigRequest, 'tenantId'>> & {
  // Integration configs with explicit null support for removal
  ciConfig?: {
    id?: string;
    workflows: Workflow[];
  } | null;
  testManagementConfig?: TestManagementRequestConfig | null;
  projectManagementConfig?: any | null;
  communicationConfig?: any | null;
};

/**
 * Verbose Release Configuration for API responses
 * Contains full nested integration config objects
 * NO integration config IDs at root level - only in nested objects
 * STANDARDIZED: All integration keys have "Config" suffix
 * 
 * Uses types from respective integration services (single source of truth):
 * - TenantCICDConfig from CI/CD service
 * - TestManagementConfig from Test Management service
 * - ProjectManagementConfig from Project Management service
 * - TenantCommChannel from Communication service
 */
export type VerboseReleaseConfiguration = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  platformTargets: PlatformTarget[];
  baseBranch: string | null;
  scheduling: ReleaseScheduling;
  hasManualBuildUpload: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdByAccountId: string;
  createdAt: string;
  updatedAt: string;
  
  // NESTED INTEGRATION CONFIGS (standardized keys with "Config" suffix, null if not configured)
  // Types imported from respective integration services (NOT duplicated here)
  ciConfig: TenantCICDConfig | null;
  testManagementConfig: TestManagementConfig | null;
  projectManagementConfig: ProjectManagementConfig | null;
  communicationConfig: TenantCommChannel | null;
};

/**
 * @deprecated Use VerboseReleaseConfiguration instead
 * Safe version of ReleaseConfiguration for API responses
 * Contains only metadata without any integration details
 */
export type SafeReleaseConfiguration = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  platformTargets: PlatformTarget[];
  baseBranch: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdBy: {
    id: string;
    name?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// CLIENT REQUEST TYPES (for POST/PUT)
// ============================================================================
// NOTE: Response types are imported from respective integration services above
// We do NOT duplicate them here to maintain single source of truth

/**
 * Test Management Config from client request
 * Uses actual test-management types via mapper
 */
export interface TestManagementRequestConfig {
  id?: string; // Optional: if updating existing config
  integrationId: string;
  name?: string;
  passThresholdPercent?: number;
  platformConfigurations?: TestManagementPlatformConfiguration[];
}

// NOTE: Other integration config request types will use the same pattern:
// - Include optional `id` for updates
// - Omit tenant/audit fields (added server-side)

/**
 * Build Pipeline configuration
 * Uses TestPlatform for consistency with test management
 */
export interface Workflow {
  id?: string;
  name: string;
  platform: TestPlatform;
  environment: string;
  provider: 'GITHUB_ACTIONS' | 'JENKINS' | 'MANUAL_UPLOAD';
  providerConfig: any;
  enabled: boolean;
  timeout: number;
  retryAttempts: number;
}

/**
 * Platform Configuration for general use
 * Uses TestPlatform for consistency across the application
 */
export interface PlatformConfiguration {
  platform: TestPlatform;
  testSelectionCriteria: {
    selectionType: 'LABEL_BASED' | 'SECTION_BASED' | 'ALL';
    labelIds: number[];
    sectionIds: number[];
    squadIds: number[];
  };
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Result from integration validation
 */
export interface IntegrationValidationResult {
  integration: string;
  isValid: boolean;
  errors: FieldValidationError[];
}

/**
 * Field validation error
 */
export interface FieldValidationError {
  field: string;
  message: string;
}

/**
 * Overall validation result
 */
export interface ValidationResult {
  isValid: boolean;
  invalidIntegrations: IntegrationValidationResult[];
}

// ============================================================================
// SERVICE RESULT TYPES
// ============================================================================

/**
 * Generic service result type
 */
export type ServiceResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    type: string;
    message: string;
    code: string;
    details?: any;
  };
};

// ============================================================================
// SCHEDULING TYPES
// ============================================================================

/**
 * Release frequency options
 */
export type ReleaseFrequency = 'weekly' | 'biweekly' | 'triweekly' | 'monthly';

/**
 * Day of week (1 = Monday, 7 = Sunday)
 */
export type WorkingDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Regression slot configuration
 */
export interface RegressionSlot {
  name?: string;
  regressionSlotOffsetFromKickoff: number; // Should be <= targetReleaseDateOffsetFromKickoff
  time: string; // Format: "HH:mm", should be <= targetReleaseTime if regressionSlotOffsetFromKickoff == targetReleaseDateOffsetFromKickoff
  config: {
    regressionBuilds: boolean;
    postReleaseNotes: boolean;
    automationBuilds: boolean;
    automationRuns: boolean;
  };
}

/**
 * Release scheduling configuration
 */
export interface ReleaseScheduling {
  releaseFrequency: ReleaseFrequency;
  firstReleaseKickoffDate: string; // ISO date string
  nextReleaseKickoffDate?: string; // Optional, may be absent in request body
  initialVersions: Record<string, string>; // Platform -> Version mapping (e.g., {"ANDROID": "1.0.0", "IOS": "1.0.0"})
  kickoffReminderTime: string; // Format: "HH:mm", should be <= kickoffTime
  kickoffTime: string; // Format: "HH:mm"
  targetReleaseTime: string; // Format: "HH:mm"
  targetReleaseDateOffsetFromKickoff: number; // Should be >= 0
  kickoffReminderEnabled: boolean;
  timezone: string; // e.g., "Asia/Kolkata"
  regressionSlots?: RegressionSlot[]; // Optional: can be absent or empty array
  workingDays: WorkingDay[];
}


