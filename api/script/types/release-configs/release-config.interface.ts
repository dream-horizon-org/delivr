/**
 * Release Config Type Definitions
 * Release configuration profiles linking to various integration configs
 */

import type { TestPlatform } from '~types/integrations/test-management/platform.interface';
import type { 
  PlatformConfiguration as TestManagementPlatformConfiguration,
  CreateTestManagementConfigDto 
} from '~types/integrations/test-management/test-management-config';

/**
 * Platform-Target pair for release config
 */
export type PlatformTarget = {
  platform: string;
  target: string;
};

/**
 * Release Configuration
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
 */
export type CreateReleaseConfigRequest = {
  tenantId: string;
  name: string;
  description?: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  isDefault?: boolean;
  platformTargets: PlatformTarget[];  // New format: [{"platform": "ANDROID", "target": "PLAY_STORE"}, ...]
  
  // Integration configurations (will be processed to generate config IDs)
  ciConfigId?: string;         // Optional: existing CI config ID to reuse
  workflows?: Workflow[];                // Will be sent to CI integration service if no ciConfigId
  testManagement?: TestManagementRequestConfig;        // Will be sent to TCM integration service
  communication?: any;         // TODO: Use proper Communication config type when implemented
  projectManagement?: any;     // TODO: Use proper Project Management config type when implemented
  
  scheduling?: ReleaseScheduling;            // Stored directly as JSON
  baseBranch?: string;         // Base branch for releases
  hasManualBuildUpload?: boolean;  // Whether manual build upload is enabled
  status?: string;             // Not stored in release config
};

/**
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
// CLIENT REQUEST TYPES
// ============================================================================

/**
 * Test Management Config from client request
 * Uses actual test-management types via mapper
 */
export interface TestManagementRequestConfig {
  enabled: boolean;
  id?: string;
  integrationId: string;
  name?: string;
  passThresholdPercent?: number;
  platformConfigurations?: TestManagementPlatformConfiguration[];
}

// NOTE: Other integration config types (CI, Communication, Project Management) 
// will be imported from their respective integration type files once implemented:
// - ~types/integrations/ci-cd/config
// - ~types/integrations/comm/slack-channel-config
// - ~types/integrations/project-management/configuration

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


