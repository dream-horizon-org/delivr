/**
 * VersionConflictDialog - Handle VERSION_EXISTS (409) error
 * 
 * Per API Spec Section 4.7:
 * Shows when version already exists in store and provides resolution options
 */

import { Button, Group, Modal, Radio, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import { PLATFORM_LABELS } from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';

// Per API Spec - VERSION_EXISTS error details
export type VersionConflictDetails = {
  platform: Platform;
  version: string;
  existingStatus: 'LIVE' | 'IN_REVIEW' | 'DRAFT';
  resolution: {
    title: string;
    options: Array<{
      action: string;
      label: string;
      recommended?: boolean;
      availableIf?: string;
    }>;
  };
};

export type VersionConflictDialogProps = {
  opened: boolean;
  onClose: () => void;
  conflict: VersionConflictDetails | null;
  onResolve: (action: string) => void;
  isLoading?: boolean;
};

export function VersionConflictDialog({
  opened,
  onClose,
  conflict,
  onResolve,
  isLoading,
}: VersionConflictDialogProps) {
  const [selectedAction, setSelectedAction] = useState<string>('');

  if (!conflict) return null;

  const availableOptions = conflict.resolution.options.filter((option) => {
    // Handle conditional availability (e.g., DELETE_DRAFT only if status is DRAFT)
    if (option.availableIf) {
      if (option.availableIf.includes('DRAFT') && conflict.existingStatus !== 'DRAFT') {
        return false;
      }
    }
    return true;
  });

  const handleSubmit = () => {
    if (selectedAction) {
      onResolve(selectedAction);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="orange" variant="light" size="lg">
            <IconAlertTriangle size={20} />
          </ThemeIcon>
          <Text fw={600}>{conflict.resolution.title}</Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Version <strong>{conflict.version}</strong> already exists in{' '}
          {PLATFORM_LABELS[conflict.platform]} store.
        </Text>

        <Text size="sm">
          Current status:{' '}
          <strong>
            {conflict.existingStatus === 'LIVE' && '🟢 Live'}
            {conflict.existingStatus === 'IN_REVIEW' && '🟡 In Review'}
            {conflict.existingStatus === 'DRAFT' && '📝 Draft'}
          </strong>
        </Text>

        <Radio.Group
          value={selectedAction}
          onChange={setSelectedAction}
          label="Choose how to resolve this conflict:"
        >
          <Stack gap="sm" mt="xs">
            {availableOptions.map((option) => (
              <Radio
                key={option.action}
                value={option.action}
                label={
                  <Group gap="xs">
                    <Text size="sm">{option.label}</Text>
                    {option.recommended && (
                      <Text size="xs" c="green" fw={500}>
                        (Recommended)
                      </Text>
                    )}
                  </Group>
                }
              />
            ))}
          </Stack>
        </Radio.Group>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedAction}
            loading={isLoading}
          >
            Continue
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

