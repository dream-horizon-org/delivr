/**
 * PMApprovalStatus - Shows PM ticket approval status
 * 
 * Features:
 * - Displays PM integration status
 * - Shows Jira ticket link and status
 * - Manual approval button (when no PM integration)
 */

import { Card, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck, IconUserCheck } from '@tabler/icons-react';
import { ApproverRole } from '~/types/distribution.types';
import { ApprovedBadge } from './ApprovedBadge';
import { BlockedMessage } from './BlockedMessage';
import type { PMApprovalStatusProps } from './distribution.types';
import { deriveApprovalState } from './distribution.utils';
import { JiraTicketInfo } from './JiraTicketInfo';
import { ManualApprovalPrompt } from './ManualApprovalPrompt';
import { PendingBadge } from './PendingBadge';

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

  // Visibility flags for conditional rendering
  const showBlockedMessage = !!blockedReason && !isApproved;
  const showJiraTicket = hasIntegration && !!ticket;
  const showManualApproval = !hasIntegration && !isApproved && requiresManualApproval;

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
        {showBlockedMessage && (
          <BlockedMessage reason={blockedReason!} />
        )}

        {/* Jira ticket info (if integration exists) */}
        {showJiraTicket && (
          <JiraTicketInfo ticket={ticket!} />
        )}

        {/* Manual approval prompt (if no integration) */}
        {showManualApproval && (
          <ManualApprovalPrompt
            approverRole={pmStatus.approver ?? ApproverRole.RELEASE_LEAD}
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

