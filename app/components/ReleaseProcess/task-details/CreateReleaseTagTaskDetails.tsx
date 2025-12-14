/**
 * CreateReleaseTagTaskDetails Component
 * Displays release tag information for CREATE_RELEASE_TAG tasks
 */

import { Group, Stack, Text } from '@mantine/core';
import { Anchor } from '@mantine/core';
import { IconExternalLink, IconTag } from '@tabler/icons-react';
import type { Task } from '~/types/release-process.types';
import type { CreateReleaseTagTaskDetailsData } from '~/types/task-details.types';

interface CreateReleaseTagTaskDetailsProps {
  task: Task;
}

export function CreateReleaseTagTaskDetails({ task }: CreateReleaseTagTaskDetailsProps) {
  const externalData = task.externalData as CreateReleaseTagTaskDetailsData | null;

  const tagName = externalData?.tagName;
  const tagUrl = externalData?.tagUrl;

  if (!tagName && !tagUrl) {
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
      {/* Tag Information */}
      {tagName && (
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Tag Name
          </Text>
          <Group gap="sm">
            <IconTag size={16} />
            <Text size="sm" fw={500}>
              {tagName}
            </Text>
          </Group>
        </Stack>
      )}

      {/* Tag Link */}
      {tagUrl && (
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Links
          </Text>
          <Anchor href={tagUrl} target="_blank" size="sm" c="brand">
            <Group gap={4}>
              <IconExternalLink size={14} />
              <Text size="sm">View Tag</Text>
            </Group>
          </Anchor>
        </Stack>
      )}
    </Stack>
  );
}

