/**
 * ProjectManagementTaskDetails Component
 * Displays project management ticket information for CREATE_PROJECT_MANAGEMENT_TICKET tasks
 */

import { Group, Stack, Text, Badge } from '@mantine/core';
import { Anchor } from '@mantine/core';
import { IconExternalLink, IconTicket } from '@tabler/icons-react';
import type { Task } from '~/types/release-process.types';
import { TaskStatus } from '~/types/release-process-enums';
import type { ProjectManagementTaskOutput } from '~/types/task-details.types';

interface ProjectManagementTaskDetailsProps {
  task: Task;
}

export function ProjectManagementTaskDetails({ task }: ProjectManagementTaskDetailsProps) {
  // Only read output when task is COMPLETED or FAILED
  const output = (task.taskStatus === TaskStatus.COMPLETED || task.taskStatus === TaskStatus.FAILED)
    ? (task.output as ProjectManagementTaskOutput | null)
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

  const platforms = output?.platforms || [];

  // Extract ticket ID from URL (e.g., "JIRA-12345-ANDROID" from "https://company.atlassian.net/browse/JIRA-12345-ANDROID")
  function extractTicketId(url: string): string {
    const match = url.match(/\/([^/]+)$/);
    return match ? match[1] : url;
  }

  return (
    <Stack gap="md">
      {/* Platform-wise Tickets */}
      {platforms.length > 0 && (
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Platform Tickets
          </Text>
          <Stack gap="sm">
            {platforms.map((platformTicket, index) => {
              const ticketId = extractTicketId(platformTicket.ticketUrl);
              return (
                <Group key={index} gap="sm" justify="space-between">
                  <Group gap="xs">
                    <Badge variant="light" size="sm">
                      {platformTicket.platform}
                    </Badge>
                    <Group gap={4}>
                      <IconTicket size={14} />
                      <Text size="sm" fw={500}>
                        {ticketId}
                      </Text>
                    </Group>
                  </Group>
                  <Anchor
                    href={platformTicket.ticketUrl}
                    target="_blank"
                    size="sm"
                    c="brand"
                  >
                    <Group gap={4}>
                      <IconExternalLink size={14} />
                      <Text size="sm">View Ticket</Text>
                    </Group>
                  </Anchor>
                </Group>
              );
            })}
          </Stack>
        </Stack>
      )}

      {platforms.length === 0 && !task.externalId && (
        <Text size="sm" c="dimmed">
          No ticket information available
        </Text>
      )}
    </Stack>
  );
}

