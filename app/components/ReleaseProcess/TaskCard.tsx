/**
 * TaskCard Component
 * Flat, full-width, expandable card for displaying tasks
 * Shows build upload widget inside TRIGGER_PRE_REGRESSION_BUILDS task when manual mode
 */

import {
  Accordion,
  Anchor,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconChevronDown,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import {
  BUTTON_LABELS,
  TASK_CARD_LABELS,
  getTaskStatusColor,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from '~/constants/release-process-ui';
import { useRelease } from '~/hooks/useRelease';
import type { Task } from '~/types/release-process.types';
import { TaskStatus, TaskType, BuildUploadStage } from '~/types/release-process-enums';
import { ManualBuildUploadWidget } from './ManualBuildUploadWidget';

interface TaskCardProps {
  task: Task;
  tenantId?: string;
  releaseId?: string;
  onRetry?: (taskId: string) => void;
  onViewDetails?: (task: Task) => void;
  className?: string;
}

function getTaskStatusIcon(status: TaskStatus) {
  switch (status) {
    case TaskStatus.COMPLETED:
      return <IconCheck size={16} />;
    case TaskStatus.FAILED:
      return <IconX size={16} />;
    case TaskStatus.IN_PROGRESS:
    case TaskStatus.AWAITING_CALLBACK:
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
  if (!task.createdAt) return null;
  
  const startTime = new Date(task.createdAt);
  const endTime = task.updatedAt ? new Date(task.updatedAt) : new Date();
  
  if (task.taskStatus === TaskStatus.COMPLETED && task.updatedAt) {
    const duration = endTime.getTime() - startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
  
  return null;
}

export function TaskCard({
  task,
  tenantId,
  releaseId,
  onRetry,
  onViewDetails,
  className,
}: TaskCardProps) {
  const statusColor = getTaskStatusColor(task.taskStatus);
  const statusLabel = getTaskStatusLabel(task.taskStatus);
  const typeLabel = getTaskTypeLabel(task.taskType);
  const duration = formatTaskDuration(task);
  const canRetry = task.taskStatus === TaskStatus.FAILED && onRetry;

  // Get release to check hasManualBuildUpload flag
  const { release } = useRelease(tenantId || '', releaseId || '');
  const isManualMode = release?.hasManualBuildUpload === true;

  // Check if this is a build trigger task that needs manual upload
  const isBuildTriggerTask =
    task.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS ||
    task.taskType === TaskType.TRIGGER_REGRESSION_BUILDS ||
    task.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD;

  // Determine build stage based on task type
  const getBuildStage = (): BuildUploadStage | null => {
    if (task.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS) {
      return BuildUploadStage.PRE_REGRESSION;
    }
    if (task.taskType === TaskType.TRIGGER_REGRESSION_BUILDS) {
      return BuildUploadStage.REGRESSION;
    }
    if (task.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD) {
      return BuildUploadStage.PRE_RELEASE;
    }
    return null;
  };

  const buildStage = getBuildStage();
  const showBuildUpload =
    isManualMode &&
    isBuildTriggerTask &&
    buildStage &&
    (task.taskStatus === TaskStatus.PENDING ||
      task.taskStatus === TaskStatus.AWAITING_CALLBACK) &&
    tenantId &&
    releaseId;

  // Extract external links from externalData
  const branchUrl = task.externalData?.branchUrl as string | undefined;
  const ticketUrl = task.externalData?.ticketUrl as string | undefined;
  const runLink = task.externalData?.runLink as string | undefined;

  const handleUploadComplete = () => {
    // Refetch will be handled by parent component
    if (onViewDetails) {
      onViewDetails(task);
    }
  };

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
                  {task.createdAt && (
                    <Text size="xs" c="dimmed">
                      Started {formatTimeAgo(task.createdAt)}
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
              {/* Task Details */}
              <Stack gap="xs">
                <Text size="xs" c="dimmed" fw={500}>
                  Task Details
                </Text>
                <Group gap="md">
                  <div>
                    <Text size="xs" c="dimmed">
                      Task Type
                    </Text>
                    <Text size="sm" fw={500}>
                      {task.taskType}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Task ID
                    </Text>
                    <Text size="sm" fw={500} className="font-mono">
                      {task.taskId}
                    </Text>
                  </div>
                  {task.externalId && (
                    <div>
                      <Text size="xs" c="dimmed">
                        External ID
                      </Text>
                      <Text size="sm" fw={500}>
                        {task.externalId}
                      </Text>
                    </div>
                  )}
                </Group>
              </Stack>

              {/* External Links */}
              {(branchUrl || ticketUrl || runLink) && (
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" fw={500}>
                    Links
                  </Text>
                  <Group gap="md">
                    {branchUrl && (
                      <Anchor href={branchUrl} target="_blank" size="sm" c="brand">
                        <Group gap={4}>
                          <IconExternalLink size={14} />
                          <Text size="sm">View Branch</Text>
                        </Group>
                      </Anchor>
                    )}
                    {ticketUrl && (
                      <Anchor href={ticketUrl} target="_blank" size="sm" c="brand">
                        <Group gap={4}>
                          <IconExternalLink size={14} />
                          <Text size="sm">View Ticket</Text>
                        </Group>
                      </Anchor>
                    )}
                    {runLink && (
                      <Anchor href={runLink} target="_blank" size="sm" c="brand">
                        <Group gap={4}>
                          <IconExternalLink size={14} />
                          <Text size="sm">View Test Run</Text>
                        </Group>
                      </Anchor>
                    )}
                  </Group>
                </Stack>
              )}

              {/* Build Upload Widget - Only for build trigger tasks in manual mode */}
              {showBuildUpload && buildStage && tenantId && releaseId && (
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" fw={500}>
                    Upload Builds
                  </Text>
                  <ManualBuildUploadWidget
                    tenantId={tenantId}
                    releaseId={releaseId}
                    stage={buildStage}
                    onUploadComplete={handleUploadComplete}
                  />
                </Stack>
              )}

              {/* Task Metadata */}
              {task.externalData && Object.keys(task.externalData).length > 0 && (
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" fw={500}>
                    Additional Information
                  </Text>
                  <Paper p="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                    <Text size="xs" className="font-mono" style={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(task.externalData, null, 2)}
                    </Text>
                  </Paper>
                </Stack>
              )}

              {/* Timestamps */}
              <Group gap="md">
                {task.createdAt && (
                  <div>
                    <Text size="xs" c="dimmed">
                      Created
                    </Text>
                    <Text size="xs">
                      {new Date(task.createdAt).toLocaleString()}
                    </Text>
                  </div>
                )}
                {task.updatedAt && (
                  <div>
                    <Text size="xs" c="dimmed">
                      Updated
                    </Text>
                    <Text size="xs">
                      {new Date(task.updatedAt).toLocaleString()}
                    </Text>
                  </div>
                )}
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Paper>
  );
}
