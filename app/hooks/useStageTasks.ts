/**
 * useStageTasks Hook
 * Shared hook for task filtering and management across stage components
 */

import { useMemo, useState } from 'react';
import { filterAndSortTasks } from '~/utils/task-filtering';
import type { Task } from '~/types/release-process.types';

interface UseStageTasksOptions {
  tasks: Task[];
}

export function useStageTasks({ tasks }: UseStageTasksOptions) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Sort and filter tasks by status
  const filteredTasks = useMemo(() => {
    return filterAndSortTasks(tasks, statusFilter);
  }, [tasks, statusFilter]);

  const hasTasks = tasks && tasks.length > 0;

  return {
    tasks: filteredTasks,
    hasTasks,
    statusFilter,
    setStatusFilter,
  };
}

