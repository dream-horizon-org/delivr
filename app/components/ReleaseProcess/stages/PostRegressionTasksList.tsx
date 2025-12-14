/**
 * PostRegressionTasksList Component
 * Wrapper around shared TasksList component for Post-Regression stage
 */

import { POST_REGRESSION_LABELS } from '~/constants/release-process-ui';
import type { Task } from '~/types/release-process.types';
import { TasksList } from '../shared/TasksList';

interface PostRegressionTasksListProps {
  tasks: Task[];
  tenantId: string;
  releaseId: string;
  onRetry: (taskId: string) => void;
}

export function PostRegressionTasksList({
  tasks,
  tenantId,
  releaseId,
  onRetry,
}: PostRegressionTasksListProps) {
  return (
    <TasksList
      tasks={tasks}
      tenantId={tenantId}
      releaseId={releaseId}
      onRetry={onRetry}
      emptyMessage={POST_REGRESSION_LABELS.NO_TASKS || 'No tasks available'}
    />
  );
}

