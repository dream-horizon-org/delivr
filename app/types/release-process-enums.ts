/**
 * Release Process Enums
 * Enums for release process stages, tasks, and statuses
 */

/**
 * Task Stage - Which stage a task belongs to
 */
export enum TaskStage {
  KICKOFF = 'KICKOFF',
  REGRESSION = 'REGRESSION',
  POST_REGRESSION = 'POST_REGRESSION',
  DISTRIBUTION = 'DISTRIBUTION',
}

/**
 * Task Type - Specific task types within each stage
 */
export enum TaskType {
  // Stage 1: Kickoff
  PRE_KICK_OFF_REMINDER = 'PRE_KICK_OFF_REMINDER',
  FORK_BRANCH = 'FORK_BRANCH',
  CREATE_PROJECT_MANAGEMENT_TICKET = 'CREATE_PROJECT_MANAGEMENT_TICKET',
  CREATE_TEST_SUITE = 'CREATE_TEST_SUITE',
  TRIGGER_PRE_REGRESSION_BUILDS = 'TRIGGER_PRE_REGRESSION_BUILDS',
  
  // Stage 2: Regression
  RESET_TEST_SUITE = 'RESET_TEST_SUITE',
  CREATE_RC_TAG = 'CREATE_RC_TAG',
  CREATE_RELEASE_NOTES = 'CREATE_RELEASE_NOTES',
  TRIGGER_REGRESSION_BUILDS = 'TRIGGER_REGRESSION_BUILDS',
  TRIGGER_AUTOMATION_RUNS = 'TRIGGER_AUTOMATION_RUNS',
  AUTOMATION_RUNS = 'AUTOMATION_RUNS',
  SEND_REGRESSION_BUILD_MESSAGE = 'SEND_REGRESSION_BUILD_MESSAGE',
  
  // Stage 3: Post-Regression
  PRE_RELEASE_CHERRY_PICKS_REMINDER = 'PRE_RELEASE_CHERRY_PICKS_REMINDER',
  CREATE_RELEASE_TAG = 'CREATE_RELEASE_TAG',
  CREATE_FINAL_RELEASE_NOTES = 'CREATE_FINAL_RELEASE_NOTES',
  TRIGGER_TEST_FLIGHT_BUILD = 'TRIGGER_TEST_FLIGHT_BUILD',
  CREATE_AAB_BUILD = 'CREATE_AAB_BUILD',
  SEND_POST_REGRESSION_MESSAGE = 'SEND_POST_REGRESSION_MESSAGE',
  CHECK_PROJECT_RELEASE_APPROVAL = 'CHECK_PROJECT_RELEASE_APPROVAL',
  COMPLETE_POST_REGRESSION = 'COMPLETE_POST_REGRESSION',
  
  // Manual API
  SUBMIT_TO_TARGET = 'SUBMIT_TO_TARGET',
}

/**
 * Task Status - Current status of a task
 * Matches backend contract: 'PENDING' | 'IN_PROGRESS' | 'AWAITING_CALLBACK' | 'COMPLETED' | 'FAILED' | 'SKIPPED'
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_CALLBACK = 'AWAITING_CALLBACK',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

/**
 * Task Conclusion - Final conclusion of a task
 * Matches backend contract: 'success' | 'failure' | 'cancelled' | 'skipped' | null
 */
export type TaskConclusion = 'success' | 'failure' | 'cancelled' | 'skipped' | null;

/**
 * Stage Status - Current status of a stage
 * Matches backend contract: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
 */
export enum StageStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

/**
 * Regression Cycle Status
 * Matches backend contract: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'ABANDONED'
 */
export enum RegressionCycleStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  ABANDONED = 'ABANDONED',
}

/**
 * Build Upload Stage - Which stage a build is uploaded for
 */
export enum BuildUploadStage {
  PRE_REGRESSION = 'PRE_REGRESSION',
  REGRESSION = 'REGRESSION',
  PRE_RELEASE = 'PRE_RELEASE',
}

/**
 * Platform - Build platforms
 */
export enum Platform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB',
}

/**
 * Release Status - Overall lifecycle state of a release
 * Matches backend contract from API #1: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'COMPLETED' | 'ARCHIVED'
 */
export enum ReleaseStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Release Phase - Detailed phase of release process
 * Matches backend contract from API #1
 */
export enum Phase {
  NOT_STARTED = 'NOT_STARTED',
  KICKOFF = 'KICKOFF',
  AWAITING_REGRESSION = 'AWAITING_REGRESSION',
  REGRESSION = 'REGRESSION',
  REGRESSION_AWAITING_NEXT_CYCLE = 'REGRESSION_AWAITING_NEXT_CYCLE',
  AWAITING_POST_REGRESSION = 'AWAITING_POST_REGRESSION',
  POST_REGRESSION = 'POST_REGRESSION',
  AWAITING_SUBMISSION = 'AWAITING_SUBMISSION',
  SUBMISSION = 'SUBMISSION',
  SUBMITTED_PENDING_APPROVAL = 'SUBMITTED_PENDING_APPROVAL',
  COMPLETED = 'COMPLETED',
  PAUSED_BY_USER = 'PAUSED_BY_USER',
  PAUSED_BY_FAILURE = 'PAUSED_BY_FAILURE',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Cron Status - Cron job execution state
 * Matches backend contract
 */
export enum CronStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

/**
 * Pause Type - Reason why cron is stopped
 * Matches backend contract
 */
export enum PauseType {
  NONE = 'NONE',
  AWAITING_STAGE_TRIGGER = 'AWAITING_STAGE_TRIGGER',
  USER_REQUESTED = 'USER_REQUESTED',
  TASK_FAILURE = 'TASK_FAILURE',
}

