/**
 * Task Sequencing Utilities
 * 
 * Functions to order tasks and check if previous tasks are complete.
 * Ensures tasks execute in the correct sequence within each stage.
 * 
 * Follows cursorrules: No 'any' types - use explicit types
 */

import { TaskType, TaskStage, TaskStatus } from '../models/release/release.interface';
import type { ReleaseTask } from '../models/release/release.interface';

/**
 * Task order configuration for each stage
 * Defines the execution order of tasks within each stage
 */
export const TASK_ORDER: Record<TaskStage, TaskType[]> = {
  [TaskStage.KICKOFF]: [
    TaskType.PRE_KICK_OFF_REMINDER,
    TaskType.FORK_BRANCH,
    TaskType.CREATE_PROJECT_MANAGEMENT_TICKET,
    TaskType.CREATE_TEST_SUITE,
    TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
  ],
  [TaskStage.REGRESSION]: [
    TaskType.RESET_TEST_SUITE, // Only for subsequent slots
    TaskType.CREATE_RC_TAG,
    TaskType.CREATE_RELEASE_NOTES,
    TaskType.TRIGGER_REGRESSION_BUILDS,
    TaskType.TRIGGER_AUTOMATION_RUNS,
    TaskType.AUTOMATION_RUNS,
    TaskType.SEND_REGRESSION_BUILD_MESSAGE,
  ],
  [TaskStage.POST_REGRESSION]: [
    TaskType.PRE_RELEASE_CHERRY_PICKS_REMINDER,
    TaskType.CREATE_RELEASE_TAG,
    TaskType.CREATE_FINAL_RELEASE_NOTES,
    TaskType.TRIGGER_TEST_FLIGHT_BUILD,
    TaskType.SEND_POST_REGRESSION_MESSAGE,
    TaskType.CHECK_PROJECT_RELEASE_APPROVAL,
  ],
};

/**
 * Configuration for optional tasks
 * Tasks that may not be required based on release/cron configuration
 */
export interface OptionalTaskConfig {
  hasProjectManagementIntegration?: boolean;
  hasTestPlatformIntegration?: boolean;
  hasIOSPlatform?: boolean; // For TRIGGER_TEST_FLIGHT_BUILD (only if iOS platform exists)
  cronConfig?: {
    kickOffReminder?: boolean;
    preRegressionBuilds?: boolean;
    automationBuilds?: boolean;
    automationRuns?: boolean;
    testFlightBuilds?: boolean; // For TRIGGER_TEST_FLIGHT_BUILD (must be true)
  };
  targets?: string[]; // Legacy: For TRIGGER_TEST_FLIGHT_BUILD (deprecated, use hasIOSPlatform + cronConfig.testFlightBuilds)
  isSubsequentSlot?: boolean; // For RESET_TEST_SUITE (only for subsequent regression slots)
}

/**
 * Check if a task is required based on configuration
 * 
 * @param taskType - The task type to check
 * @param config - Optional task configuration
 * @returns true if task is required, false if optional and not configured
 */
