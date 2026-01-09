/**
 * TaskCard Component
 * Flat, full-width, expandable card for displaying tasks
 * Delegates to specialized components based on task type
 */

import {
  Accordion,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconCheck,
  IconChevronDown,
  IconClock,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import {
  BUTTON_LABELS,
  getTaskStatusColor,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from '~/constants/release-process-ui';
import { TaskStatus, TaskType } from '~/types/release-process-enums';
import type { BuildInfo, Task } from '~/types/release-process.types';
import { BuildTaskDetails } from './BuildTaskDetails';
import {
  CreateFinalReleaseNotesTaskDetails,
  CreateRcTagTaskDetails,
  CreateReleaseNotesTaskDetails,
  CreateReleaseTagTaskDetails,
  CreateTestSuiteTaskDetails,
  ForkBranchTaskDetails,
  ProjectManagementTaskDetails,
  ResetTestSuiteTaskDetails,
} from './task-details';

interface TaskCardProps {
  task: Task;
  tenantId?: string;
  releaseId?: string;
  onRetry?: (taskId: string) => void;
  className?: string;
  uploadedBuilds?: BuildInfo[];  // Stage-level uploaded builds
}

function getTaskStatusIcon(status: TaskStatus) {
  switch (status) {
    case TaskStatus.COMPLETED:
      return <IconCheck size={16} />;
    case TaskStatus.FAILED:
      return <IconX size={16} />;
    case TaskStatus.IN_PROGRESS:
    case TaskStatus.AWAITING_CALLBACK:
    case TaskStatus.AWAITING_MANUAL_BUILD:
      return <IconClock size={16} />;
    default:
      return <IconClock size={16} />;
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function formatTaskDuration(task: Task): string | null {
  // Use createdAt and updatedAt for duration calculation
  const startTime = task.createdAt ? new Date(task.createdAt) : null;
  const endTime = task.updatedAt ? new Date(task.updatedAt) : null;
  
  if (!startTime) return null;
  
  if (task.taskStatus === TaskStatus.COMPLETED && endTime) {
    const duration = endTime.getTime() - startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
  
  // For in-progress tasks, show elapsed time
  if ((task.taskStatus === TaskStatus.IN_PROGRESS || 
       task.taskStatus === TaskStatus.AWAITING_CALLBACK || 
       task.taskStatus === TaskStatus.AWAITING_MANUAL_BUILD) && startTime) {
    const duration = Date.now() - startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return '< 1m';
  }
  
  return null;
}

export function TaskCard({
  task,
  tenantId,
  releaseId,
  onRetry,
  className,
  uploadedBuilds = [],
}: TaskCardProps) {
  const statusColor = getTaskStatusColor(task.taskStatus);
  const statusLabel = getTaskStatusLabel(task.taskStatus);
  const typeLabel = getTaskTypeLabel(task.taskType);
  const duration = formatTaskDuration(task);
  const canRetry = task.taskStatus === TaskStatus.FAILED && onRetry;

  // Determine if this is a build task
  const isBuildTask =
    task.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS ||
    task.taskType === TaskType.TRIGGER_REGRESSION_BUILDS ||
    task.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD ||
    task.taskType === TaskType.CREATE_AAB_BUILD;

  // Get the appropriate task detail component based on task type
  function renderTaskDetails() {
    if (isBuildTask) {
      return (
        <BuildTaskDetails
          task={task}
          tenantId={tenantId}
          releaseId={releaseId}
          uploadedBuilds={uploadedBuilds}
        />
      );
    }

    switch (task.taskType) {
      case TaskType.FORK_BRANCH:
        return <ForkBranchTaskDetails task={task} />;
      case TaskType.CREATE_PROJECT_MANAGEMENT_TICKET:
        return <ProjectManagementTaskDetails task={task} />;
      case TaskType.CREATE_TEST_SUITE:
        return <CreateTestSuiteTaskDetails task={task} />;
      case TaskType.RESET_TEST_SUITE:
        return <ResetTestSuiteTaskDetails task={task} />;
      case TaskType.CREATE_RC_TAG:
        return <CreateRcTagTaskDetails task={task} />;
      case TaskType.CREATE_RELEASE_NOTES:
        return <CreateReleaseNotesTaskDetails task={task} />;
      case TaskType.CREATE_RELEASE_TAG:
        return <CreateReleaseTagTaskDetails task={task} />;
      case TaskType.CREATE_FINAL_RELEASE_NOTES:
        return <CreateFinalReleaseNotesTaskDetails task={task} />;
      default:
        // Fallback for any unknown task types
        return null;
    }
  }

  return (
    <Paper
      p="md"
      radius="md"
      withBorder={false}
      style={{
        border: '1px solid var(--mantine-color-gray-3)',
        backgroundColor: 'var(--mantine-color-white)',
      }}
      className={className}
    >
      <Accordion
        styles={{
          item: {
            border: 'none',
          },
          control: {
            padding: 0,
          },
          content: {
            padding: 0,
            paddingTop: 'var(--mantine-spacing-md)',
          },
        }}
      >
        <Accordion.Item value="details">
          {/* Header - Always visible */}
          <Accordion.Control
            icon={
              <ThemeIcon
                color={statusColor}
                variant="light"
                size="sm"
                radius="xl"
              >
                {getTaskStatusIcon(task.taskStatus)}
              </ThemeIcon>
            }
            chevron={<IconChevronDown size={16} />}
          >
            <Group justify="space-between" style={{ flex: 1 }} wrap="nowrap">
              <Stack gap={4} style={{ flex: 1 }}>
                <Text fw={600} size="sm">
                  {typeLabel}
                </Text>
                <Group gap="xs">
                  <Badge
                    color={statusColor}
                    variant="light"
                    size="sm"
                    style={{ fontSize: '0.7rem' }}
                  >
                    {statusLabel}
                  </Badge>
                  {task.updatedAt && (
                    <Text size="xs" c="dimmed">
                      Updated {formatTimeAgo(task.updatedAt)}
                    </Text>
                  )}
                  {duration && (
                    <Text size="xs" c="dimmed">
                      • {duration}
                    </Text>
                  )}
                </Group>
              </Stack>

              {/* Actions */}
              <Group gap="xs" onClick={(e) => e.stopPropagation()}>
                {canRetry && (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconRefresh size={14} />}
                    onClick={() => onRetry?.(task.id)}
                  >
                    {BUTTON_LABELS.RETRY}
                  </Button>
                )}
              </Group>
            </Group>
          </Accordion.Control>

          {/* Expanded Content */}
          <Accordion.Panel>
            <Stack gap="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
              {renderTaskDetails()}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Paper>
  );
}
