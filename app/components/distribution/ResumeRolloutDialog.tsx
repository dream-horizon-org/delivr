/**
 * ResumeRolloutDialog - Confirmation dialog to resume paused rollout
 * 
 * Per API Spec Section 4.14:
 * Resume a paused rollout
 */

import { Button, Group, Modal, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DIALOG_TITLES,
  DIALOG_UI,
  PLATFORM_LABELS,
} from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';

export type ResumeRolloutDialogProps = {
  opened: boolean;
  onClose: () => void;
  platform: Platform;
  currentPercentage: number;
  pausedReason?: string;
  onConfirm: () => void;
  isLoading?: boolean;
};

export function ResumeRolloutDialog({
  opened,
  onClose,
  platform,
  currentPercentage,
  pausedReason,
  onConfirm,
  isLoading,
}: ResumeRolloutDialogProps) {
  const platformLabel = useMemo(() => PLATFORM_LABELS[platform], [platform]);

  const confirmationText = useMemo(
    () => DIALOG_UI.RESUME.CONFIRMATION(platformLabel, currentPercentage),
    [platformLabel, currentPercentage]
  );

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="green" variant="light" size="lg">
            <IconPlayerPlay size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={600}>{DIALOG_TITLES.RESUME_ROLLOUT}</Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        <Text size="sm">{confirmationText}</Text>

        {pausedReason && (
          <div>
            <Text size="sm" fw={600} mb={4}>
              {DIALOG_UI.RESUME.PAUSED_REASON_LABEL}
            </Text>
            <Text size="sm" c="dimmed">
              {pausedReason}
            </Text>
          </div>
        )}

        <Text size="sm" c="dimmed">
          {DIALOG_UI.RESUME.DESCRIPTION}
        </Text>

        <Group justify="flex-end" mt="md">
          <Button 
            variant="subtle" 
            onClick={handleClose} 
            disabled={isLoading}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button 
            color="green" 
            onClick={handleConfirm} 
            loading={isLoading}
            leftSection={<IconPlayerPlay size={DIALOG_ICON_SIZES.ACTION} />}
          >
            {BUTTON_LABELS.RESUME_ROLLOUT}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