export function isTaskRequired(
  taskType: TaskType,
  config?: OptionalTaskConfig
): boolean {
  if (!config) {
    // If no config provided, assume all tasks are required
    return true;
  }

  switch (taskType) {
    case TaskType.PRE_KICK_OFF_REMINDER:
      // Optional: Only if cronConfig.kickOffReminder is true
      return config.cronConfig?.kickOffReminder === true;

    case TaskType.CREATE_PROJECT_MANAGEMENT_TICKET:
      // Optional: Only if project management integration is available
      return config.hasProjectManagementIntegration === true;

    case TaskType.CREATE_TEST_SUITE:
      // Optional: Only if test platform integration is available
      return config.hasTestPlatformIntegration === true;

    case TaskType.TRIGGER_PRE_REGRESSION_BUILDS:
      // Optional: Only if cronConfig.preRegressionBuilds is true
      return config.cronConfig?.preRegressionBuilds === true;

    case TaskType.RESET_TEST_SUITE:
      // Optional: Only for subsequent regression slots AND if test platform integration is available
      // Must match task creation logic in createStage2Tasks
      return config.isSubsequentSlot === true && config.hasTestPlatformIntegration === true;

    case TaskType.TRIGGER_AUTOMATION_RUNS:
      // Optional: Only if automation builds is enabled
      return config.cronConfig?.automationBuilds === true;

    case TaskType.AUTOMATION_RUNS:
      // Optional: Only if automation is enabled
      return config.cronConfig?.automationRuns === true;

    case TaskType.TRIGGER_TEST_FLIGHT_BUILD:
      // Optional: Only if iOS platform exists AND testFlightBuilds is enabled
      // Check both hasIOSPlatform and cronConfig.testFlightBuilds (matching task creation logic)
      return config.hasIOSPlatform === true && config.cronConfig?.testFlightBuilds === true;

    case TaskType.CHECK_PROJECT_RELEASE_APPROVAL:
      // Optional: Only if JIRA integration is available
      return config.hasProjectManagementIntegration === true;

    default:
      // All other tasks are always required
      return true;
  }
}

/**
 * Get ordered tasks for a specific stage
 * Sorts tasks based on TASK_ORDER configuration
 * 
 * @param tasks - Array of tasks to order
 * @param stage - The stage these tasks belong to
 * @returns Tasks sorted by execution order
 */
export function getOrderedTasks(
  tasks: ReleaseTask[],
  stage: TaskStage
): ReleaseTask[] {
  const order = TASK_ORDER[stage];
  if (!order) {
    // If stage not found in TASK_ORDER, return tasks as-is
    return tasks;
  }

  // Sort tasks based on their position in TASK_ORDER
  return [...tasks].sort((a, b) => {
    const orderA = order.indexOf(a.taskType);
    const orderB = order.indexOf(b.taskType);

    // If task type not found in order, put it at the end
    if (orderA === -1 && orderB === -1) {
      return 0; // Keep original order for unknown tasks
    }
    if (orderA === -1) {
      return 1; // Put unknown tasks at the end
    }
    if (orderB === -1) {
      return -1; // Put unknown tasks at the end
    }

    return orderA - orderB;
  });
}

/**
 * Check if all previous tasks (in execution order) are complete
 * 
 * @param task - The task to check previous tasks for
 * @param allTasks - All tasks in the stage (should be ordered)
 * @param stage - The stage these tasks belong to
 * @param config - Optional task configuration (for checking if tasks are required)
 * @returns true if all previous tasks are complete or not required
 */
export function arePreviousTasksComplete(
  task: ReleaseTask,
  allTasks: ReleaseTask[],
  stage: TaskStage,
  config?: OptionalTaskConfig
): boolean {
  const order = TASK_ORDER[stage];
  if (!order) {
    // If stage not found, assume no dependencies
    return true;
  }

  const taskIndex = order.indexOf(task.taskType);
  if (taskIndex === -1) {
    // Task not in order, assume no dependencies
    return true;
  }

  // Get all tasks that should execute before this task
  const previousTaskTypes = order.slice(0, taskIndex);

  // Check if all previous tasks are complete or not required
  for (const previousTaskType of previousTaskTypes) {
    // Find the task in allTasks
    const previousTask = allTasks.find(t => t.taskType === previousTaskType);
    
    if (!previousTask) {
      // Task doesn't exist - check if it's required
      if (isTaskRequired(previousTaskType, config)) {
        // Task is required but doesn't exist - previous tasks not complete
        return false;
      }
      // Task is not required - skip it
      continue;
    }

    // Check if task is required
    if (!isTaskRequired(previousTaskType, config)) {
      // Task is not required - skip it
      continue;
    }

    // Task is required - check if it's complete
    if (previousTask.taskStatus !== TaskStatus.COMPLETED) {
      return false;
    }
  }

  return true;
}

