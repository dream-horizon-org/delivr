/**
 * RegularTaskDetails Component
 * Handles expanded content for non-build tasks
 * Includes: external links, task metadata, timestamps
 */

import { Group, Paper, Stack, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import type { Task } from '~/types/release-process.types';
import { TaskStatus, TaskType } from '~/types/release-process-enums';
import { Anchor } from '@mantine/core';

interface RegularTaskDetailsProps {
  task: Task;
}

export function RegularTaskDetails({ task }: RegularTaskDetailsProps) {
  // Only read output when task is COMPLETED or FAILED (except build tasks which are handled separately)
  const isBuildTask = 
    task.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS ||
    task.taskType === TaskType.TRIGGER_REGRESSION_BUILDS ||
    task.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD ||
    task.taskType === TaskType.CREATE_AAB_BUILD;
  
  // For build tasks, output can be read even when IN_PROGRESS (special case)
  // For other tasks, only read when COMPLETED or FAILED
  const output = (isBuildTask || task.taskStatus === TaskStatus.COMPLETED || task.taskStatus === TaskStatus.FAILED)
    ? task.output
    : null;
  
  // Extract links based on output type
  let branchUrl: string | undefined;
  let ticketUrl: string | undefined;
  let runLink: string | undefined;
  let tagUrl: string | undefined;
  let jobUrl: string | undefined;
  
  if (output && typeof output === 'object' && output !== null) {
    // Handle different output types
    if ('branchUrl' in output) {
      branchUrl = output.branchUrl as string;
    }
    if ('tagUrl' in output) {
      tagUrl = output.tagUrl as string;
    }
    if ('jobUrl' in output) {
      jobUrl = output.jobUrl as string;
    }
    // For project management and test management, extract URLs from platforms array
    if ('platforms' in output && Array.isArray(output.platforms)) {
      const platforms = output.platforms as Array<{ ticketUrl?: string; runUrl?: string }>;
      ticketUrl = platforms[0]?.ticketUrl;
      runLink = platforms[0]?.runUrl;
    }
  }
  
  // If FAILED, check for error in output
  if (task.taskStatus === TaskStatus.FAILED && output && typeof output === 'object' && 'error' in output) {
    return (
      <Stack gap="md">
        <Stack gap="xs">
          <Text size="sm" c="red">
            {String(output.error)}
          </Text>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
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
      {(branchUrl || ticketUrl || runLink || tagUrl || jobUrl) && (
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
            {tagUrl && (
              <Anchor href={tagUrl} target="_blank" size="sm" c="brand">
                <Group gap={4}>
                  <IconExternalLink size={14} />
                  <Text size="sm">View Tag</Text>
                </Group>
              </Anchor>
            )}
            {jobUrl && (
              <Anchor href={jobUrl} target="_blank" size="sm" c="brand">
                <Group gap={4}>
                  <IconExternalLink size={14} />
                  <Text size="sm">View Job</Text>
                </Group>
              </Anchor>
            )}
          </Group>
        </Stack>
      )}

      {/* Task Metadata */}
      {output && typeof output === 'object' && output !== null && !('branchUrl' in output) && !('tagUrl' in output) && !('jobUrl' in output) && !('platforms' in output) && !('error' in output) && (
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Additional Information
          </Text>
          <Paper p="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
            <Text size="xs" className="font-mono" style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(output, null, 2)}
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
  );
}


