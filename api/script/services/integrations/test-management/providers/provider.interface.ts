/**
 * Test Management Provider Interface
 * Clean interface for test management providers (Checkmate, TestRail, etc.)
 */

import { TestManagementProviderType, TestRunStatus } from '~types/integrations/test-management';
import type { TenantTestManagementIntegrationConfig } from '~types/integrations/test-management/tenant-integration';

/**
 * Platform-specific configuration parameters (stored in config)
 * Used when creating/storing test management configurations
 */
export interface PlatformConfigParameters {
  // REQUIRED for config storage
  projectId: number;  // External test management system's project ID (e.g., Checkmate projectId)
  
  // OPTIONAL Checkmate-specific filters
  sectionIds?: number[];
  labelIds?: number[];
  squadIds?: number[];
  platformIds?: number[];
  filterType?: 'and' | 'or';
  createdBy?: number;
  
  // Extensible for other providers
  [key: string]: unknown;
}

/**
 * Platform-specific test parameters (used at test run creation time)
 * Combines config parameters with runtime-only parameters
 */
export interface PlatformTestParameters extends PlatformConfigParameters {
  // Runtime-only parameters (NOT stored in config)
  runName: string;         // REQUIRED: Provided when creating test run (5-50 characters)
  runDescription?: string; // Optional: Provided when creating test run
}

/**
 * Test run result from provider
 */
export interface TestRunResult {
  runId: string;
  url: string;
  status: TestRunStatus;
}

/**
 * Test status from provider
 */
export interface TestStatusResult {
  status: TestRunStatus;
  url?: string;
  total?: number;
  passed?: number;
  failed?: number;
  untested?: number;
  blocked?: number;
  inProgress?: number;
}

/**
 * Main provider interface
 * All test management providers must implement this
 */
export interface ITestManagementProvider {
  readonly providerType: TestManagementProviderType;
  
  /**
   * Validate provider configuration (credentials, connectivity)
   */
  validateConfig(config: TenantTestManagementIntegrationConfig): Promise<boolean>;
  
  /**
   * Create a new test run
   */
  createTestRun(
    config: TenantTestManagementIntegrationConfig,
    parameters: PlatformTestParameters
  ): Promise<TestRunResult>;
  
  /**
   * Get test status for a run
   */
  getTestStatus(
    config: TenantTestManagementIntegrationConfig,
    runId: string
  ): Promise<TestStatusResult>;
  
  /**
   * Reset a test run (optional)
   */
  resetTestRun?(
    config: TenantTestManagementIntegrationConfig,
    runId: string
  ): Promise<TestRunResult>;
  
  /**
   * Cancel a test run
   */
  cancelTestRun(
    config: TenantTestManagementIntegrationConfig,
    runId: string,
    projectId?: number
  ): Promise<void>;
  
  /**
   * Get detailed test report (optional)
   */
  getTestReport?(
    config: TenantTestManagementIntegrationConfig,
    runId: string,
    groupBy?: string
  ): Promise<unknown>;
}

