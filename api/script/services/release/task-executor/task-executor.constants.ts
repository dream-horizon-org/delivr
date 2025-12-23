import { TaskType, TaskStage } from '~models/release/release.interface';

/**
 * Maps TaskType enum to TaskStage
 */
export const TASK_TYPE_TO_STAGE: Record<TaskType, TaskStage> = {
  // Stage 1: Kickoff
  [TaskType.FORK_BRANCH]: TaskStage.KICKOFF,
  [TaskType.CREATE_PROJECT_MANAGEMENT_TICKET]: TaskStage.KICKOFF,
  [TaskType.CREATE_TEST_SUITE]: TaskStage.KICKOFF,
  [TaskType.TRIGGER_PRE_REGRESSION_BUILDS]: TaskStage.KICKOFF,
  // Stage 2: Regression
  [TaskType.RESET_TEST_SUITE]: TaskStage.REGRESSION,
  [TaskType.CREATE_RC_TAG]: TaskStage.REGRESSION,
  [TaskType.CREATE_RELEASE_NOTES]: TaskStage.REGRESSION,
  [TaskType.TRIGGER_REGRESSION_BUILDS]: TaskStage.REGRESSION,
  [TaskType.TRIGGER_AUTOMATION_RUNS]: TaskStage.REGRESSION,
  [TaskType.AUTOMATION_RUNS]: TaskStage.REGRESSION,
  // Stage 3: Pre-Release
  [TaskType.CREATE_RELEASE_TAG]: TaskStage.PRE_RELEASE,
  [TaskType.CREATE_FINAL_RELEASE_NOTES]: TaskStage.PRE_RELEASE,
  [TaskType.TRIGGER_TEST_FLIGHT_BUILD]: TaskStage.PRE_RELEASE,
  [TaskType.CREATE_AAB_BUILD]: TaskStage.PRE_RELEASE
} as const;

/**
 * Maps TaskStage enum to human-readable stage names
 */
export const STAGE_TO_NAME: Record<TaskStage, string> = {
  [TaskStage.KICKOFF]: 'Kickoff',
  [TaskStage.REGRESSION]: 'Regression',
  [TaskStage.PRE_RELEASE]: 'Pre-Release'
} as const;

/**
 * Maps TaskType enum to human-readable task names (without stage)
 */
export const TASK_TYPE_TO_NAME: Record<TaskType, string> = {
  [TaskType.FORK_BRANCH]: 'Branch Forkout',
  [TaskType.CREATE_PROJECT_MANAGEMENT_TICKET]: 'Project Management Ticket',
  [TaskType.CREATE_TEST_SUITE]: 'Test Suite',
  [TaskType.TRIGGER_PRE_REGRESSION_BUILDS]: 'Pre-Regression Builds',
  [TaskType.RESET_TEST_SUITE]: 'Test Suite Reset',
  [TaskType.CREATE_RC_TAG]: 'RC Tag Creation',
  [TaskType.CREATE_RELEASE_NOTES]: 'Release Notes',
  [TaskType.TRIGGER_REGRESSION_BUILDS]: 'Regression Builds',
  [TaskType.TRIGGER_AUTOMATION_RUNS]: 'Automation Runs',
  [TaskType.AUTOMATION_RUNS]: 'Automation Runs',
  [TaskType.CREATE_RELEASE_TAG]: 'Release Tag Creation',
  [TaskType.CREATE_FINAL_RELEASE_NOTES]: 'Final Release Notes',
  [TaskType.TRIGGER_TEST_FLIGHT_BUILD]: 'TestFlight Build',
  [TaskType.CREATE_AAB_BUILD]: 'AAB Build'
} as const;

/**
 * Get task name with stage suffix
 * Format: "Task Name Task in Stage Name Stage" (e.g., "Branch Forkout Task in Kickoff Stage")
 */
export const getTaskNameWithStage = (taskType: TaskType): string => {
  const taskName = TASK_TYPE_TO_NAME[taskType] || taskType;
  const stage = TASK_TYPE_TO_STAGE[taskType];
  const stageName = STAGE_TO_NAME[stage];
  return `${taskName} Task in ${stageName} Stage`;
};

