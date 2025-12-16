/**
 * Task Filtering and Sorting Utilities
 * Shared logic for filtering and sorting tasks by status
 */

import type { Task } from '~/types/release-process.types';
import { TASK_STATUS_ORDER } from '~/constants/release-process-ui';
import { TaskType } from '~/types/release-process-enums';

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
 * Filter and sort tasks by status
 * @param tasks - Array of tasks to filter and sort
 * @param statusFilter - Optional status filter (null = all statuses)
 * @returns Filtered and sorted tasks
 */
export function filterAndSortTasks(
  tasks: Task[],
  statusFilter: string | null
): Task[] {
  if (!tasks || tasks.length === 0) return [];
  
  // Filter by status if filter is selected
  let filtered = statusFilter 
    ? tasks.filter((task) => task.taskStatus === statusFilter)
    : tasks;
  
  // Sort by status order
  return filtered.sort((a, b) => {
    const orderA = TASK_STATUS_ORDER[a.taskStatus] || 99;
    const orderB = TASK_STATUS_ORDER[b.taskStatus] || 99;
    return orderA - orderB;
  });
}

