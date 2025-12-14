/**
 * CreateTestSuiteTaskDetails Component
 * Displays test suite information for CREATE_TEST_SUITE tasks
 */

import { Group, Stack, Text, Badge } from '@mantine/core';
import { Anchor } from '@mantine/core';
import { IconExternalLink, IconTestPipe } from '@tabler/icons-react';
import type { Task } from '~/types/release-process.types';
import type { CreateTestSuiteTaskDetailsData } from '~/types/task-details.types';

interface CreateTestSuiteTaskDetailsProps {
  task: Task;
}

export function CreateTestSuiteTaskDetails({ task }: CreateTestSuiteTaskDetailsProps) {
  const externalData = task.externalData as CreateTestSuiteTaskDetailsData | null;

  const platforms = externalData?.testManagement?.platforms || [];

  return (
    <Stack gap="md">
      {/* Platform-wise Test Runs */}
      {platforms.length > 0 && (
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Test Runs
          </Text>
          <Stack gap="sm">
            {platforms.map((platformRun, index) => (
              <Group key={index} gap="sm" justify="space-between">
                <Group gap="xs">
                  <Badge variant="light" size="sm">
                    {platformRun.platform}
                  </Badge>
                  <Group gap={4}>
                    <IconTestPipe size={14} />
                    <Text size="sm" fw={500}>
                      {platformRun.runId}
                    </Text>
                  </Group>
                </Group>
                <Anchor
                  href={platformRun.runUrl}
                  target="_blank"
                  size="sm"
                  c="brand"
                >
                  <Group gap={4}>
                    <IconExternalLink size={14} />
                    <Text size="sm">View Run</Text>
                  </Group>
                </Anchor>
              </Group>
            ))}
          </Stack>
        </Stack>
      )}

      {platforms.length === 0 && (
        <Text size="sm" c="dimmed">
          No test run information available
        </Text>
      )}
    </Stack>
  );
}

