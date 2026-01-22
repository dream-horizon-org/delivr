/**
 * Task Output Type Definitions
 * 
 * Structured outputs for different task types.
 * Each task type has its own specific output interface.
 */

/**
 * Fork Branch Task Output
 * Task Type: FORK_BRANCH
 */
export interface ForkBranchTaskOutput {
  branchName: string;
  branchUrl: string;
}

/**
 * Project Management Task Output
 * Task Type: CREATE_PROJECT_MANAGEMENT_TICKET
 */
export interface ProjectManagementTaskOutput {
  platforms: Array<{
    platform: string;
    ticketUrl: string;
  }>;
}

/**
 * Test Management Task Output
 * Task Type: CREATE_TEST_SUITE
 */
export interface TestManagementTaskOutput {
  platforms: Array<{
    platform: string;
    runId: string;
    runUrl: string;
  }>;
}

/**
 * RC Tag Task Output
 * Task Type: CREATE_RC_TAG
 */
export interface CreateRcTagTaskOutput {
  tagName: string;
  tagUrl: string;
}

/**
 * Release Notes Task Output
 * Task Type: CREATE_RELEASE_NOTES
 */
export interface ReleaseNotesTaskOutput {
  tagUrl: string;
}

/**
 * Release Tag Task Output
 * Task Type: CREATE_RELEASE_TAG
 */
export interface CreateReleaseTagTaskOutput {
  tagName: string;
  tagUrl: string;
}

/**
 * Final Release Notes Task Output
 * Task Type: CREATE_FINAL_RELEASE_NOTES
 */
export interface FinalReleaseNotesTaskOutput {
  tagUrl: string;
}

/**
 * Single Platform Build Task Output
 * Task Types: TRIGGER_TEST_FLIGHT_BUILD, CREATE_AAB_BUILD
 * These tasks create one build per task (platform-specific)
 */
export interface SinglePlatformBuildTaskOutput {
  jobUrl: string | null;  // CI/CD job URL (e.g., Jenkins job URL)
}

/**
 * All Platforms Build Task Output
 * Task Types: TRIGGER_PRE_REGRESSION_BUILDS, TRIGGER_REGRESSION_BUILDS
 * These tasks create multiple builds (one per platform)
 */
export interface AllPlatformsBuildTaskOutput {
  platforms: Array<{
    platform: string;
    jobUrl: string | null;
  }>;
}

/**
 * Union type for all task outputs
 * Maps task types to their specific output interfaces
 */
export type TaskOutput =
  | ForkBranchTaskOutput
  | ProjectManagementTaskOutput
  | TestManagementTaskOutput
  | CreateRcTagTaskOutput
  | ReleaseNotesTaskOutput
  | CreateReleaseTagTaskOutput
  | FinalReleaseNotesTaskOutput
  | SinglePlatformBuildTaskOutput
  | AllPlatformsBuildTaskOutput;