/**
 * Get the execution order index of a task within its stage
 * 
 * @param taskType - The task type
 * @param stage - The stage the task belongs to
 * @returns The index in the execution order, or -1 if not found
 */
export function getTaskOrderIndex(taskType: TaskType, stage: TaskStage): number {
  const order = TASK_ORDER[stage];
  if (!order) {
    return -1;
  }
  return order.indexOf(taskType);
}

/**
 * Reasons why a task cannot be executed
 */
export type TaskBlockReason = 
  | 'ALREADY_COMPLETED'       // Task is COMPLETED
  | 'ALREADY_SKIPPED'         // Task is SKIPPED
  | 'AWAITING_CALLBACK'       // Task is waiting for CI/CD callback
  | 'AWAITING_MANUAL_BUILD'   // Task is waiting for manual build upload
  | 'IN_PROGRESS'             // Task is currently running
  | 'NOT_REQUIRED'            // Task is optional and not configured
  | 'PREVIOUS_INCOMPLETE'     // Previous tasks not complete yet
  | 'NOT_TIME_YET'            // Time condition not met
  | 'EXECUTABLE';             // Task can be executed

/**
 * Get the reason why a task cannot be executed
 * Useful for improved logging
 * 
 * @param task - The task to check
 * @param allTasks - All tasks in the stage (should be ordered)
 * @param stage - The stage these tasks belong to
 * @param config - Optional task configuration
 * @param isTimeToExecute - Function to check if time-based task should execute
 * @returns TaskBlockReason indicating why task cannot execute or 'EXECUTABLE' if it can
 */
export function getTaskBlockReason(
  task: ReleaseTask,
  allTasks: ReleaseTask[],
  stage: TaskStage,
  config?: OptionalTaskConfig,
  isTimeToExecute?: (task: ReleaseTask) => boolean
): TaskBlockReason {
  // Check task status first (most common case)
  switch (task.taskStatus) {
    case TaskStatus.COMPLETED:
      return 'ALREADY_COMPLETED';
    case TaskStatus.SKIPPED:
      return 'ALREADY_SKIPPED';
    case TaskStatus.AWAITING_CALLBACK:
      return 'AWAITING_CALLBACK';
    case TaskStatus.AWAITING_MANUAL_BUILD:
      return 'AWAITING_MANUAL_BUILD';
    case TaskStatus.IN_PROGRESS:
      return 'IN_PROGRESS';
  }

  // Task must be in PENDING or FAILED status to proceed
  const isExecutableStatus = task.taskStatus === TaskStatus.PENDING || task.taskStatus === TaskStatus.FAILED;
  if (!isExecutableStatus) {
    return 'IN_PROGRESS'; // Fallback for unknown status
  }

  // Check if task is required
  if (!isTaskRequired(task.taskType, config)) {
    return 'NOT_REQUIRED';
  }

  // Check if previous tasks are complete
  if (!arePreviousTasksComplete(task, allTasks, stage, config)) {
    return 'PREVIOUS_INCOMPLETE';
  }

  // Check time-based execution (if function provided)
  if (isTimeToExecute && !isTimeToExecute(task)) {
    return 'NOT_TIME_YET';
  }

  return 'EXECUTABLE';
}

/**
 * Check if a task can be executed
 * Combines time-based checks, previous task completion, and task status
 * 
 * @param task - The task to check
 * @param allTasks - All tasks in the stage (should be ordered)
 * @param stage - The stage these tasks belong to
 * @param config - Optional task configuration
 * @param isTimeToExecute - Function to check if time-based task should execute (from time-utils)
 * @returns true if task can be executed
 */
export function canExecuteTask(
  task: ReleaseTask,
  allTasks: ReleaseTask[],
  stage: TaskStage,
  config?: OptionalTaskConfig,
  isTimeToExecute?: (task: ReleaseTask) => boolean
): boolean {
  return getTaskBlockReason(task, allTasks, stage, config, isTimeToExecute) === 'EXECUTABLE';
}

