/**
 * Release Status Service
 * 
 * Handles checking integration statuses (project management, test management)
 * for releases. Orchestrates multiple services to provide comprehensive status.
 */

import { ReleaseRetrievalService } from './release-retrieval.service';
import type { ReleaseConfigService } from '../release-configs/release-config.service';
import type { ProjectManagementTicketService } from '../integrations/project-management';
import type { TestManagementRunService } from '../integrations/test-management/test-run/test-run.service';
import type { TestPlatform } from '~types/integrations/test-management';
import type { SCMService } from '../integrations/scm/scm.service';
import type { Platform as PMPlatform } from '~types/integrations/project-management';
import type { ReleaseRepository } from '~models/release/release.repository';
import type { RegressionCycleRepository } from '~models/release/regression-cycle.repository';

/**
 * Project Management Status Result (Single Platform)
 */
export type ProjectManagementStatusResult = {
  releaseId: string;
  projectManagementConfigId: string;
  platform: string;
  target: string;
  version: string;
  hasTicket: boolean;
  ticketKey: string | null;
  currentStatus?: string;
  completedStatus?: string;
  isCompleted?: boolean;
  message: string;
  error?: string;
};

/**
 * Project Management Status Result (All Platforms)
 */
export type ProjectManagementStatusResults = {
  releaseId: string;
  projectManagementConfigId: string;
  platforms: ProjectManagementStatusResult[];
};

/**
 * Test Management Status Result (Single Platform)
 */
export type TestManagementStatusResult = {
  releaseId: string;
  testManagementConfigId: string;
  platform: string;
  target: string;
  version: string;
  hasTestRun: boolean;
  runId: string | null;
  status?: string;
  runLink?: string;
  total?: number;
  testResults?: {
    passed?: number;
    failed?: number;
    untested?: number;
    blocked?: number;
    inProgress?: number;
    passPercentage?: number;
    threshold?: number;
    thresholdPassed?: boolean;
  };
  readyForApproval?: boolean;
  message: string;
  error?: string;
};

/**
 * Test Management Status Result (All Platforms)
 */
export type TestManagementStatusResults = {
  releaseId: string;
  testManagementConfigId: string;
  platforms: TestManagementStatusResult[];
};

export class ReleaseStatusService {
  constructor(
    private readonly releaseRetrievalService: ReleaseRetrievalService,
    private readonly releaseConfigService: ReleaseConfigService,
    private readonly projectManagementTicketService: ProjectManagementTicketService,
    private readonly testManagementRunService: TestManagementRunService,
    private readonly scmService: SCMService,
    private readonly releaseRepo: ReleaseRepository,
    private readonly regressionCycleRepo: RegressionCycleRepository
  ) {}

  /**
   * Get project management status for a release platform (or all platforms)
   * @param releaseId - Release ID
   * @param platform - Optional platform filter (if not provided, returns all platforms)
   */
  async getProjectManagementStatus(
    releaseId: string,
    platform?: PMPlatform
  ): Promise<ProjectManagementStatusResult | ProjectManagementStatusResults> {
    // Step 1: Get release to retrieve releaseConfigId
    const release = await this.releaseRetrievalService.getReleaseById(releaseId);

    if (!release) {
      throw new Error('Release not found');
    }

    const releaseConfigIdMissing = !release.releaseConfigId;

    if (releaseConfigIdMissing) {
      throw new Error('Release does not have a configuration');
    }

    // Step 2: Get release config to retrieve projectManagementConfigId
    const releaseConfig = await this.releaseConfigService.getConfigById(
      release.releaseConfigId
    );

    if (!releaseConfig) {
      throw new Error('Release configuration not found');
    }

    const pmConfigIdMissing = !releaseConfig.projectManagementConfigId;

    if (pmConfigIdMissing) {
      throw new Error('Release configuration does not have project management integration');
    }

    // Step 3: Get platform-target mappings (filtered by platform if provided)
    const mappings = platform
      ? release.platformTargetMappings.filter((m) => m.platform === platform)
      : release.platformTargetMappings;

    const noMappingsFound = mappings.length === 0;

    if (noMappingsFound) {
      const errorMsg = platform 
        ? `No platform-target mappings found for platform: ${platform}`
        : 'No platform-target mappings found for this release';
      throw new Error(errorMsg);
    }

    // If platform is provided, return single result
    if (platform) {
      const mapping = mappings[0];
      return this.getProjectManagementStatusForMapping(
        release.releaseId,
        releaseConfig.projectManagementConfigId,
        mapping
      );
    }

    // If no platform provided, return all platforms
    const platformStatuses = await Promise.all(
      mappings.map((mapping) =>
        this.getProjectManagementStatusForMapping(
          release.releaseId,
          releaseConfig.projectManagementConfigId,
          mapping
        )
      )
    );

    return {
      releaseId: release.id,  // Primary key (releases.id)
      projectManagementConfigId: releaseConfig.projectManagementConfigId,
      platforms: platformStatuses
    };
  }

