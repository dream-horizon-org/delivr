/**
 * ManualApprovalDialog - Confirmation dialog for manual release approval
 * 
 * Features:
 * - Role-based access indicator
 * - Optional comments field
 * - Confirmation with acknowledgment
 */

import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconUserCheck } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { BUTTON_LABELS, DIALOG_TITLES } from '~/constants/distribution.constants';
import { ApproverRole } from '~/types/distribution.types';
import type { ManualApprovalDialogProps } from './distribution.types';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ManualApprovalDialog(props: ManualApprovalDialogProps) {
  const { 
    opened, 
    releaseId,
    approverRole,
    isApproving,
    onApprove, 
    onClose,
  } = props;

  const [comments, setComments] = useState('');

  const roleLabel = approverRole === ApproverRole.RELEASE_LEAD ? 'Release Lead' : 'Release Pilot';

  const handleCommentsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComments(e.target.value);
  }, []);

  const handleApprove = useCallback(() => {
    const trimmedComments = comments.trim();
    // Only pass comments if non-empty; function signature allows optional parameter
    if (trimmedComments.length > 0) {
      onApprove(trimmedComments);
    } else {
      onApprove();
    }
  }, [comments, onApprove]);

  const handleClose = useCallback(() => {
    setComments('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="orange" variant="light" size="lg">
            <IconUserCheck size={20} />
          </ThemeIcon>
          <Text fw={600}>{DIALOG_TITLES.PM_APPROVAL}</Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Warning Alert */}
        <Alert 
          icon={<IconAlertTriangle size={16} />} 
          color="orange" 
          variant="light"
        >
          <Stack gap="xs">
            <Text size="sm" fw={500}>Manual Approval Required</Text>
            <Text size="sm">
              No PM integration is configured. As a {roleLabel}, you are authorizing 
              this release to proceed to distribution.
            </Text>
          </Stack>
        </Alert>

        {/* Release Info */}
        <div>
          <Text size="sm" c="dimmed">Release ID</Text>
          <Text size="sm" fw={500}>{releaseId}</Text>
        </div>

        {/* Comments Field */}
        <Textarea
          label="Comments (Optional)"
          description="Add any notes about this approval"
          placeholder="e.g., Approved after QA sign-off"
          value={comments}
          onChange={handleCommentsChange}
          minRows={3}
          disabled={isApproving}
        />

        {/* Acknowledgment Text */}
        <Text size="xs" c="dimmed" fs="italic">
          By approving, you confirm that all testing has been completed and 
          the release is ready for store submission.
        </Text>

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button 
            variant="subtle" 
            onClick={handleClose}
            disabled={isApproving}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          
          <Button
            color="orange"
            onClick={handleApprove}
            loading={isApproving}
            leftSection={<IconCheck size={16} />}
          >
            {BUTTON_LABELS.APPROVE}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

