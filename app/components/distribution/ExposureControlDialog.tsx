/**
 * ExposureControlDialog - Handle EXPOSURE_CONTROL_CONFLICT (409) error
 * 
 * Per API Spec Section 4.7:
 * Shows when previous release has active partial rollout
 */

import { Alert, Button, Group, Modal, Radio, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { PLATFORM_LABELS } from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';

// Per API Spec - EXPOSURE_CONTROL_CONFLICT error details
export type ExposureControlConflictDetails = {
  platform: Platform;
  currentRelease: {
    version: string;
    exposurePercent: number;
    status: 'LIVE' | 'APPROVED';
  };
  resolution: {
    title: string;
    message: string;
    impact: string;
    options: Array<{
      action: string;
      label: string;
      recommended?: boolean;
      warning?: string;
    }>;
  };
};

export type ExposureControlDialogProps = {
  opened: boolean;
  onClose: () => void;
  conflict: ExposureControlConflictDetails | null;
  onResolve: (action: string) => void;
  isLoading?: boolean;
};

export function ExposureControlDialog({
  opened,
  onClose,
  conflict,
  onResolve,
  isLoading,
}: ExposureControlDialogProps) {
  const [selectedAction, setSelectedAction] = useState<string>('');

  if (!conflict) return null;

  const handleSubmit = () => {
    if (selectedAction) {
      onResolve(selectedAction);
    }
  };

  const selectedOption = conflict.resolution.options.find(
    (opt) => opt.action === selectedAction
  );

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
      size="lg"
    >
      <Stack gap="md">
        {/* Current rollout info */}
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            {PLATFORM_LABELS[conflict.platform]} release{' '}
            <strong>v{conflict.currentRelease.version}</strong> is currently at{' '}
            <strong>{conflict.currentRelease.exposurePercent}%</strong> rollout.
          </Text>
        </Alert>

        <Text size="sm" c="dimmed">
          {conflict.resolution.message}
        </Text>

        <Text size="sm" fw={500} c="orange">
          Impact: {conflict.resolution.impact}
        </Text>

        <Radio.Group
          value={selectedAction}
          onChange={setSelectedAction}
          label="Choose how to proceed:"
        >
          <Stack gap="sm" mt="xs">
            {conflict.resolution.options.map((option) => (
              <Radio
                key={option.action}
                value={option.action}
                label={
                  <Stack gap={2}>
                    <Group gap="xs">
                      <Text size="sm">{option.label}</Text>
                      {option.recommended && (
                        <Text size="xs" c="green" fw={500}>
                          (Recommended)
                        </Text>
                      )}
                    </Group>
                    {option.warning && (
                      <Text size="xs" c="orange">
                        ⚠️ {option.warning}
                      </Text>
                    )}
                  </Stack>
                }
              />
            ))}
          </Stack>
        </Radio.Group>

        {/* Show warning for selected option */}
        {selectedOption?.warning && (
          <Alert color="orange" variant="light">
            <Text size="sm">{selectedOption.warning}</Text>
          </Alert>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedAction}
            loading={isLoading}
            color={selectedOption?.warning ? 'orange' : 'blue'}
          >
            Continue
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

