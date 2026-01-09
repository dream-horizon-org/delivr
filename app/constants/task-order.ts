/**
 * Task Execution Order
 * Defines the order tasks should be displayed and executed within each stage
 * Matches the release process flow
 */

import { TaskStage, TaskType } from '~/types/release-process-enums';

export const TASK_ORDER: Record<TaskStage, TaskType[]> = {
  [TaskStage.KICKOFF]: [
    TaskType.FORK_BRANCH,
    TaskType.CREATE_TEST_SUITE,
    TaskType.CREATE_PROJECT_MANAGEMENT_TICKET,
    TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
  ],
  [TaskStage.REGRESSION]: [
    TaskType.RESET_TEST_SUITE, // Only for subsequent slots
    TaskType.CREATE_RC_TAG,
    TaskType.CREATE_RELEASE_NOTES,
    TaskType.TRIGGER_REGRESSION_BUILDS,
  ],
  [TaskStage.PRE_RELEASE]: [
    TaskType.CREATE_RELEASE_TAG,
    TaskType.CREATE_FINAL_RELEASE_NOTES,
    TaskType.TRIGGER_TEST_FLIGHT_BUILD,
    TaskType.CREATE_AAB_BUILD,
  ],
  [TaskStage.DISTRIBUTION]: [], // No tasks in distribution stage
};

