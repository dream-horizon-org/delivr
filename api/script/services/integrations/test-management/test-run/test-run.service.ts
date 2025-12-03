import { TenantTestManagementIntegrationRepository } from '~models/integrations/test-management';
import type { TestManagementConfigRepository } from '~models/integrations/test-management/test-management-config/test-management-config.repository';
import type {
  CreateTestRunsRequest,
  CreateTestRunsResponse,
  GetTestReportRequest,
  GetTestStatusRequest,
  ResetTestRunResponse,
  TestReportResponse,
  TestRunActionRequest,
  TestStatusResponse
} from '~types/integrations/test-management';
import { TestRunStatus } from '~types/integrations/test-management';
import { ProviderFactory } from '../providers/provider.factory';
import type { PlatformTestParameters } from '../providers/provider.interface';

/**
 * Test Management Run Service
 * 
 * This service provides clean operations for test management without storing runIds.
 * Release Management owns the runId data and passes it when needed.
 * 
 * Error Handling Strategy:
 * - createTestRuns: Catches errors per platform, returns partial success (multi-platform operation)
 * - Other methods: Throw immediately on error (single run operations)
 * 
 * This intentional difference allows creating runs for multiple platforms where some
 * may succeed and others fail, while maintaining fail-fast behavior for single-run operations.
 */
export class TestManagementRunService {
  constructor(
    private readonly configRepo: TestManagementConfigRepository,
    private readonly integrationRepo: TenantTestManagementIntegrationRepository
  ) {}

  /**
   * Create test runs for platforms in a test management config
   * 
   * Input: testManagementConfigId + runName (5-50 chars) + optional runDescription + optional platforms filter
   * Output: runIds for each requested platform
   * 
   * If platforms array is provided, only creates runs for those platforms.
   * If platforms is not provided, creates runs for ALL platforms in config.
   * runName is required (5-50 characters) and will be used for all test runs created.
   * runDescription is optional and will be included if provided.
   * 
   * We don't store the runIds - caller is responsible for storage
   */
  async createTestRuns(request: CreateTestRunsRequest): Promise<CreateTestRunsResponse> {
    const { testManagementConfigId, runName, runDescription, platforms } = request;

    // 1. Get test management config
    const config = await this.configRepo.findById(testManagementConfigId);
    if (!config) {
      throw new Error(`Test management config not found: ${testManagementConfigId}`);
    }

    // 2. Get integration (credentials)
    const integration = await this.integrationRepo.findById(config.integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${config.integrationId}`);
    }

    // 3. Get platform configurations (validate and filter if platforms specified)
    let platformConfigs = config.platformConfigurations;
    
    if (platforms) {
      platformConfigs = [];
      for (const platform of platforms) {
        const platformConfig = config.platformConfigurations.find(pc => pc.platform === platform);
        if (!platformConfig) {
          throw new Error(`Platform not found in config: ${platform}`);
        }
        platformConfigs.push(platformConfig);
      }
    }

    // 4. Get provider
    const provider = ProviderFactory.getProvider(integration.providerType);

    // 5. Create test run for each platform
    // Special error handling: Catch errors per platform to allow partial success
    // This allows some platforms to succeed even if others fail (e.g., network issues)
    const results: CreateTestRunsResponse = {};

    for (const platformConfig of platformConfigs) {
      try {
        // Build platform parameters with runName and optional runDescription
        const platformParameters: PlatformTestParameters = {
          ...platformConfig.parameters,
          runName, // Required: provided in request
          ...(runDescription && { runDescription }) // Optional: include if provided
        };

        // Call provider to create test run
        const testRun = await provider.createTestRun(
          integration.config,
          platformParameters
        );

        results[platformConfig.platform] = {
          runId: testRun.runId,
          url: testRun.url,
          status: TestRunStatus.PENDING
        };
      } catch (error) {
        // Log error but continue with other platforms (partial success pattern)
        console.error(`Failed to create test run for platform ${platformConfig.platform}:`, error);
        
        // Store error result for this platform
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results[platformConfig.platform] = {
          error: `Failed to create test run: ${errorMessage}`
        };
      }
    }

    return results;
  }

  /**
   * Get test status with threshold evaluation
   * 
   * Input: runId + testManagementConfigId
   * Output: test status + threshold evaluation
   * 
   * We need testManagementConfigId to get the threshold from our config
   */
  async getTestStatus(request: GetTestStatusRequest): Promise<TestStatusResponse> {
    const { runId, testManagementConfigId } = request;

    // 1. Get test management config to get threshold
    const config = await this.configRepo.findById(testManagementConfigId);
    if (!config) {
      throw new Error(`Test management config not found: ${testManagementConfigId}`);
    }

    // 2. Get integration (credentials)
    const integration = await this.integrationRepo.findById(config.integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${config.integrationId}`);
    }

