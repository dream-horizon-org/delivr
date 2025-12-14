/**
 * CreateFinalReleaseNotesTaskDetails Component
 * Displays final release notes information for CREATE_FINAL_RELEASE_NOTES tasks
 */

import { Group, Stack, Text } from '@mantine/core';
import { Anchor } from '@mantine/core';
import { IconExternalLink, IconFileText } from '@tabler/icons-react';
import type { Task } from '~/types/release-process.types';
import type { CreateFinalReleaseNotesTaskDetailsData } from '~/types/task-details.types';

interface CreateFinalReleaseNotesTaskDetailsProps {
  task: Task;
}

export function CreateFinalReleaseNotesTaskDetails({ task }: CreateFinalReleaseNotesTaskDetailsProps) {
  const externalData = task.externalData as CreateFinalReleaseNotesTaskDetailsData | null;

  const notesUrl = externalData?.notesUrl;

  if (!notesUrl) {
    return (
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          No release notes available
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {/* Release Notes Link */}
      <Stack gap="xs">
        <Text size="xs" c="dimmed" fw={500}>
          Final Release Notes
        </Text>
        <Anchor href={notesUrl} target="_blank" size="sm" c="brand">
          <Group gap={4}>
            <IconFileText size={14} />
            <Text size="sm">View Release Notes</Text>
            <IconExternalLink size={14} />
          </Group>
        </Anchor>
      </Stack>
    </Stack>
  );
}

