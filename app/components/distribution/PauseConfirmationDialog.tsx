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
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';

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
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.STATUS.WARNING} variant="light" size="lg" radius={DS_SPACING.BORDER_RADIUS}>
            <IconPlayerPause size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
            {BUTTON_LABELS.PAUSE_ROLLOUT}
          </Text>
        </Group>
      }
      size="md"
      centered
      closeOnEscape={!isLoading}
    >
      <Stack gap={DS_SPACING.MD}>
        {/* Confirmation Message */}
        <div>
          <Text size={DS_TYPOGRAPHY.SIZE.MD} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} mb={DS_SPACING.XS}>
            {DIALOG_UI.PAUSE.CONFIRMATION(platform, currentPercentage)}
          </Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
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
        <Group justify="flex-end" mt={DS_SPACING.LG}>
          <Button
            variant="subtle"
            onClick={handleClose}
            disabled={isLoading}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button
            color={DS_COLORS.STATUS.WARNING}
            loading={isLoading}
            onClick={handleConfirm}
            leftSection={<IconPlayerPause size={DIALOG_ICON_SIZES.ACTION} />}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            {BUTTON_LABELS.PAUSE}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

