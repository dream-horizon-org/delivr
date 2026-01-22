/**
 * ResumeConfirmationDialog - Confirmation dialog for resuming rollout
 * 
 * Features:
 * - Confirmation message with current percentage
 * - Shows reason why it was paused (if available)
 * - Cancel and Confirm buttons
 */

import {
    Alert,
    Button,
    Group,
    Modal,
    Stack,
    Text,
    ThemeIcon,
} from '@mantine/core';
import { IconInfoCircle, IconPlayerPlay } from '@tabler/icons-react';
import { useCallback } from 'react';
import {
    BUTTON_LABELS,
    DIALOG_ICON_SIZES,
    DIALOG_UI,
} from '~/constants/distribution/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';

// ============================================================================
// TYPES
// ============================================================================

export type ResumeConfirmationDialogProps = {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  platform: string;
  currentPercentage: number;
  pausedReason?: string;
  isLoading?: boolean;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResumeConfirmationDialog({
  opened,
  onClose,
  onConfirm,
  platform,
  currentPercentage,
  pausedReason,
  isLoading = false,
}: ResumeConfirmationDialogProps) {
  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.STATUS.SUCCESS} variant="light" size="lg" radius={DS_SPACING.BORDER_RADIUS}>
            <IconPlayerPlay size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
            {BUTTON_LABELS.RESUME_ROLLOUT}
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
            {DIALOG_UI.RESUME.CONFIRMATION(platform, currentPercentage)}
          </Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
            {DIALOG_UI.RESUME.DESCRIPTION}
          </Text>
        </div>

        {/* Paused Reason (if available) */}
        {pausedReason && (
          <Alert
            color={DS_COLORS.STATUS.WARNING}
            variant="light"
            icon={<IconInfoCircle size={DIALOG_ICON_SIZES.ALERT} />}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            <Stack gap={DS_SPACING.XXS}>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} tt="uppercase">
                {DIALOG_UI.RESUME.PAUSED_REASON_LABEL}
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.SM}>{pausedReason}</Text>
            </Stack>
          </Alert>
        )}

        {/* Info Note */}
        <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} fs="italic">
          {DIALOG_UI.RESUME.NOTE}
        </Text>

        {/* Action Buttons */}
        <Group justify="flex-end" mt={DS_SPACING.LG}>
          <Button
            variant="subtle"
            onClick={onClose}
            disabled={isLoading}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button
            color={DS_COLORS.STATUS.SUCCESS}
            loading={isLoading}
            onClick={handleConfirm}
            leftSection={<IconPlayerPlay size={DIALOG_ICON_SIZES.ACTION} />}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            {BUTTON_LABELS.RESUME}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

