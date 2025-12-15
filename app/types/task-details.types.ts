/**
 * Task Detail Types
 * TypeScript interfaces for task-specific externalData structures
 * Each interface matches the component name and expected data structure
 */

/**
 * ForkBranchTaskDetails - FORK_BRANCH task
 */
export interface ForkBranchTaskDetailsData {
  branchName: string;
  branchUrl: string;
}

/**
 * ProjectManagementTaskDetails - CREATE_PROJECT_MANAGEMENT_TICKET task
 */
export interface ProjectManagementTaskDetailsData {
  projectManagement: {
    platforms: Array<{
      platform: string;
      ticketUrl: string;
    }>;
  };
}

/**
 * CreateTestSuiteTaskDetails - CREATE_TEST_SUITE task
 */
export interface CreateTestSuiteTaskDetailsData {
  testManagement: {
    platforms: Array<{
      platform: string;
      runId: string;
      runUrl: string;
    }>;
  };
}

/**
 * ResetTestSuiteTaskDetails - RESET_TEST_SUITE task
 */
export interface ResetTestSuiteTaskDetailsData {
  testManagement: {
    platforms: Array<{
      platform: string;
      runId: string;
      runUrl: string;
    }>;
  };
}

/**
 * CreateRcTagTaskDetails - CREATE_RC_TAG task
 */
export interface CreateRcTagTaskDetailsData {
  tagName: string;
  tagUrl: string;
}

/**
 * CreateReleaseNotesTaskDetails - CREATE_RELEASE_NOTES task
 */
export interface CreateReleaseNotesTaskDetailsData {
  notesUrl: string;
}

/**
 * CreateReleaseTagTaskDetails - CREATE_RELEASE_TAG task
 */
export interface CreateReleaseTagTaskDetailsData {
  tagName: string;
  tagUrl: string;
}

/**
 * CreateFinalReleaseNotesTaskDetails - CREATE_FINAL_RELEASE_NOTES task
 */
export interface CreateFinalReleaseNotesTaskDetailsData {
  notesUrl: string;
}

