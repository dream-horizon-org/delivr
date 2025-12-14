/**
 * VersionConflictDialog - Handle VERSION_EXISTS (409) error
 * 
 * Per API Spec Section 4.7:
 * Shows when version already exists in store and provides resolution options
 */

import { Button, Group, Modal, Radio, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DIALOG_UI,
  PLATFORM_LABELS,
} from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';

// Per API Spec - VERSION_EXISTS error details
export type VersionConflictDetails = {
  platform: Platform;
  version: string;
  existingStatus: 'LIVE' | 'IN_REVIEW' | 'DRAFT'; // Note: DRAFT not in SubmissionStatus enum
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

// Status emoji mapping
const STATUS_EMOJI = {
  LIVE: '🟢',
  IN_REVIEW: '🟡',
  DRAFT: '📝',
} as const;

// Status label mapping
const STATUS_LABELS = {
  LIVE: 'Live',
  IN_REVIEW: 'In Review',
  DRAFT: 'Draft',
} as const;

export function VersionConflictDialog({
  opened,
  onClose,
  conflict,
  onResolve,
  isLoading,
}: VersionConflictDialogProps) {
  const [selectedAction, setSelectedAction] = useState<string>('');

  const platformLabel = useMemo(
    () => (conflict ? PLATFORM_LABELS[conflict.platform] : ''),
    [conflict]
  );

  const statusDisplay = useMemo(() => {
    if (!conflict) return '';
    const emoji = STATUS_EMOJI[conflict.existingStatus];
    const label = STATUS_LABELS[conflict.existingStatus];
    return `${emoji} ${label}`;
  }, [conflict]);

  const availableOptions = useMemo(() => {
    if (!conflict) return [];
    return conflict.resolution.options.filter((option) => {
      // Handle conditional availability (e.g., DELETE_DRAFT only if status is DRAFT)
      if (option.availableIf) {
        if (option.availableIf.includes('DRAFT') && conflict.existingStatus !== 'DRAFT') {
          return false;
        }
      }
      return true;
    });
  }, [conflict]);

  const handleActionChange = useCallback((value: string) => {
    setSelectedAction(value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedAction) {
      onResolve(selectedAction);
    }
  }, [selectedAction, onResolve]);

  const handleClose = useCallback(() => {
    setSelectedAction('');
    onClose();
  }, [onClose]);

  if (!conflict) return null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="orange" variant="light" size="lg">
            <IconAlertTriangle size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={600}>{conflict.resolution.title}</Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Version <strong>{conflict.version}</strong> already exists in{' '}
          {platformLabel} store.
        </Text>

        <Text size="sm" c="dimmed">
          {DIALOG_UI.VERSION_CONFLICT.DESCRIPTION}
        </Text>

        <div>
          <Text size="sm" fw={600} mb={4}>
            Current Status
          </Text>
          <Text size="sm">{statusDisplay}</Text>
        </div>

        <Radio.Group
          value={selectedAction}
          onChange={handleActionChange}
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
                disabled={isLoading}
              />
            ))}
          </Stack>
        </Radio.Group>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedAction}
            loading={isLoading}
            color="blue"
          >
            {BUTTON_LABELS.PROCEED}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

