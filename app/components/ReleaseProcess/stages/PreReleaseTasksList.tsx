/**
 * PreReleaseTasksList Component
 * Wrapper around shared TasksList component for Pre-Release stage
 */

import { PRE_RELEASE_LABELS } from '~/constants/release-process-ui';
import type { Task, BuildInfo } from '~/types/release-process.types';
import { TaskStage } from '~/types/release-process-enums';
import { TasksList } from '../shared/TasksList';

interface PreReleaseTasksListProps {
  tasks: Task[];
  tenantId: string;
  releaseId: string;
  onRetry: (taskId: string) => void;
  uploadedBuilds?: BuildInfo[];
  isArchived?: boolean;
}

export function PreReleaseTasksList({
  tasks,
  tenantId,
  releaseId,
  onRetry,
  uploadedBuilds = [],
  isArchived = false,
}: PreReleaseTasksListProps) {
  return (
    <TasksList
      tasks={tasks}
      tenantId={tenantId}
      releaseId={releaseId}
      onRetry={onRetry}
      emptyMessage={PRE_RELEASE_LABELS.NO_TASKS || 'No tasks available'}
      uploadedBuilds={uploadedBuilds}
      isArchived={isArchived}
      stage={TaskStage.PRE_RELEASE}
    />
  );
}


