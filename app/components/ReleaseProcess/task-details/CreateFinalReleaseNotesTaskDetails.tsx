/**
 * CreateFinalReleaseNotesTaskDetails Component
 * Displays final release notes information for CREATE_FINAL_RELEASE_NOTES tasks
 */

import { Group, Stack, Text } from '@mantine/core';
import { Anchor } from '@mantine/core';
import { IconExternalLink, IconFileText } from '@tabler/icons-react';
import type { Task } from '~/types/release-process.types';
import { TaskStatus } from '~/types/release-process-enums';
import type { FinalReleaseNotesTaskOutput } from '~/types/task-details.types';

interface CreateFinalReleaseNotesTaskDetailsProps {
  task: Task;
}

export function CreateFinalReleaseNotesTaskDetails({ task }: CreateFinalReleaseNotesTaskDetailsProps) {
  // Only read output when task is COMPLETED or FAILED
  const output = (task.taskStatus === TaskStatus.COMPLETED || task.taskStatus === TaskStatus.FAILED)
    ? (task.output as FinalReleaseNotesTaskOutput | null)
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

