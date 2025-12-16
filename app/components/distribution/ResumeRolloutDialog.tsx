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
  DIST_BUTTON_PROPS,
  DS_COLORS,
  DS_TYPOGRAPHY,
  DIST_FONT_WEIGHTS,
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
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.STATUS.SUCCESS} variant="light" size="lg">
            <IconPlayerPlay size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={DIST_FONT_WEIGHTS.SEMIBOLD}>{DIALOG_TITLES.RESUME_ROLLOUT}</Text>
        </Group>
      }
      {...DIST_MODAL_PROPS.DEFAULT}
    >
      <Stack gap={DS_SPACING.MD}>
        <Text size={DS_TYPOGRAPHY.SIZE.SM}>{confirmationText}</Text>

        {pausedReason && (
          <div>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.SEMIBOLD} mb={DS_SPACING.XS}>
              {DIALOG_UI.RESUME.PAUSED_REASON_LABEL}
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.SECONDARY}>
              {pausedReason}
            </Text>
          </div>
        )}

        <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.SECONDARY}>
          {DIALOG_UI.RESUME.DESCRIPTION}
        </Text>

        <Group justify="flex-end" mt={DS_SPACING.MD}>
          <Button 
            {...DIST_BUTTON_PROPS.SUBTLE}
            onClick={handleClose} 
            disabled={isLoading}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button 
            color={DS_COLORS.STATUS.SUCCESS}
            onClick={handleConfirm} 
            loading={isLoading}
            leftSection={<IconPlayerPlay size={DIALOG_ICON_SIZES.ACTION} />}
            {...DIST_BUTTON_PROPS.PRIMARY}
          >
            {BUTTON_LABELS.RESUME_ROLLOUT}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

