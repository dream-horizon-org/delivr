/**
 * JiraTicketInfo - Displays Jira ticket information
 */

import { Anchor, Badge, Group, Paper, Stack, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import type { PMTicket } from '~/types/distribution/distribution.types';

export type JiraTicketInfoProps = {
  ticket: PMTicket;
};

export function JiraTicketInfo({ ticket }: JiraTicketInfoProps) {
  return (
    <Paper p={DS_SPACING.MD} withBorder radius={DS_SPACING.BORDER_RADIUS}>
      <Group justify="space-between">
        <Stack gap={DS_SPACING.XXS}>
          <Group gap={DS_SPACING.XS}>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>{ticket.id}</Text>
            <Badge size="xs" variant="light">{ticket.status}</Badge>
          </Group>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED} lineClamp={1}>
            {ticket.title}
          </Text>
          <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
            Updated: {new Date(ticket.lastUpdated).toLocaleDateString()}
          </Text>
        </Stack>
        
        <Anchor
          href={ticket.url}
          target="_blank"
          rel="noopener noreferrer"
          size={DS_TYPOGRAPHY.SIZE.SM}
        >
          <Group gap={DS_SPACING.XXS}>
            <IconExternalLink size={14} />
            View in Jira
          </Group>
        </Anchor>
      </Group>
    </Paper>
  );
}

