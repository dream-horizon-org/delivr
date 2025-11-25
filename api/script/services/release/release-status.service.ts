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
import type { Platform as PMPlatform } from '~types/integrations/project-management';

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
  url?: string;
  total?: number;
  passed?: number;
  failed?: number;
  untested?: number;
  blocked?: number;
  inProgress?: number;
  passPercentage?: number;
  threshold?: number;
  isPassingThreshold?: boolean;
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
    private readonly testManagementRunService: TestManagementRunService
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
      releaseId: release.releaseId,
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
      releaseId: release.releaseId,
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
        testManagementConfigId
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
        url: statusResult.url,
        total: statusResult.total,
        passed: statusResult.passed,
        failed: statusResult.failed,
        untested: statusResult.untested,
        blocked: statusResult.blocked,
        inProgress: statusResult.inProgress,
        passPercentage: statusResult.passPercentage,
        threshold: statusResult.threshold,
        isPassingThreshold: statusResult.isPassingThreshold,
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
}

