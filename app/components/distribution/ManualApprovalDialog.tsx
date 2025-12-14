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
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertTriangle, IconUserCheck } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DIALOG_TITLES,
  DIALOG_UI,
} from '~/constants/distribution.constants';
import { ApproverRole } from '~/types/distribution.types';
import type { ManualApprovalDialogProps } from './distribution.types';

export function ManualApprovalDialog({
  opened,
  releaseId,
  approverRole,
  isApproving,
  onApprove,
  onClose,
}: ManualApprovalDialogProps) {
  const [comments, setComments] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const roleLabel = useMemo(
    () => (approverRole === ApproverRole.RELEASE_LEAD ? 'Release Lead' : 'Release Pilot'),
    [approverRole]
  );

  const warningMessage = useMemo(
    () => DIALOG_UI.MANUAL_APPROVAL.WARNING_MESSAGE(roleLabel),
    [roleLabel]
  );

  const handleCommentsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComments(e.target.value);
  }, []);

  const handleAcknowledgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAcknowledged(e.currentTarget.checked);
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
    setAcknowledged(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="orange" variant="light" size="lg">
            <IconUserCheck size={DIALOG_ICON_SIZES.TITLE} />
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
          icon={<IconAlertTriangle size={DIALOG_ICON_SIZES.ALERT} />} 
          color="orange" 
          variant="light"
        >
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              {DIALOG_UI.MANUAL_APPROVAL.WARNING_TITLE}
            </Text>
            <Text size="sm">{warningMessage}</Text>
          </Stack>
        </Alert>

        {/* Release Info */}
        <div>
          <Text size="sm" c="dimmed">
            {DIALOG_UI.MANUAL_APPROVAL.RELEASE_ID_LABEL}
          </Text>
          <Text size="sm" fw={500}>
            {releaseId}
          </Text>
        </div>

        {/* Comments Field */}
        <Textarea
          label={DIALOG_UI.MANUAL_APPROVAL.COMMENTS_LABEL}
          placeholder={DIALOG_UI.MANUAL_APPROVAL.COMMENTS_PLACEHOLDER}
          value={comments}
          onChange={handleCommentsChange}
          minRows={3}
          disabled={isApproving}
        />

        {/* Acknowledgment Checkbox */}
        <Checkbox
          label={DIALOG_UI.MANUAL_APPROVAL.ACKNOWLEDGMENT}
          checked={acknowledged}
          onChange={handleAcknowledgeChange}
          disabled={isApproving}
        />

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
            disabled={!acknowledged}
            loading={isApproving}
            leftSection={<IconUserCheck size={DIALOG_ICON_SIZES.ACTION} />}
          >
            {BUTTON_LABELS.APPROVE}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

