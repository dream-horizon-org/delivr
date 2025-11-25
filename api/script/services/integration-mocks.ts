/**
 * Mock Integration Implementations
 * 
 * Used for testing and development when real integrations are not available.
 * These mocks simulate integration behavior without making actual API calls.
 * 
 * NOTE: These mocks are deprecated and will be removed.
 * Use real integration services instead (injected via DI).
 */

// Integration interfaces removed - using real services now
// import { SCMIntegration } from '../routes/release/integrations/scm-integration.interface';
// import { NotificationIntegration } from '../routes/release/integrations/notification-integration.interface';
// import { JIRAIntegration } from '../routes/release/integrations/jira-integration.interface';
// import { TestPlatformIntegration } from '../routes/release/integrations/test-platform-integration.interface';
// import { CICDIntegration } from '../routes/release/integrations/cicd-integration.interface';

/**
 * Mock SCM Integration
 */
export class MockSCMIntegration {
  async checkBranchExists(
    tenantId: string,
    branch: string,
    customConfig?: any
  ): Promise<boolean> {
    console.log(`  [MOCK SCM] Checking if branch exists: ${branch}`);
    return false; // Branch doesn't exist
  }

  async forkOutBranch(
    tenantId: string,
    releaseBranch: string,
    baseBranch: string,
    customConfig?: any
  ): Promise<void> {
    console.log(`  [MOCK SCM] Forking branch: ${releaseBranch} from ${baseBranch}`);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    return Promise.resolve();
  }

  async createReleaseTag(
    tenantId: string,
    releaseBranch: string,
    tagName?: string,
    targets?: string[],
    version?: string,
    customConfig?: any
  ): Promise<string> {
    const finalTagName = tagName || `v${version || '1.0.0'}`;
    console.log(`  [MOCK SCM] Creating release tag: ${finalTagName}`);
    return Promise.resolve(finalTagName);
  }

  async createGitHubRelease(
    tenantId: string,
    currentTag: string,
    previousTag?: string | null,
    baseVersion?: string,
    parentTargets?: string[],
    releaseDate?: Date,
    releaseId?: string,
    customConfig?: any
  ): Promise<string> {
    const repoUrl = customConfig?.repoUrl || 'https://github.com/owner/repo';
    const releaseUrl = `${repoUrl}/releases/tag/${currentTag}`;
    console.log(`  [MOCK SCM] Creating GitHub release: ${releaseUrl}`);
    return Promise.resolve(releaseUrl);
  }

  async createReleaseNotes(
    tenantId: string,
    currentTag: string,
    previousTag?: string | null,
    baseVersion?: string,
    parentTargets?: string[],
    releaseId?: string,
    customConfig?: any
  ): Promise<string> {
    console.log(`  [MOCK SCM] Creating release notes for tag: ${currentTag}`);
    return Promise.resolve(`Release notes for ${currentTag}`);
  }

  async updateVariables(
    tenantId: string,
    variables: Record<string, any>,
    releaseId?: string,
    customConfig?: any
  ): Promise<void> {
    console.log(`  [MOCK SCM] Updating variables:`, variables);
    return Promise.resolve();
  }

  async getCommitsDiff(
    tenantId: string,
    branch: string,
    tag: string,
    releaseId?: string,
    customConfig?: any
  ): Promise<number> {
    console.log(`  [MOCK SCM] Getting commits diff: ${branch} vs ${tag}`);
    return Promise.resolve(5); // 5 commits difference
  }
}

/**
 * Mock Notification Integration
 */
export class MockNotificationIntegration {
  async configure(config: any): Promise<void> {
    // No-op for mock
  }

  async validate(): Promise<boolean> {
    return true;
  }

  async sendMessage(
    releaseId: string,
    template: string,
    parameters: string[],
    options?: any,
    config?: any
  ): Promise<string> {
    const messageId = `msg-${Date.now()}`;
    console.log(`  [MOCK NOTIFICATION] Sending message: ${template} (ID: ${messageId})`);
    console.log(`    Parameters: ${parameters.join(', ')}`);
    return Promise.resolve(messageId);
  }
}

/**
 * Mock JIRA Integration
 */
export class MockJIRAIntegration {
  async configure(config: any): Promise<void> {
    // No-op for mock
  }

  async validate(): Promise<boolean> {
    return true;
  }

  async createReleaseTicket(
    tenantId: string,
    ticketType: string,
    ticketData: any,
    customConfig?: any
  ): Promise<string> {
    const ticketId = `PROJ-${Math.floor(Math.random() * 1000)}`;
    console.log(`  [MOCK JIRA] Creating ${ticketType} ticket: ${ticketId}`);
    console.log(`    Summary: ${ticketData.summary || 'N/A'}`);
    return Promise.resolve(ticketId);
  }

