/**
 * Release Process Constants for Mock Server
 * JavaScript constants matching the TypeScript enums from app/types/release-process-enums.ts
 */

/**
 * Task Stage - Which stage a task belongs to
 */
const TaskStage = {
  KICKOFF: 'KICKOFF',
  REGRESSION: 'REGRESSION',
  PRE_RELEASE: 'PRE_RELEASE',
  DISTRIBUTION: 'DISTRIBUTION',
};

/**
 * Task Type - Specific task types within each stage
 */
const TaskType = {
  // Stage 1: Kickoff (4 tasks)
  FORK_BRANCH: 'FORK_BRANCH',
  CREATE_PROJECT_MANAGEMENT_TICKET: 'CREATE_PROJECT_MANAGEMENT_TICKET',
  CREATE_TEST_SUITE: 'CREATE_TEST_SUITE',
  TRIGGER_PRE_REGRESSION_BUILDS: 'TRIGGER_PRE_REGRESSION_BUILDS',
  
  // Stage 2: Regression (4 tasks)
  RESET_TEST_SUITE: 'RESET_TEST_SUITE',
  CREATE_RC_TAG: 'CREATE_RC_TAG',
  CREATE_RELEASE_NOTES: 'CREATE_RELEASE_NOTES',
  TRIGGER_REGRESSION_BUILDS: 'TRIGGER_REGRESSION_BUILDS',
  
  // Stage 3: Post-Regression (4 tasks)
  TRIGGER_TEST_FLIGHT_BUILD: 'TRIGGER_TEST_FLIGHT_BUILD',
  CREATE_AAB_BUILD: 'CREATE_AAB_BUILD',
  CREATE_RELEASE_TAG: 'CREATE_RELEASE_TAG',
  CREATE_FINAL_RELEASE_NOTES: 'CREATE_FINAL_RELEASE_NOTES',
};

/**
 * Task Status - Current status of a task
 */
const TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  AWAITING_CALLBACK: 'AWAITING_CALLBACK',
  AWAITING_MANUAL_BUILD: 'AWAITING_MANUAL_BUILD',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
};

/**
 * Stage Status - Current status of a stage
 */
const StageStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

/**
 * Regression Cycle Status
 */
const RegressionCycleStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  ABANDONED: 'ABANDONED',
  // Legacy statuses
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
};

/**
 * Build Upload Stage - Which stage a build is uploaded for
 */
const BuildUploadStage = {
  PRE_REGRESSION: 'PRE_REGRESSION',
  REGRESSION: 'REGRESSION',
  PRE_RELEASE: 'PRE_RELEASE',
};

/**
 * Platform - Build platforms
 */
const Platform = {
  ANDROID: 'ANDROID',
  IOS: 'IOS',
  WEB: 'WEB',
};

/**
 * Build Type
 */
const BuildType = {
  MANUAL: 'MANUAL',
  CI_CD: 'CI_CD',
};

/**
 * Build Upload Status - Status of manual build upload
 */
const BuildUploadStatus = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
  FAILED: 'FAILED',
};

/**
 * Workflow Status - CI/CD workflow execution status
 */
const WorkflowStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

/**
 * Store Type
 */
const StoreType = {
  APP_STORE: 'APP_STORE',
  PLAY_STORE: 'PLAY_STORE',
  TESTFLIGHT: 'TESTFLIGHT',
  MICROSOFT_STORE: 'MICROSOFT_STORE',
  FIREBASE: 'FIREBASE',
  WEB: 'WEB',
};

/**
 * Test Management Status
 */
const TestManagementStatus = {
  PASSED: 'PASSED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PENDING: 'PENDING',
};

module.exports = {
  TaskStage,
  TaskType,
  TaskStatus,
  StageStatus,
  RegressionCycleStatus,
  BuildUploadStage,
  Platform,
  BuildType,
  BuildUploadStatus,
  WorkflowStatus,
  StoreType,
  TestManagementStatus,
};

