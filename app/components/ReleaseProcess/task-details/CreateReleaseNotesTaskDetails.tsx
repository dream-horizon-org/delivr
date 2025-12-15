/**
 * CreateReleaseNotesTaskDetails Component
 * Displays release notes information for CREATE_RELEASE_NOTES tasks
 */

import { Group, Stack, Text } from '@mantine/core';
import { Anchor } from '@mantine/core';
import { IconExternalLink, IconFileText } from '@tabler/icons-react';
import type { Task } from '~/types/release-process.types';
import type { CreateReleaseNotesTaskDetailsData } from '~/types/task-details.types';

interface CreateReleaseNotesTaskDetailsProps {
  task: Task;
}

export function CreateReleaseNotesTaskDetails({ task }: CreateReleaseNotesTaskDetailsProps) {
  const externalData = task.externalData as CreateReleaseNotesTaskDetailsData | null;

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
          Release Notes
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

