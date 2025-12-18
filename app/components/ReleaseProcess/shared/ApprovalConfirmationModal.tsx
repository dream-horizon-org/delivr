/**
 * ApprovalConfirmationModal Component
 * Reusable confirmation modal for stage approvals with optional comments field
 */

import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useCallback, useState } from 'react';

interface ApprovalConfirmationModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (comments?: string) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export function ApprovalConfirmationModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Approve',
  cancelLabel = 'Cancel',
  isLoading = false,
}: ApprovalConfirmationModalProps) {
  const [comments, setComments] = useState('');

  const handleCommentsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComments(e.target.value);
  }, []);

  const handleConfirm = useCallback(() => {
    const trimmedComments = comments.trim();
    // Only pass comments if non-empty; function signature allows optional parameter
    if (trimmedComments.length > 0) {
      onConfirm(trimmedComments);
    } else {
      onConfirm();
    }
    // Reset comments after confirmation
    setComments('');
  }, [comments, onConfirm]);

  const handleClose = useCallback(() => {
    setComments('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={title}
      size="md"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {message}
        </Text>

        {/* Comments Field */}
        <Textarea
          label="Comments (Optional)"
          description="Add any notes about this approval"
          placeholder="e.g., All requirements met, ready to proceed"
          value={comments}
          onChange={handleCommentsChange}
          minRows={3}
          disabled={isLoading}
        />

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            leftSection={<IconCheck size={16} />}
            onClick={handleConfirm}
            loading={isLoading}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