  /**
   * Helper method to get project management status for a single mapping
   */
  private async getProjectManagementStatusForMapping(
    releaseId: string,
    projectManagementConfigId: string,
    mapping: any
  ): Promise<ProjectManagementStatusResult> {
    const hasNoRunId = !mapping.projectManagementRunId;

    if (hasNoRunId) {
      return {
        releaseId,
        projectManagementConfigId,
        platform: mapping.platform,
        target: mapping.target,
        version: mapping.version,
        hasTicket: false,
        ticketKey: null,
        message: 'No project management ticket created yet'
      };
    }

    try {
      const statusResult = await this.projectManagementTicketService.checkTicketStatus(
        projectManagementConfigId,
        mapping.platform as PMPlatform,
        mapping.projectManagementRunId
      );

      return {
        releaseId,
        projectManagementConfigId,
        platform: mapping.platform,
        target: mapping.target,
        version: mapping.version,
        hasTicket: true,
        ticketKey: statusResult.ticketKey,
        currentStatus: statusResult.currentStatus,
        completedStatus: statusResult.completedStatus,
        isCompleted: statusResult.isCompleted,
        message: statusResult.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        releaseId,
        projectManagementConfigId,
        platform: mapping.platform,
        target: mapping.target,
        version: mapping.version,
        hasTicket: true,
        ticketKey: mapping.projectManagementRunId,
        error: errorMessage,
        message: `Failed to check ticket status: ${errorMessage}`
      };
    }
  }

  /**
   * Get test management status for a release platform (or all platforms)
   * @param releaseId - Release ID
   * @param platform - Optional platform filter (if not provided, returns all platforms)
   */
  async getTestManagementStatus(
    releaseId: string,
    platform?: PMPlatform
  ): Promise<TestManagementStatusResult | TestManagementStatusResults> {
    // Step 1: Get release to retrieve releaseConfigId
    const release = await this.releaseRetrievalService.getReleaseById(releaseId);

    if (!release) {
      throw new Error('Release not found');
    }

    const releaseConfigIdMissing = !release.releaseConfigId;

    if (releaseConfigIdMissing) {
      throw new Error('Release does not have a configuration');
    }

    // Step 2: Get release config to retrieve testManagementConfigId
    const releaseConfig = await this.releaseConfigService.getConfigById(
      release.releaseConfigId
    );

    if (!releaseConfig) {
      throw new Error('Release configuration not found');
    }

    const tmConfigIdMissing = !releaseConfig.testManagementConfigId;

    if (tmConfigIdMissing) {
      throw new Error('Release configuration does not have test management integration');
    }

    // Step 3: Get platform-target mappings (filtered by platform if provided)
    const mappings = platform
      ? release.platformTargetMappings.filter((m) => m.platform === platform)
      : release.platformTargetMappings;

    const noMappingsFound = mappings.length === 0;

    if (noMappingsFound) {
      const errorMsg = platform 
        ? `No platform-target mappings found for platform: ${platform}`
        : 'No platform-target mappings found for this release';
      throw new Error(errorMsg);
    }

    // If platform is provided, return single result
    if (platform) {
      const mapping = mappings[0];
      return this.getTestManagementStatusForMapping(
        release.releaseId,
        releaseConfig.testManagementConfigId,
        mapping
      );
    }

    // If no platform provided, return all platforms
    const platformStatuses = await Promise.all(
      mappings.map((mapping) =>
        this.getTestManagementStatusForMapping(
          release.releaseId,
          releaseConfig.testManagementConfigId,
          mapping
        )
      )
    );

    return {
      releaseId: release.id,  // Primary key (releases.id)
      testManagementConfigId: releaseConfig.testManagementConfigId,
      platforms: platformStatuses
    };
  }

