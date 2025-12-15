/**
 * ForkBranchTaskDetails Component
 * Displays branch information for FORK_BRANCH tasks
 */

import { Group, Stack, Text } from '@mantine/core';
import { Anchor } from '@mantine/core';
import { IconExternalLink, IconGitBranch } from '@tabler/icons-react';
import type { Task } from '~/types/release-process.types';
import { TaskStatus } from '~/types/release-process-enums';
import type { ForkBranchTaskOutput } from '~/types/task-details.types';

interface ForkBranchTaskDetailsProps {
  task: Task;
}

export function ForkBranchTaskDetails({ task }: ForkBranchTaskDetailsProps) {
  // Only read output when task is COMPLETED or FAILED
  const output = (task.taskStatus === TaskStatus.COMPLETED || task.taskStatus === TaskStatus.FAILED)
    ? (task.output as ForkBranchTaskOutput | null)
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

  const branchName = output?.branchName || task.branch;
  const branchUrl = output?.branchUrl;

  if (!branchName && !branchUrl) {
    return (
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          No branch information available
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {/* Branch Information */}
      <Stack gap="xs">
        <Text size="xs" c="dimmed" fw={500}>
          Branch
        </Text>
        <Group gap="sm">
          <IconGitBranch size={16} />
          <Text size="sm" fw={500}>
            {branchName}
          </Text>
        </Group>
      </Stack>

      {/* Branch Link */}
      {branchUrl && (
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Links
          </Text>
          <Anchor href={branchUrl} target="_blank" size="sm" c="brand">
            <Group gap={4}>
              <IconExternalLink size={14} />
              <Text size="sm">View Branch</Text>
            </Group>
          </Anchor>
        </Stack>
      )}
    </Stack>
  );
}

