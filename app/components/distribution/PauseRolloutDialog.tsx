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
  DIST_BUTTON_PROPS,
  DS_COLORS,
  DS_TYPOGRAPHY,
  DIST_FONT_WEIGHTS,
  DIST_INPUT_PROPS,
  DIST_MODAL_PROPS,
  DS_SPACING,
} from '~/constants/distribution-design.constants';
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
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.STATUS.WARNING} variant="light" size="lg">
            <IconPlayerPause size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={DIST_FONT_WEIGHTS.SEMIBOLD}>{DIALOG_TITLES.PAUSE_ROLLOUT}</Text>
        </Group>
      }
      {...DIST_MODAL_PROPS.DEFAULT}
    >
      <Stack gap={DS_SPACING.MD}>
        <Text size={DS_TYPOGRAPHY.SIZE.SM}>{confirmationText}</Text>

        <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.SECONDARY}>
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
          {...DIST_INPUT_PROPS.DEFAULT}
        />

        <Group justify="flex-end" mt={DS_SPACING.MD}>
          <Button {...DIST_BUTTON_PROPS.SUBTLE} onClick={handleClose} disabled={isLoading}>
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button 
            color={DS_COLORS.STATUS.WARNING}
            onClick={handleConfirm} 
            loading={isLoading}
            leftSection={<IconPlayerPause size={DIALOG_ICON_SIZES.ACTION} />}
            {...DIST_BUTTON_PROPS.PRIMARY}
          >
            {BUTTON_LABELS.PAUSE_ROLLOUT}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

