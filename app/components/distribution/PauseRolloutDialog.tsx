/**
 * PauseRolloutDialog - Confirmation dialog to pause rollout
 * 
 * Per API Spec Section 4.13:
 * Temporarily pause rollout with optional reason
 */

import { Button, Group, Modal, Stack, Text, Textarea, ThemeIcon } from '@mantine/core';
import { IconPlayerPause } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DIALOG_TITLES,
  DIALOG_UI,
  PLATFORM_LABELS,
} from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';

export type PauseRolloutDialogProps = {
  opened: boolean;
  onClose: () => void;
  platform: Platform;
  currentPercentage: number;
  onConfirm: (reason?: string) => void;
  isLoading?: boolean;
};

export function PauseRolloutDialog({
  opened,
  onClose,
  platform,
  currentPercentage,
  onConfirm,
  isLoading,
}: PauseRolloutDialogProps) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const platformLabel = useMemo(() => PLATFORM_LABELS[platform], [platform]);
  const confirmationText = useMemo(
    () => DIALOG_UI.PAUSE.CONFIRMATION(platformLabel, currentPercentage),
    [platformLabel, currentPercentage]
  );

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  }, [validationError]);

  const handleConfirm = useCallback(() => {
    const trimmedReason = reason.trim();
    
    // Validate: reason is mandatory
    if (!trimmedReason) {
      setValidationError(DIALOG_UI.PAUSE.REASON_REQUIRED);
      return;
    }

    onConfirm(trimmedReason);
  }, [reason, onConfirm]);

  const handleClose = useCallback(() => {
    setReason('');
    setValidationError(null);
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
          <Text fw={600}>{DIALOG_TITLES.PAUSE_ROLLOUT}</Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        <Text size="sm">{confirmationText}</Text>

        <Text size="sm" c="dimmed">
          {DIALOG_UI.PAUSE.DESCRIPTION}
        </Text>

        <Textarea
          label={DIALOG_UI.PAUSE.REASON_LABEL}
          placeholder={DIALOG_UI.PAUSE.REASON_PLACEHOLDER}
          value={reason}
          onChange={handleReasonChange}
          disabled={isLoading}
          required
          error={validationError}
          minRows={3}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button 
            color="yellow" 
            onClick={handleConfirm} 
            loading={isLoading}
            leftSection={<IconPlayerPause size={DIALOG_ICON_SIZES.ACTION} />}
          >
            {BUTTON_LABELS.PAUSE_ROLLOUT}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

