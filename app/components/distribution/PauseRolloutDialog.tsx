/**
 * PauseRolloutDialog - Confirmation dialog to pause rollout
 * 
 * Per API Spec Section 4.13:
 * Temporarily pause rollout with optional reason
 */

import { Button, Group, Modal, Stack, Text, Textarea, ThemeIcon } from '@mantine/core';
import { IconPlayerPause } from '@tabler/icons-react';
import { useState } from 'react';
import { PLATFORM_LABELS } from '~/constants/distribution.constants';
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

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="yellow" variant="light" size="lg">
            <IconPlayerPause size={20} />
          </ThemeIcon>
          <Text fw={600}>Pause Rollout</Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        <Text size="sm">
          Pause the {PLATFORM_LABELS[platform]} rollout at <strong>{currentPercentage}%</strong>?
        </Text>

        <Text size="sm" c="dimmed">
          The rollout will stop at the current percentage. New users will not receive this update until resumed.
        </Text>

        <Textarea
          label="Reason (optional)"
          placeholder="Why are you pausing the rollout?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button color="yellow" onClick={handleConfirm} loading={isLoading}>
            Pause Rollout
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

