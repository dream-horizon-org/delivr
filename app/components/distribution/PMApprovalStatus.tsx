/**
 * PMApprovalStatus - Shows PM ticket approval status
 * 
 * Features:
 * - Displays PM integration status
 * - Shows Jira ticket link and status
 * - Manual approval button (when no PM integration)
 */

import { Card, Badge, Button, Group, Stack, Text, Anchor, ThemeIcon, Paper } from '@mantine/core';
import { 
  IconCheck, 
  IconClock, 
  IconExternalLink, 
  IconUserCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { BUTTON_LABELS } from '~/constants/distribution.constants';
import type { PMApprovalStatusProps } from './distribution.types';
import { deriveApprovalState } from './distribution.utils';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ApprovedBadge() {
  return (
    <Badge 
      color="green" 
      variant="light" 
      leftSection={<IconCheck size={14} />}
      size="lg"
    >
      Approved
    </Badge>
  );
}

function PendingBadge({ status }: { status: string }) {
  return (
    <Badge 
      color="yellow" 
      variant="light" 
      leftSection={<IconClock size={14} />}
      size="lg"
    >
      {status}
    </Badge>
  );
}

function JiraTicketInfo({ 
  ticket 
}: { 
  ticket: NonNullable<PMApprovalStatusProps['pmStatus']['pmTicket']>;
}) {
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

function ManualApprovalPrompt({ 
  approverRole,
  onApprove,
  isApproving,
}: { 
  approverRole: 'RELEASE_LEAD' | 'RELEASE_PILOT';
  onApprove?: () => void;
  isApproving?: boolean;
}) {
  const roleLabel = approverRole === 'RELEASE_LEAD' ? 'Release Lead' : 'Release Pilot';
  
  return (
    <Paper p="md" withBorder radius="md" bg="orange.0">
      <Stack gap="sm">
        <Group gap="sm">
          <ThemeIcon color="orange" variant="light" size="lg">
            <IconUserCheck size={20} />
          </ThemeIcon>
          <div>
            <Text fw={500}>Manual Approval Required</Text>
            <Text size="sm" c="dimmed">
              No PM integration configured. A {roleLabel} must approve this release.
            </Text>
          </div>
        </Group>
        
        {onApprove && (
          <Button
            color="orange"
            variant="filled"
            onClick={onApprove}
            loading={isApproving}
            leftSection={<IconCheck size={16} />}
          >
            {BUTTON_LABELS.APPROVE}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

function BlockedMessage({ reason }: { reason: string }) {
  return (
    <Paper p="md" withBorder radius="md" bg="red.0">
      <Group gap="sm">
        <ThemeIcon color="red" variant="light" size="lg">
          <IconAlertCircle size={20} />
        </ThemeIcon>
        <div>
          <Text fw={500} c="red.7">Approval Blocked</Text>
          <Text size="sm" c="dimmed">{reason}</Text>
        </div>
      </Group>
    </Paper>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PMApprovalStatus(props: PMApprovalStatusProps) {
  const { 
    pmStatus, 
    isApproving,
    onApproveRequested,
    className,
  } = props;

  const {
    hasIntegration,
    isApproved,
    requiresManualApproval,
    ticket,
    blockedReason,
    statusLabel,
    statusColor,
  } = deriveApprovalState(pmStatus);

  return (
    <Card 
      shadow="sm" 
      padding="lg" 
      radius="md" 
      withBorder 
      className={className}
      data-testid="pm-approval-status"
    >
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color="violet">
            <IconUserCheck size={20} />
          </ThemeIcon>
          <div>
            <Text fw={600}>PM Approval</Text>
            <Text size="xs" c="dimmed">
              {hasIntegration ? 'Jira Integration' : 'Manual Approval'}
            </Text>
          </div>
        </Group>
        
        {isApproved ? (
          <ApprovedBadge />
        ) : (
          <PendingBadge status={statusLabel} />
        )}
      </Group>

      {/* Content */}
      <Stack gap="md">
        {/* Blocked message */}
        {blockedReason && !isApproved && (
          <BlockedMessage reason={blockedReason} />
        )}

        {/* Jira ticket info (if integration exists) */}
        {hasIntegration && ticket && (
          <JiraTicketInfo ticket={ticket} />
        )}

        {/* Manual approval prompt (if no integration) */}
        {!hasIntegration && !isApproved && requiresManualApproval && (
          <ManualApprovalPrompt
            approverRole={pmStatus.approver ?? 'RELEASE_LEAD'}
            onApprove={onApproveRequested}
            isApproving={isApproving}
          />
        )}

        {/* Approved message */}
        {isApproved && pmStatus.approvedAt && (
          <Paper p="md" withBorder radius="md" bg="green.0">
            <Group gap="sm">
              <IconCheck size={20} className="text-green-600" />
              <div>
                <Text fw={500} c="green.7">Release Approved</Text>
                <Text size="sm" c="dimmed">
                  Approved on {new Date(pmStatus.approvedAt).toLocaleDateString()}
                </Text>
              </div>
            </Group>
          </Paper>
        )}
      </Stack>
    </Card>
  );
}

