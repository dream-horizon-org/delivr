/**
 * ResumeRolloutDialog - Confirmation dialog to resume paused rollout
 * 
 * Per API Spec Section 4.14:
 * Resume a paused rollout
 */

import { Button, Group, Modal, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { PLATFORM_LABELS } from '~/constants/distribution.constants';
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
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="green" variant="light" size="lg">
            <IconPlayerPlay size={20} />
          </ThemeIcon>
          <Text fw={600}>Resume Rollout</Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        <Text size="sm">
          Resume the {PLATFORM_LABELS[platform]} rollout from <strong>{currentPercentage}%</strong>?
        </Text>

        {pausedReason && (
          <Text size="sm" c="dimmed">
            <strong>Paused reason:</strong> {pausedReason}
          </Text>
        )}

        <Text size="sm" c="dimmed">
          The rollout will continue from where it was paused. You can increase the percentage after resuming.
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button color="green" onClick={onConfirm} loading={isLoading}>
            Resume Rollout
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