  /**
   * Helper method to get test management status for a single mapping
   */
  private async getTestManagementStatusForMapping(
    releaseId: string,
    testManagementConfigId: string,
    mapping: any
  ): Promise<TestManagementStatusResult> {
    const hasNoRunId = !mapping.testManagementRunId;

    if (hasNoRunId) {
      return {
        releaseId,
        testManagementConfigId,
        platform: mapping.platform,
        target: mapping.target,
        version: mapping.version,
        hasTestRun: false,
        runId: null,
        message: 'No test management run created yet'
      };
    }

    try {
      const statusResult = await this.testManagementRunService.getTestStatus({
        runId: mapping.testManagementRunId,
        testManagementConfigId,
        platform: mapping.platform as TestPlatform
      });

      return {
        releaseId,
        testManagementConfigId,
        platform: mapping.platform,
        target: mapping.target,
        version: mapping.version,
        hasTestRun: true,
        runId: statusResult.runId,
        status: statusResult.status,
        runLink: statusResult.url,
        total: statusResult.total,
        testResults: {
          passed: statusResult.passed,
          failed: statusResult.failed,
          untested: statusResult.untested,
          blocked: statusResult.blocked,
          inProgress: statusResult.inProgress,
          passPercentage: statusResult.passPercentage,
          threshold: statusResult.threshold,
          thresholdPassed: statusResult.isPassingThreshold
        },
        readyForApproval: statusResult.readyForApproval,
        message: 'Test run status retrieved successfully'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        releaseId,
        testManagementConfigId,
        platform: mapping.platform,
        target: mapping.target,
        version: mapping.version,
        hasTestRun: true,
        runId: mapping.testManagementRunId,
        error: errorMessage,
        message: `Failed to check test run status: ${errorMessage}`
      };
    }
  }

  /**
   * Check if all platforms are passing their test management thresholds
   * Used for regression approval logic
   * 
   * @param releaseId - Release ID
   * @returns true if ALL platforms have test runs and are passing threshold, false otherwise
   */
  async allPlatformsPassingTestManagement(releaseId: string): Promise<boolean> {
    try {
      // Get test management status for all platforms
      const result = await this.getTestManagementStatus(releaseId);
      
      // Handle the all-platforms case (TestManagementStatusResults)
      if ('platforms' in result) {
        // Check that ALL platforms:
        // 1. Have a test run (hasTestRun = true)
        // 2. Are passing their threshold (testResults.thresholdPassed = true)
        const allPassing = result.platforms.every(platform => 
          platform.hasTestRun && platform.testResults?.thresholdPassed === true
        );
        
        return allPassing;
      }
      
      // Shouldn't reach here, but handle single platform case just in case
      return result.testResults?.thresholdPassed ?? false;
      
    } catch (error) {
      // If no test management config exists, consider it as passing (nothing to check)
      const errorMessage = error instanceof Error ? error.message : '';
      const noConfigError = errorMessage.includes('Release does not have a configuration') ||
                            errorMessage.includes('does not have test management integration');
      
      if (noConfigError) {
        console.log(`[ReleaseStatusService] No test management config for release ${releaseId}, returning true (nothing to check)`);
        return true;
      }
      
      // For any other error, fail-safe to false
      console.warn(`[ReleaseStatusService] Failed to check test thresholds for release ${releaseId}:`, error);
      return false;
    }
  }

