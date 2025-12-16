/**
 * JiraTicketInfo - Displays Jira ticket information
 */

import { Anchor, Badge, Group, Paper, Stack, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import type { PMTicket } from '~/types/distribution.types';

type JiraTicketInfoProps = {
  ticket: PMTicket;
};

export function JiraTicketInfo({ ticket }: JiraTicketInfoProps) {
  return (
    <Paper p="md" withBorder radius="md">
      <Group justify="space-between">
        <Stack gap={4}>
          <Group gap="xs">
            <Text size="sm" fw={500}>{ticket.id}</Text>
            <Badge size="xs" variant="light">{ticket.status}</Badge>
          </Group>
          <Text size="sm" c="dimmed" lineClamp={1}>
            {ticket.title}
          </Text>
          <Text size="xs" c="dimmed">
            Updated: {new Date(ticket.lastUpdated).toLocaleDateString()}
          </Text>
        </Stack>
        
        <Anchor
          href={ticket.url}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
        >
          <Group gap={4}>
            <IconExternalLink size={14} />
            View in Jira
          </Group>
        </Anchor>
      </Group>
    </Paper>
  );
}

