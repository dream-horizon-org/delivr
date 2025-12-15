/**
 * PauseConfirmationDialog - Confirmation dialog for pausing rollout
 * 
 * Features:
 * - Confirmation message with current percentage
 * - Optional reason field
 * - Cancel and Confirm buttons
 */

import {
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { IconPlayerPause } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DIALOG_UI,
} from '~/constants/distribution.constants';

// ============================================================================
// TYPES
// ============================================================================

export type PauseConfirmationDialogProps = {
  opened: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  platform: string;
  currentPercentage: number;
  isLoading?: boolean;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PauseConfirmationDialog({
  opened,
  onClose,
  onConfirm,
  platform,
  currentPercentage,
  isLoading = false,
}: PauseConfirmationDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = useCallback(() => {
    onConfirm(reason.trim() || undefined);
    setReason('');
  }, [onConfirm, reason]);

  const handleClose = useCallback(() => {
    setReason('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="yellow" variant="light" size="lg">
            <IconPlayerPause size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={600}>
            {BUTTON_LABELS.PAUSE_ROLLOUT}
          </Text>
        </Group>
      }
      size="md"
      centered
      closeOnEscape={!isLoading}
    >
      <Stack gap="md">
        {/* Confirmation Message */}
        <div>
          <Text size="md" fw={500} mb="xs">
            {DIALOG_UI.PAUSE.CONFIRMATION(platform, currentPercentage)}
          </Text>
          <Text size="sm" c="dimmed">
            {DIALOG_UI.PAUSE.DESCRIPTION}
          </Text>
        </div>

        {/* Optional Reason Field */}
        <Textarea
          label={DIALOG_UI.PAUSE.REASON_LABEL}
          placeholder={DIALOG_UI.PAUSE.REASON_PLACEHOLDER}
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
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
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button
            color="yellow"
            loading={isLoading}
            onClick={handleConfirm}
            leftSection={<IconPlayerPause size={DIALOG_ICON_SIZES.ACTION} />}
          >
            {BUTTON_LABELS.PAUSE}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

