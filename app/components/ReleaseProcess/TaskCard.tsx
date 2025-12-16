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
  Grid,
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
import { PMApprovalStatus } from '~/components/Distribution';
import { useRelease } from '~/hooks/useRelease';
import type { Task } from '~/types/release-process.types';
import { TaskStatus, TaskType, BuildUploadStage, Platform } from '~/types/release-process-enums';
import type { PMStatusResponse } from '~/types/distribution/distribution.types';
import { ManualBuildUploadWidget } from './ManualBuildUploadWidget';

interface TaskCardProps {
  task: Task;
  tenantId?: string;
  releaseId?: string;
  onRetry?: (taskId: string) => void;
  onViewDetails?: (task: Task) => void;
  className?: string;
  // Enhanced props for post-regression
  pmStatus?: PMStatusResponse['data'];
  onApproveRequested?: () => void;
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
  pmStatus,
  onApproveRequested,
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
    task.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD ||
    task.taskType === TaskType.CREATE_AAB_BUILD;

  // Determine build stage based on task type
  const getBuildStage = (): BuildUploadStage | null => {
    if (task.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS) {
      return BuildUploadStage.PRE_REGRESSION;
    }
    if (task.taskType === TaskType.TRIGGER_REGRESSION_BUILDS) {
      return BuildUploadStage.REGRESSION;
    }
    if (task.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD || task.taskType === TaskType.CREATE_AAB_BUILD) {
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
  
  // Extract artifact links for successful build tasks
  // Only show for file-based builds (not TestFlight/AAB which go to internal tracks)
  const isFileBasedBuildTask = 
    task.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS ||
    task.taskType === TaskType.TRIGGER_REGRESSION_BUILDS;
  const hasCompletedBuild = 
    task.taskStatus === TaskStatus.COMPLETED && 
    isFileBasedBuildTask;
  
  // Artifact links can be stored as artifactPath, artifactUrl, or builds array
  const artifactPath = task.externalData?.artifactPath as string | undefined;
  const artifactUrl = task.externalData?.artifactUrl as string | undefined;
  const builds = task.externalData?.builds as Array<{ 
    artifactPath?: string; 
    artifactUrl?: string; 
    platform?: string;
    downloadUrl?: string;
  }> | undefined;
  
  // Collect all artifact links
  const artifactLinks: Array<{ url: string; platform?: string; label: string }> = [];
  
  if (hasCompletedBuild) {
    // Single artifact path/url (for single platform builds)
    const singleArtifactUrl = artifactUrl || artifactPath;
    if (singleArtifactUrl && (!builds || builds.length === 0)) {
      artifactLinks.push({ url: singleArtifactUrl, label: 'Download Artifact' });
    }
    
    // Multiple builds (for regression cycles with multiple platforms)
    if (builds && Array.isArray(builds) && builds.length > 0) {
      builds.forEach((build) => {
        const buildUrl = build.downloadUrl || build.artifactUrl || build.artifactPath;
        if (buildUrl) {
          const platformLabel = build.platform ? ` (${build.platform})` : '';
          artifactLinks.push({ 
            url: buildUrl, 
            platform: build.platform,
            label: `Download Artifact${platformLabel}` 
          });
        }
      });
    }
  }

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
              {task.externalId && (
                <Stack gap="xs">
                  <Group gap="md">
                    <div>
                      <Text size="xs" c="dimmed">
                        External ID
                      </Text>
                      <Text size="sm" fw={500}>
                        {task.externalId}
                      </Text>
                    </div>
                  </Group>
                </Stack>
              )}

              {/* External Links */}
              {(branchUrl || ticketUrl || runLink || artifactLinks.length > 0) && (
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
                    {artifactLinks.map((artifact, index) => (
                      <Anchor 
                        key={index} 
                        href={artifact.url} 
                        target="_blank" 
                        size="sm" 
                        c="brand"
                        download
                      >
                        <Group gap={4}>
                          <IconExternalLink size={14} />
                          <Text size="sm">{artifact.label}</Text>
                        </Group>
                      </Anchor>
                    ))}
                  </Group>
                </Stack>
              )}

              {/* Build Upload Widget - Unified for all build tasks in manual mode */}
              {showBuildUpload && buildStage && tenantId && releaseId && (
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" fw={500}>
                    Upload Builds
                  </Text>
                  {task.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS ? (
                    // Pre-Regression: Show one widget per platform in a row
                    (() => {
                      const platforms = release?.platformTargetMappings
                        ?.map(m => m.platform)
                        .filter((p, i, arr) => arr.indexOf(p) === i) || [];
                      
                      return platforms.length > 0 ? (
                        <Grid gutter="md">
                          {platforms.map((platform) => (
                            <Grid.Col key={platform} span={{ base: 12, sm: 6, md: platforms.length === 2 ? 6 : platforms.length === 3 ? 4 : 6 }}>
                              <ManualBuildUploadWidget
                                tenantId={tenantId}
                                releaseId={releaseId}
                                stage={buildStage}
                                taskType={task.taskType}
                                platform={platform}
                                onUploadComplete={handleUploadComplete}
                              />
                            </Grid.Col>
                          ))}
                        </Grid>
                      ) : null;
                    })()
                  ) : task.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD ? (
                    // Post-Regression TestFlight: Only iOS
                    <ManualBuildUploadWidget
                      tenantId={tenantId}
                      releaseId={releaseId}
                      stage={buildStage}
                      taskType={task.taskType}
                      platform={Platform.IOS}
                      onUploadComplete={handleUploadComplete}
                    />
                  ) : task.taskType === TaskType.CREATE_AAB_BUILD ? (
                    // Post-Regression AAB: Only Android
                    <ManualBuildUploadWidget
                      tenantId={tenantId}
                      releaseId={releaseId}
                      stage={buildStage}
                      taskType={task.taskType}
                      platform={Platform.ANDROID}
                      onUploadComplete={handleUploadComplete}
                    />
                  ) : task.taskType === TaskType.TRIGGER_REGRESSION_BUILDS ? (
                    // Regression builds: Show Android and iOS widgets in a row
                    <Grid gutter="md">
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <ManualBuildUploadWidget
                          tenantId={tenantId}
                          releaseId={releaseId}
                          stage={buildStage}
                          taskType={task.taskType}
                          platform={Platform.ANDROID}
                          onUploadComplete={handleUploadComplete}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <ManualBuildUploadWidget
                          tenantId={tenantId}
                          releaseId={releaseId}
                          stage={buildStage}
                          taskType={task.taskType}
                          platform={Platform.IOS}
                          onUploadComplete={handleUploadComplete}
                        />
                      </Grid.Col>
                    </Grid>
                  ) : null}
                </Stack>
              )}

              {/* PM Approval Status - For CHECK_PROJECT_RELEASE_APPROVAL task */}
              {task.taskType === TaskType.CHECK_PROJECT_RELEASE_APPROVAL && pmStatus && (
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" fw={500}>
                    Approval Status
                  </Text>
                  <PMApprovalStatus
                    pmStatus={pmStatus}
                    isApproving={false}
                    onApproveRequested={onApproveRequested}
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
