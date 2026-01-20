/**
 * Task Filtering and Sorting Utilities
 * Shared logic for filtering and sorting tasks by status
 */

import type { Task } from '~/types/release-process.types';
import { TASK_STATUS_ORDER } from '~/constants/release-process-ui';
import { TaskType, TaskStage } from '~/types/release-process-enums';
import { TASK_ORDER } from '~/constants/task-order';

/**
 * Filter out tasks with unknown task types
 * Only keeps tasks that are in the TaskType enum
 * @param tasks - Array of tasks to filter
 * @returns Filtered tasks with only valid task types
 */
export function filterValidTaskTypes(tasks: Task[]): Task[] {
  if (!tasks || tasks.length === 0) return [];
  
  // Get all valid task type values from enum
  const validTaskTypes = new Set(Object.values(TaskType));
  
  // Filter tasks and log warnings for unknown types
  const filtered = tasks.filter((task) => {
    const isValid = validTaskTypes.has(task.taskType as TaskType);
    
    if (!isValid) {
      console.warn(
        `[filterValidTaskTypes] Filtering out unknown task type: ${task.taskType}`,
        {
          taskId: task.id,
          taskType: task.taskType,
          stage: task.stage,
        }
      );
    }
    
    return isValid;
  });
  
  return filtered;
}

/**
 * Sort tasks by execution order (from TASK_ORDER), then by status
 * @param tasks - Array of tasks to sort
 * @param stage - The stage these tasks belong to
 * @returns Tasks sorted by execution order, then by status
 */
export function sortTasksByExecutionOrder(
  tasks: Task[],
  stage: TaskStage
): Task[] {
  const order = TASK_ORDER[stage];
  if (!order || order.length === 0) {
    // If no order defined, fall back to status sorting
    return [...tasks].sort((a, b) => {
      const orderA = TASK_STATUS_ORDER[a.taskStatus] || 99;
      const orderB = TASK_STATUS_ORDER[b.taskStatus] || 99;
      return orderA - orderB;
    });
  }

  return [...tasks].sort((a, b) => {
    // First, sort by execution order
    const orderA = order.indexOf(a.taskType);
    const orderB = order.indexOf(b.taskType);

    // If both tasks are in the order, compare by order
    if (orderA !== -1 && orderB !== -1) {
      // If same order position, sort by status
      if (orderA === orderB) {
        const statusA = TASK_STATUS_ORDER[a.taskStatus] || 99;
        const statusB = TASK_STATUS_ORDER[b.taskStatus] || 99;
        return statusA - statusB;
      }
      return orderA - orderB;
    }

    // If only one is in order, prioritize it
    if (orderA !== -1) return -1;
    if (orderB !== -1) return 1;

    // If neither is in order, sort by status
    const statusA = TASK_STATUS_ORDER[a.taskStatus] || 99;
    const statusB = TASK_STATUS_ORDER[b.taskStatus] || 99;
    return statusA - statusB;
  });
}