  /**
   * Check if all platforms have completed their project management tickets
   * Used for regression approval logic
   * 
   * @param releaseId - Release ID
   * @returns true if ALL platforms have tickets and are completed, false otherwise
   */
  async allPlatformsPassingProjectManagement(releaseId: string): Promise<boolean> {
    try {
      // Get project management status for all platforms
      const result = await this.getProjectManagementStatus(releaseId);
      
      // Handle the all-platforms case (ProjectManagementStatusResults)
      if ('platforms' in result) {
        // Check that ALL platforms:
        // 1. Have a ticket (hasTicket = true)
        // 2. Are completed (isCompleted = true)
        const allCompleted = result.platforms.every(platform => 
          platform.hasTicket && platform.isCompleted === true
        );
        
        return allCompleted;
      }
      
      // Shouldn't reach here, but handle single platform case just in case
      return result.isCompleted ?? false;
      
    } catch (error) {
      // If no project management config exists, consider it as passing (nothing to check)
      const errorMessage = error instanceof Error ? error.message : '';
      const noConfigError = errorMessage.includes('Release does not have a configuration') ||
                            errorMessage.includes('does not have project management integration');
      
      if (noConfigError) {
        console.log(`[ReleaseStatusService] No project management config for release ${releaseId}, returning true (nothing to check)`);
        return true;
      }
      
      // For any other error, fail-safe to false
      console.warn(`[ReleaseStatusService] Failed to check PM completion for release ${releaseId}:`, error);
      return false;
    }
  }

  /**
   * Check if cherry picks are available (branch HEAD differs from latest regression cycle tag)
   * Used for regression approval logic
   * 
   * @param tenantId - Tenant ID
   * @param releaseId - Release ID (internal UUID)
   * @returns true if cherry picks EXIST (branch diverged), false otherwise
   */
  async cherryPickAvailable(tenantId: string, releaseId: string): Promise<boolean> {
    try {
      // 1. Fetch release (for branch)
      const release = await this.releaseRepo.findById(releaseId);
      
      if (!release || !release.branch) {
        console.warn(`[ReleaseStatusService] Release not found or no branch for release ${releaseId}`);
        return false;
      }
      
      // 2. Fetch latest regression cycle (for cycleTag)
      const latestCycle = await this.regressionCycleRepo.findLatest(releaseId);
      
      if (!latestCycle || !latestCycle.cycleTag) {
        console.warn(`[ReleaseStatusService] No latest regression cycle or cycleTag for release ${releaseId}`);
        return false;
      }
      
      // 3. Check cherry pick status via SCM service
      // SCMService.checkCherryPickStatus returns:
      // - true  → cherry picks EXIST (branch HEAD !== tag SHA)
      // - false → NO cherry picks (branch HEAD === tag SHA)
      const hasCherryPicks = await this.scmService.checkCherryPickStatus(
        tenantId,
        release.branch,
        latestCycle.cycleTag
      );
      
      return hasCherryPicks;
      
    } catch (error) {
      // If no SCM integration exists or any error occurs, fail-safe to false
      console.warn(`[ReleaseStatusService] Failed to check cherry pick status for release ${releaseId}:`, error);
      return false;
    }
  }

  /**
   * Get cherry pick status for a release (for API response)
   * 
   * @param releaseId - Release ID (user-facing)
   * @param tenantId - Tenant ID
   * @returns Cherry pick status with releaseId and availability
   */
  async getCherryPickStatus(
    releaseId: string,
    tenantId: string
  ): Promise<{
    releaseId: string;
    cherryPickAvailable: boolean;
  }> {
    // Fetch release to verify it exists
    const release = await this.releaseRetrievalService.getReleaseById(releaseId);
    
    if (!release) {
      throw new Error('Release not found');
    }
    
    // Check cherry pick availability
    const cherryPickAvailable = await this.cherryPickAvailable(tenantId, releaseId);
    
    return {
      releaseId: release.id,  // Primary key (releases.id)
      cherryPickAvailable
    };
  }
}

