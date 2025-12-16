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
import type { CreateWorkflowDto } from '~types/integrations/ci-cd/workflow.interface';
import type { ProjectManagementConfig } from '~types/integrations/project-management/configuration';
import type { TenantCommChannel } from '~types/integrations/comm/comm-integration';
import type { ReleaseSchedule } from '~types/release-schedules/release-schedule.interface';

// Re-export scheduling types for backward compatibility
export type {
  ReleaseFrequency,
  WorkingDay,
  InitialVersion,
  RegressionSlot,
  ReleaseSchedule
} from '~types/release-schedules/release-schedule.interface';

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
 * NOTE: releaseScheduleId is NOT stored here - schedules reference configs (Schedule → Config)
 */
export type ReleaseConfiguration = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  releaseType: 'MAJOR' | 'MINOR' | 'HOTFIX';
  platformTargets: PlatformTarget[];
  baseBranch: string | null;
  ciConfigId: string | null;
  testManagementConfigId: string | null;
  projectManagementConfigId: string | null;
  commsConfigId: string | null;
  // NOTE: releaseScheduleId removed - schedule now references config via release_schedules.releaseConfigId
  hasManualBuildUpload: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * DTO for creating release config
 * NOTE: releaseScheduleId is NOT included - schedules are created separately and reference the config
 */
export type CreateReleaseConfigDto = {
  tenantId: string;
  name: string;
  description?: string;
  releaseType: 'MAJOR' | 'MINOR' | 'HOTFIX';
  platformTargets: PlatformTarget[];
  baseBranch?: string;
  ciConfigId?: string;
  testManagementConfigId?: string;
  projectManagementConfigId?: string;
  commsConfigId?: string;
  // NOTE: releaseScheduleId removed - schedule references config, not vice versa
  hasManualBuildUpload?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  createdByAccountId: string;
};

/**
 * DTO for updating release config
 * NOTE: releaseScheduleId is NOT included - schedules are managed via ReleaseScheduleService
 */
export type UpdateReleaseConfigDto = {
  name?: string;
  description?: string;
  releaseType?: 'MAJOR' | 'MINOR' | 'HOTFIX';
  platformTargets?: PlatformTarget[];
  baseBranch?: string | null;
  ciConfigId?: string | null;
  testManagementConfigId?: string | null;
  projectManagementConfigId?: string | null;
  commsConfigId?: string | null;
  // NOTE: releaseScheduleId removed - schedule references config, not vice versa
  hasManualBuildUpload?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
};

/**
 * Request body structure from client for creating release configuration
 * STANDARDIZED: All integration keys have "Config" suffix except releaseSchedule (matches table name)
 */
export type CreateReleaseConfigRequest = {
  tenantId: string;
  name: string;
  description?: string;
  releaseType: 'MAJOR' | 'MINOR' | 'HOTFIX';
  isDefault?: boolean;
  platformTargets: PlatformTarget[];
  baseBranch?: string;
  hasManualBuildUpload?: boolean;
  
  // INTEGRATION CONFIGS (standardized keys with "Config" suffix, nested objects)
  // These will be processed to create/link integration configs
  ciConfig?: {
    id?: string;  // Optional: reuse existing config by ID (if provided, workflows are ignored)
    workflows?: CreateWorkflowDto[];  // Optional: workflows to create (required if id is not provided)
  };
  testManagementConfig?: TestManagementRequestConfig;
  projectManagementConfig?: any; // TODO: Use proper PM config type
  communicationConfig?: any;     // TODO: Use proper Communication config type
  releaseSchedule?: ReleaseScheduleRequestConfig;
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
 * STANDARDIZED: All integration keys have "Config" suffix except releaseSchedule
 */
export type UpdateReleaseConfigRequest = Partial<Omit<CreateReleaseConfigRequest, 'tenantId'>> & {
  // Integration configs with explicit null support for removal
  ciConfig?: {
    id?: string;  // Optional: reference existing config by ID
    workflows?: CreateWorkflowDto[];  // Optional: workflows to create/reference
  } | null;
  testManagementConfig?: TestManagementRequestConfig | null;
  projectManagementConfig?: any | null;
  communicationConfig?: any | null;
  releaseSchedule?: ReleaseScheduleRequestConfig | null;
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
 * - ReleaseScheduling from Release Schedules
 */
export type VerboseReleaseConfiguration = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  releaseType: 'MAJOR' | 'MINOR' | 'HOTFIX';
  platformTargets: PlatformTarget[];
  baseBranch: string | null;
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
  releaseSchedule: ReleaseSchedule | null;
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
  releaseType: 'MAJOR' | 'MINOR' | 'HOTFIX';
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

/**
 * Release Schedule from client request
 * Contains scheduling configuration for recurring releases
 */
export type ReleaseScheduleRequestConfig = {
  id?: string; // Optional: if updating existing schedule
} & ReleaseSchedule;

// NOTE: Other integration config request types will use the same pattern:
// - Include optional `id` for updates
// - Omit tenant/audit fields (added server-side)

/**
 * Workflow type for CI config
 * Re-exported from CI/CD workflow interface for convenience
 * 
 * @see CreateWorkflowDto in ~types/integrations/ci-cd/workflow.interface
 */
export type Workflow = CreateWorkflowDto;

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
// ACTIVITY LOG TYPES
// ============================================================================

/**
 * Release Config Activity Log
 */
export interface ReleaseConfigActivityLog {
  id: string;
  releaseConfigId: string;
  type: string;
  previousValue: any; // JSON object
  newValue: any; // JSON object
  updatedAt: Date;
  updatedBy: string;
}

/**
 * DTO for creating release config activity log
 */
export interface CreateReleaseConfigActivityLogDto {
  id: string;
  releaseConfigId: string;
  type: string;
  previousValue?: any | null;
  newValue?: any | null;
  updatedBy: string;
}


