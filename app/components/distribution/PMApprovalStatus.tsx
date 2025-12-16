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
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';
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
      padding={DS_SPACING.LG}
      radius={DS_SPACING.BORDER_RADIUS}
      withBorder 
      className={className}
      data-testid="pm-approval-status"
    >
      {/* Header */}
      <Group justify="space-between" mb={DS_SPACING.MD}>
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon size="lg" radius={DS_SPACING.BORDER_RADIUS} variant="light" color={DS_COLORS.STATUS.INFO}>
            <IconUserCheck size={20} />
          </ThemeIcon>
          <div>
            <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>PM Approval</Text>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
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
      <Stack gap={DS_SPACING.MD}>
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
          <Paper p={DS_SPACING.MD} withBorder radius={DS_SPACING.BORDER_RADIUS} bg={DS_COLORS.BACKGROUND.SUCCESS}>
            <Group gap={DS_SPACING.SM}>
              <IconCheck size={20} style={{ color: DS_COLORS.STATUS.SUCCESS }} />
              <div>
                <Text fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} c={DS_COLORS.STATUS.SUCCESS}>Release Approved</Text>
                <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
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

