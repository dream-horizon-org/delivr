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

        <Group justify="flex-end" gap="sm" mt="xl" pt="md" style={{ borderTop: `1px solid var(--mantine-color-slate-2)` }}>
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconX size={18} />}
            onClick={onClose}
            disabled={isSubmitting}
            size="md"
          >
            Cancel
          </Button>
          <Button
            color="brand"
            leftSection={<IconRocket size={18} />}
            onClick={onConfirm}
            loading={isSubmitting}
            disabled={isSubmitting}
            size="md"
          >
            Create Release
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

