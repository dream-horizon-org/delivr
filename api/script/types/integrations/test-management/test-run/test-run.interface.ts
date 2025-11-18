/**
 * Clean API types for stateless test run operations
 * No storage of runIds - Release Management owns that data
 */

export enum TestRunStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Request to create test runs for all platforms in a release config
 */
export type CreateTestRunsRequest = {
  releaseConfigId: string;
};

/**
 * Single platform test run result
 */
export type PlatformTestRun = {
  platform: string;
  runId: string;
  url: string;
  status: TestRunStatus;
};

/**
 * Response from creating test runs
 */
export type CreateTestRunsResponse = {
  [platform: string]: {
    runId: string;
    url: string;
    status: TestRunStatus;
  };
};

/**
 * Request to get test status
 */
export type GetTestStatusRequest = {
  runId: string;
  releaseConfigId: string;  // Needed to get threshold
};

/**
 * Test status response with threshold evaluation
 */
export type TestStatusResponse = {
  runId: string;
  status: TestRunStatus;
  url: string;
  total: number;
  passed: number;
  failed: number;
  untested: number;
  blocked: number;
  inProgress: number;
  passPercentage: number;        // Calculated: (passed / total) * 100
  threshold: number;             // From our config
  isPassingThreshold: boolean;   // passPercentage >= threshold
  readyForApproval: boolean;     // status === COMPLETED && isPassingThreshold
};

/**
 * Request to reset/cancel test run
 */
export type TestRunActionRequest = {
  runId: string;
  releaseConfigId: string;
};

/**
 * Response from reset operation
 */
export type ResetTestRunResponse = {
  runId: string;
  status: TestRunStatus;
  message: string;
};

/**
 * Request to get test report
 */
export type GetTestReportRequest = {
  runId: string;
  releaseConfigId: string;  // For context/integration lookup
  groupBy?: string;
};

/**
 * Test report response (provider-specific structure)
 */
export type TestReportResponse = {
  runId: string;
  report: unknown;  // Provider-specific structure
};

