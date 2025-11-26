/**
 * Release Review Modal Component
 * 
 * Modal that shows release review summary and handles submission.
 * Opens when user clicks submit on the create release form.
 */

import { Modal, Button, Group, Stack } from '@mantine/core';
import { IconRocket, IconX } from '@tabler/icons-react';
import { ReleaseReviewSummary } from './ReleaseReviewSummary';
import type { ReleaseCreationState, CronConfig } from '~/types/release-creation-backend';
import type { ReleaseConfiguration } from '~/types/release-config';

interface ReleaseReviewModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  config?: ReleaseConfiguration;
  state: Partial<ReleaseCreationState>;
  cronConfig?: Partial<CronConfig>;
  isSubmitting?: boolean;
}

export function ReleaseReviewModal({
  opened,
  onClose,
  onConfirm,
  config,
  state,
  cronConfig,
  isSubmitting = false,
}: ReleaseReviewModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Release Preview"
      size="xl"
      centered
      closeOnClickOutside={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <Stack gap="lg">
        <ReleaseReviewSummary config={config} state={state} cronConfig={cronConfig} />

        <Group justify="flex-end" gap="sm" className="mt-4 pt-4 border-t border-gray-200">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconX size={18} />}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="filled"
            leftSection={<IconRocket size={18} />}
            onClick={onConfirm}
            loading={isSubmitting}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            Create Release
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