  async updateTicket(
    tenantId: string,
    ticketId: string,
    ticketData: any,
    customConfig?: any
  ): Promise<void> {
    console.log(`  [MOCK JIRA] Updating ticket: ${ticketId}`);
    console.log(`    Updates:`, ticketData);
    return Promise.resolve();
  }

  async checkTicketStatus(
    tenantId: string,
    ticketId: string,
    customConfig?: any
  ): Promise<{
    status: string;
    approved: boolean;
    [key: string]: any;
  }> {
    console.log(`  [MOCK JIRA] Checking ticket status: ${ticketId}`);
    return Promise.resolve({
      status: 'In Progress',
      approved: false
    });
  }
}

/**
 * Mock Test Platform Integration
 */
export class MockTestPlatformIntegration {
  async configure(config: any): Promise<void> {
    // No-op for mock
  }

  async validate(): Promise<boolean> {
    return true;
  }

  async createTestSuite(
    tenantId: string,
    suiteData: any,
    customConfig?: any
  ): Promise<string> {
    const suiteId = `suite-${Date.now()}`;
    console.log(`  [MOCK TEST PLATFORM] Creating test suite: ${suiteId}`);
    console.log(`    Name: ${suiteData.suiteName || 'N/A'}`);
    return Promise.resolve(suiteId);
  }

  async getTestSuiteStatus(
    tenantId: string,
    suiteId: string,
    customConfig?: any
  ): Promise<any> {
    console.log(`  [MOCK TEST PLATFORM] Getting suite status: ${suiteId}`);
    return Promise.resolve({
      status: 'passed',
      progress: 100,
      passedTests: 10,
      failedTests: 0,
      totalTests: 10
    });
  }

  async resetTestSuite(
    tenantId: string,
    suiteId: string,
    customConfig?: any
  ): Promise<void> {
    console.log(`  [MOCK TEST PLATFORM] Resetting test suite: ${suiteId}`);
    return Promise.resolve();
  }
}

/**
 * Mock CI/CD Integration
 */
export class MockCICDIntegration {
  private buildCounter: Map<string, number> = new Map();

  async configure(config: any): Promise<void> {
    // No-op for mock
  }

  async validate(): Promise<boolean> {
    return true;
  }

  async triggerPlannedRelease(
    releaseId: string,
    inputs: any,
    config?: any
  ): Promise<string> {
    const platform = inputs.release_platform || inputs.platform || 'unknown';
    const version = inputs.release_version || inputs.version || '1.0.0';
    
    // Get or initialize counter for this release
    const count = (this.buildCounter.get(releaseId) || 0) + 1;
    this.buildCounter.set(releaseId, count);
    
    // Generate build number based on platform
    const platformPrefix = platform.toLowerCase().substring(0, 3);
    const buildNumber = `${version}-${platformPrefix}-${count}`;
    
    console.log(`  [MOCK CI/CD] Triggering planned release build: ${buildNumber}`);
    console.log(`    Platform: ${platform}, Version: ${version}`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return Promise.resolve(buildNumber);
  }

  async triggerRegressionBuilds(
    releaseId: string,
    inputs: any,
    config?: any
  ): Promise<string> {
    return this.triggerPlannedRelease(releaseId, inputs, config);
  }

  async triggerAutomationBuilds(
    releaseId: string,
    inputs: any,
    config?: any
  ): Promise<string> {
    return this.triggerPlannedRelease(releaseId, inputs, config);
  }

  async triggerAutomationRuns(
    releaseId: string,
    inputs: any,
    config?: any
  ): Promise<string> {
    const runId = `run-${Date.now()}`;
    console.log(`  [MOCK CI/CD] Triggering automation run: ${runId}`);
    return Promise.resolve(runId);
  }

  async createTestFlightBuild(
    releaseId: string,
    inputs: any,
    config?: any
  ): Promise<string> {
    const buildId = `testflight-${Date.now()}`;
    console.log(`  [MOCK CI/CD] Creating TestFlight build: ${buildId}`);
    return Promise.resolve(buildId);
  }

  async retryFailedWorkflow(
    releaseId: string,
    runId: string,
    config?: any
  ): Promise<string> {
    const newRunId = `retry-${runId}-${Date.now()}`;
    console.log(`  [MOCK CI/CD] Retrying failed workflow: ${runId} -> ${newRunId}`);
    return Promise.resolve(newRunId);
  }
}

/**
 * Get all mock integrations
 */
export function getMockIntegrations() {
  return {
    scm: new MockSCMIntegration(),
    notification: new MockNotificationIntegration(),
    jira: new MockJIRAIntegration(),
    testPlatform: new MockTestPlatformIntegration(),
    cicd: new MockCICDIntegration()
  };
}

