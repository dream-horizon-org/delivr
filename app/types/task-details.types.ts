/**
 * Task Detail Types
 * TypeScript interfaces for task-specific output structures
 * These types are re-exported from release-process.types.ts for component usage
 * Each interface matches the component name and expected data structure
 */

// Import and re-export output types from release-process.types.ts
import type {
  ForkBranchTaskOutput,
  ProjectManagementTaskOutput,
  TestManagementTaskOutput,
  CreateRcTagTaskOutput,
  ReleaseNotesTaskOutput,
  CreateReleaseTagTaskOutput,
  FinalReleaseNotesTaskOutput,
  BuildTaskOutput,
  TaskOutput,
} from './release-process.types';

export type {
  ForkBranchTaskOutput,
  ProjectManagementTaskOutput,
  TestManagementTaskOutput,
  CreateRcTagTaskOutput,
  ReleaseNotesTaskOutput,
  CreateReleaseTagTaskOutput,
  FinalReleaseNotesTaskOutput,
  BuildTaskOutput,
  TaskOutput,
};

/**
 * Legacy type aliases for backward compatibility
 * @deprecated Use the Output types directly (e.g., ForkBranchTaskOutput instead of ForkBranchTaskDetailsData)
 */
export type ForkBranchTaskDetailsData = ForkBranchTaskOutput;
export type ProjectManagementTaskDetailsData = ProjectManagementTaskOutput;
export type CreateTestSuiteTaskDetailsData = TestManagementTaskOutput;
export type ResetTestSuiteTaskDetailsData = TestManagementTaskOutput;
export type CreateRcTagTaskDetailsData = CreateRcTagTaskOutput;
export type CreateReleaseNotesTaskDetailsData = ReleaseNotesTaskOutput;
export type CreateReleaseTagTaskDetailsData = CreateReleaseTagTaskOutput;
export type CreateFinalReleaseNotesTaskDetailsData = FinalReleaseNotesTaskOutput;