    // 3. Get provider
    const provider = ProviderFactory.getProvider(integration.providerType);

    // 4. Query test status from provider
    const providerStatus = await provider.getTestStatus(integration.config, runId);

    // 5. Calculate pass percentage (rounded to whole number to match integer threshold)
    const total = providerStatus.total ?? 0;
    const passed = providerStatus.passed ?? 0;
    const passPercentage = total > 0 ? Math.round((passed / total) * 100) : 0;

    // 6. Evaluate against threshold
    const threshold = config.passThresholdPercent;
    const isPassingThreshold = passPercentage >= threshold;
    const readyForApproval = providerStatus.status === 'COMPLETED' && isPassingThreshold;

    // 7. Return merged status
    return {
      runId,
      status: providerStatus.status,
      url: providerStatus.url ?? '',
      total,
      passed,
      failed: providerStatus.failed ?? 0,
      untested: providerStatus.untested ?? 0,
      blocked: providerStatus.blocked ?? 0,
      inProgress: providerStatus.inProgress ?? 0,
      passPercentage,
      threshold,
      isPassingThreshold,
      readyForApproval
    };
  }

  /**
   * Reset test run in provider (Checkmate/TestRail)
   * 
   * Input: runId + testManagementConfigId
   * Output: success/failure
   * 
   * We need testManagementConfigId to know which integration to use
   */
  async resetTestRun(request: TestRunActionRequest): Promise<ResetTestRunResponse> {
    const { runId, testManagementConfigId } = request;

    // Get config to find integration
    const config = await this.configRepo.findById(testManagementConfigId);
    if (!config) {
      throw new Error(`Test management config not found: ${testManagementConfigId}`);
    }

    // Get integration
    const integration = await this.integrationRepo.findById(config.integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${config.integrationId}`);
    }

    // Get provider
    const provider = ProviderFactory.getProvider(integration.providerType);

    // Call provider to reset
    const resetResult = await provider.resetTestRun?.(integration.config, runId);
    
    if (!resetResult) {
      throw new Error('Provider does not support test run reset');
    }

    return {
      runId: resetResult.runId ?? runId,
      status: TestRunStatus.PENDING,
      message: 'Test run reset successfully'
    };
  }

  /**
   * Cancel test run in provider
   * 
   * Input: runId + testManagementConfigId
   * Output: success/failure
   */
  async cancelTestRun(request: TestRunActionRequest): Promise<void> {
    const { runId, testManagementConfigId } = request;

    // Get config to find integration
    const config = await this.configRepo.findById(testManagementConfigId);
    if (!config) {
      throw new Error(`Test management config not found: ${testManagementConfigId}`);
    }

    // Get integration
    const integration = await this.integrationRepo.findById(config.integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${config.integrationId}`);
    }

    // Get projectId from first platform configuration
    const projectId = config.platformConfigurations[0]?.parameters?.projectId;
    if (!projectId || typeof projectId !== 'number') {
      throw new Error('No valid projectId found in config platform parameters');
    }

    // Get provider
    const provider = ProviderFactory.getProvider(integration.providerType);

    // Call provider to cancel
    await provider.cancelTestRun(integration.config, runId, projectId);
  }

  /**
   * Get detailed test report
   * 
   * Input: runId + testManagementConfigId
   * Output: detailed report from provider
   */
  async getTestReport(request: GetTestReportRequest): Promise<TestReportResponse> {
    const { runId, testManagementConfigId, groupBy } = request;

    // Get config to find integration
    const config = await this.configRepo.findById(testManagementConfigId);
    if (!config) {
      throw new Error(`Test management config not found: ${testManagementConfigId}`);
    }

    // Get integration
    const integration = await this.integrationRepo.findById(config.integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${config.integrationId}`);
    }

    // Get provider
    const provider = ProviderFactory.getProvider(integration.providerType);

    // Get report from provider (optional method)
    const getTestReportMethod = provider.getTestReport;
    const reportMethodNotAvailable = !getTestReportMethod;
    
    if (reportMethodNotAvailable) {
      throw new Error('Provider does not support test report generation');
    }

    const report = await getTestReportMethod(integration.config, runId, groupBy);

    return {
      runId,
      report
    };
  }
}

