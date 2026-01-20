/**
 * CreateReleaseNotesTaskDetails Component
 * Displays release notes information for CREATE_RELEASE_NOTES tasks
 */

import { Group, Stack, Text } from '@mantine/core';
import { Anchor } from '@mantine/core';
import { IconExternalLink, IconFileText } from '@tabler/icons-react';
import type { Task } from '~/types/release-process.types';
import { TaskStatus } from '~/types/release-process-enums';
import type { ReleaseNotesTaskOutput } from '~/types/task-details.types';

interface CreateReleaseNotesTaskDetailsProps {
  task: Task;
}

export function CreateReleaseNotesTaskDetails({ task }: CreateReleaseNotesTaskDetailsProps) {
  // Only read output when task is COMPLETED or FAILED
  const output = (task.taskStatus === TaskStatus.COMPLETED || task.taskStatus === TaskStatus.FAILED)
    ? (task.output as ReleaseNotesTaskOutput | null)
    : null;

  // If FAILED, check for error in output
  if (task.taskStatus === TaskStatus.FAILED && output && 'error' in output) {
    return (
      <Stack gap="xs">
        <Text size="sm" c="red">
          {String(output.error)}
        </Text>
      </Stack>
    );
  }

  const tagUrl = output?.tagUrl;

  if (!tagUrl) {
    return (
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          No tag information available
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {/* Tag Link */}
      <Stack gap="xs">
        <Text size="xs" c="dimmed" fw={500}>
          Tag
        </Text>
        <Anchor href={tagUrl} target="_blank" size="sm" c="brand">
          <Group gap={4}>
            <IconFileText size={14} />
            <Text size="sm">View Tag</Text>
            <IconExternalLink size={14} />
          </Group>
        </Anchor>
      </Stack>
    </Stack>
  );
}

