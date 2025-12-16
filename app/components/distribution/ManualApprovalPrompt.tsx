/**
 * ManualApprovalPrompt - Prompts for manual approval when no PM integration
 */

import { Button, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck, IconUserCheck } from '@tabler/icons-react';
import { BUTTON_LABELS } from '~/constants/distribution.constants';
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
        
        {showApproveButton && (
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

