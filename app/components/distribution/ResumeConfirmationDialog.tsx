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
} from '~/constants/distribution.constants';

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
        <Group gap="sm">
          <ThemeIcon color="green" variant="light" size="lg">
            <IconPlayerPlay size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={600}>
            {BUTTON_LABELS.RESUME_ROLLOUT}
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
            {DIALOG_UI.RESUME.CONFIRMATION(platform, currentPercentage)}
          </Text>
          <Text size="sm" c="dimmed">
            {DIALOG_UI.RESUME.DESCRIPTION}
          </Text>
        </div>

        {/* Paused Reason (if available) */}
        {pausedReason && (
          <Alert
            color="yellow"
            variant="light"
            icon={<IconInfoCircle size={DIALOG_ICON_SIZES.ALERT} />}
          >
            <Stack gap={4}>
              <Text size="xs" fw={600} tt="uppercase">
                {DIALOG_UI.RESUME.PAUSED_REASON_LABEL}
              </Text>
              <Text size="sm">{pausedReason}</Text>
            </Stack>
          </Alert>
        )}

        {/* Info Note */}
        <Text size="xs" c="dimmed" fs="italic">
          {DIALOG_UI.RESUME.NOTE}
        </Text>

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            onClick={onClose}
            disabled={isLoading}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button
            color="green"
            loading={isLoading}
            onClick={handleConfirm}
            leftSection={<IconPlayerPlay size={DIALOG_ICON_SIZES.ACTION} />}
          >
            {BUTTON_LABELS.RESUME}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

