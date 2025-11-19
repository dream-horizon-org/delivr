import type { ProjectTestManagementIntegrationRepository } from '~models/integrations/test-management/project-integration/project-integration.repository';
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

/**
 * Test Management Run Service
 * 
 * This service provides clean operations for test management without storing runIds.
 * Release Management owns the runId data and passes it when needed.
 */
export class TestManagementRunService {
  constructor(
    private readonly configRepo: TestManagementConfigRepository,
    private readonly integrationRepo: ProjectTestManagementIntegrationRepository
  ) {}

  /**
   * Create test runs for all platforms configured in a test management config
   * 
   * Input: testManagementConfigId
   * Output: runIds for each platform
   * 
   * We don't store the runIds - caller is responsible for storage
   */
  async createTestRuns(request: CreateTestRunsRequest): Promise<CreateTestRunsResponse> {
    const { testManagementConfigId } = request;

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

    // 3. Get provider
    const provider = ProviderFactory.getProvider(integration.providerType);

    // 4. Create test run for each platform
    const results: CreateTestRunsResponse = {};

    for (const platformConfig of config.platformConfigurations) {
      try {
        // Call provider to create test run
        const testRun = await provider.createTestRun(
          integration.config,
          platformConfig.parameters
        );

        results[platformConfig.platform] = {
          runId: testRun.runId,
          url: testRun.url,
          status: TestRunStatus.PENDING
        };
      } catch (error) {
        console.error(`Failed to create test run for platform ${platformConfig.platform}:`, error);
        throw new Error(`Failed to create test run for ${platformConfig.platform}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    // 5. Calculate pass percentage
    const total = providerStatus.total ?? 0;
    const passed = providerStatus.passed ?? 0;
    const passPercentage = total > 0 ? Math.round((passed / total) * 100 * 100) / 100 : 0;

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

    // Get provider
    const provider = ProviderFactory.getProvider(integration.providerType);

    // Call provider to cancel
    await provider.cancelTestRun(integration.config, runId);
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

