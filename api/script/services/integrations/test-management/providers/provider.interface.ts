/**
 * Test Management Provider Interface
 * Clean interface for test management providers (Checkmate, TestRail, etc.)
 */

import { TestManagementProviderType, TestRunStatus } from '~types/integrations/test-management';
import type { ProjectTestManagementIntegrationConfig } from '~types/integrations/test-management/project-integration';

/**
 * Platform-specific test parameters
 * Each provider can extend this for their specific needs
 */
export interface PlatformTestParameters {
  // Common parameters
  projectId?: number;
  runName?: string;
  runDescription?: string;
  
  // Checkmate-specific parameters
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
  validateConfig(config: ProjectTestManagementIntegrationConfig): Promise<boolean>;
  
  /**
   * Create a new test run
   */
  createTestRun(
    config: ProjectTestManagementIntegrationConfig,
    parameters: PlatformTestParameters
  ): Promise<TestRunResult>;
  
  /**
   * Get test status for a run
   */
  getTestStatus(
    config: ProjectTestManagementIntegrationConfig,
    runId: string
  ): Promise<TestStatusResult>;
  
  /**
   * Reset a test run (optional)
   */
  resetTestRun?(
    config: ProjectTestManagementIntegrationConfig,
    runId: string
  ): Promise<TestRunResult>;
  
  /**
   * Cancel a test run
   */
  cancelTestRun(
    config: ProjectTestManagementIntegrationConfig,
    runId: string
  ): Promise<void>;
  
  /**
   * Get detailed test report (optional)
   */
  getTestReport?(
    config: ProjectTestManagementIntegrationConfig,
    runId: string,
    groupBy?: string
  ): Promise<unknown>;
}

