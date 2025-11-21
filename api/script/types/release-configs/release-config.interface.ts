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
 * Release Configuration
 */
export type ReleaseConfiguration = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  targets: string[];
  sourceCodeManagementConfigId: string | null;
  ciConfigId: string | null;
  testManagementConfigId: string | null;
  projectManagementConfigId: string | null;
  commsConfigId: string | null;
  scheduling: ReleaseScheduling;
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
  targets: string[];
  sourceCodeManagementConfigId?: string;
  ciConfigId?: string;
  testManagementConfigId?: string;
  projectManagementConfigId?: string;
  commsConfigId?: string;
  scheduling?: ReleaseScheduling;
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
  targets?: string[];
  sourceCodeManagementConfigId?: string | null;
  ciConfigId?: string | null;
  testManagementConfigId?: string | null;
  projectManagementConfigId?: string | null;
  commsConfigId?: string | null;
  scheduling?: ReleaseScheduling;
  isDefault?: boolean;
  isActive?: boolean;
};

/**
 * Request body structure from client for creating release configuration
 */
export type CreateReleaseConfigRequest = {
  organizationId: string;      // Maps to tenantId
  name: string;
  description?: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  isDefault?: boolean;
  defaultTargets: string[];    // Maps to targets
  
  // Integration configurations (will be processed to generate config IDs)
  ciConfigId?: string;         // Optional: existing CI config ID to reuse
  buildPipelines?: BuildPipeline[];      // Will be sent to CI integration service if no ciConfigId
  testManagement?: TestManagementRequestConfig;        // Will be sent to TCM integration service
  communication?: any;         // TODO: Use proper Communication config type when implemented
  scmConfig?: any;             // TODO: Use proper SCM config type when implemented
  jiraConfig?: any;            // TODO: Use proper Project Management config type when implemented
  
  scheduling?: ReleaseScheduling;            // Stored directly as JSON
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
  targets: string[];
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

// NOTE: Other integration config types (CI, Communication, SCM, Project Management) 
// will be imported from their respective integration type files once implemented:
// - ~types/integrations/ci/ci-config
// - ~types/integrations/communication/communication-config  
// - ~types/integrations/scm/scm-config
// - ~types/integrations/project-management/project-management-config

/**
 * Build Pipeline configuration
 * Uses TestPlatform for consistency with test management
 */
export interface BuildPipeline {
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
  kickoffReminderTime: string; // Format: "HH:mm", should be <= kickoffTime
  kickoffTime: string; // Format: "HH:mm"
  targetReleaseTime: string; // Format: "HH:mm"
  targetReleaseDateOffsetFromKickoff: number; // Should be >= 0
  kickoffReminderEnabled: boolean;
  timezone: string; // e.g., "Asia/Kolkata"
  regressionSlots: RegressionSlot[];
  workingDays: WorkingDay[];
}


