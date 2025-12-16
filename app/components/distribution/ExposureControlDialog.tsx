/**
 * ExposureControlDialog - Handle EXPOSURE_CONTROL_CONFLICT (409) error
 * 
 * Per API Spec Section 4.7:
 * Shows when previous release has active partial rollout
 */

import { Alert, Button, Group, Modal, Radio, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import {
    BUTTON_LABELS,
    DIALOG_ICON_SIZES,
    DIALOG_UI,
    PLATFORM_LABELS,
} from '~/constants/distribution.constants';
import { Platform, SubmissionStatus } from '~/types/distribution.types';

// Per API Spec - EXPOSURE_CONTROL_CONFLICT error details
export type ExposureControlConflictDetails = {
  platform: Platform;
  currentRelease: {
    version: string;
    rolloutPercentage: number;
    status: SubmissionStatus.LIVE | SubmissionStatus.APPROVED;
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

  const platformLabel = useMemo(
    () => (conflict ? PLATFORM_LABELS[conflict.platform] : ''),
    [conflict]
  );

  const currentReleaseInfo = useMemo(() => {
    if (!conflict) return '';
    return DIALOG_UI.EXPOSURE_CONTROL.CURRENT_RELEASE_INFO(
      platformLabel,
      conflict.currentRelease.version,
      conflict.currentRelease.rolloutPercentage
    );
  }, [conflict, platformLabel]);

  const selectedOption = useMemo(
    () => conflict?.resolution.options.find((opt) => opt.action === selectedAction),
    [conflict, selectedAction]
  );

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

  const buttonColor = useMemo(
    () => (selectedOption?.warning ? 'orange' : 'blue'),
    [selectedOption]
  );

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
      size="lg"
      centered
    >
      <Stack gap="lg">
        {/* Current rollout info */}
        <Alert 
          icon={<IconInfoCircle size={DIALOG_ICON_SIZES.ALERT} />} 
          color="blue" 
          variant="light"
        >
          <Text size="sm">{currentReleaseInfo}</Text>
        </Alert>

        <Text size="sm" c="dimmed">
          {conflict.resolution.message}
        </Text>

        <Text size="sm" fw={500} c="orange">
          {DIALOG_UI.EXPOSURE_CONTROL.IMPACT_LABEL} {conflict.resolution.impact}
        </Text>

        <Radio.Group
          value={selectedAction}
          onChange={handleActionChange}
          label={DIALOG_UI.EXPOSURE_CONTROL.ACTION_PROMPT}
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
                disabled={isLoading}
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

        <Group justify="flex-end" mt="xl">
          <Button 
            variant="subtle" 
            onClick={handleClose} 
            disabled={isLoading}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedAction}
            loading={isLoading}
            color={buttonColor}
          >
            {BUTTON_LABELS.PROCEED}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

