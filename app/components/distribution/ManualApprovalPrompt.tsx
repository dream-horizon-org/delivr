/**
 * ManualApprovalPrompt - Prompts for manual approval when no PM integration
 */

import { Button, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck, IconUserCheck } from '@tabler/icons-react';
import { BUTTON_LABELS } from '~/constants/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';
import { ApproverRole } from '~/types/distribution.types';

type ManualApprovalPromptProps = {
  approverRole: ApproverRole;
  onApprove?: () => void;
  isApproving?: boolean;
};

export function ManualApprovalPrompt({ 
  approverRole,
  onApprove,
  isApproving,
}: ManualApprovalPromptProps) {
  const roleLabel = approverRole === ApproverRole.RELEASE_LEAD ? 'Release Lead' : 'Release Pilot';
  const showApproveButton = !!onApprove;
  
  return (
    <Paper p={DS_SPACING.MD} withBorder radius={DS_SPACING.BORDER_RADIUS} bg={DS_COLORS.BACKGROUND.WARNING}>
      <Stack gap={DS_SPACING.SM}>
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.STATUS.WARNING} variant="light" size="lg" radius={DS_SPACING.BORDER_RADIUS}>
            <IconUserCheck size={20} />
          </ThemeIcon>
          <div>
            <Text fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>Manual Approval Required</Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
              No PM integration configured. A {roleLabel} must approve this release.
            </Text>
          </div>
        </Group>
        
        {showApproveButton && (
          <Button
            color={DS_COLORS.STATUS.WARNING}
            variant="filled"
            onClick={onApprove}
            loading={isApproving}
            leftSection={<IconCheck size={16} />}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            {BUTTON_LABELS.APPROVE}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

