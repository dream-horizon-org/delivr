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
  DIST_ALERT_PROPS,
  DIST_BUTTON_PROPS,
  DS_COLORS,
  DS_TYPOGRAPHY,
  DIST_FONT_WEIGHTS,
  DIST_MODAL_PROPS,
  DS_SPACING,
} from '~/constants/distribution/distribution-design.constants';
import {
    BUTTON_LABELS,
    DIALOG_ICON_SIZES,
    DIALOG_UI,
    PLATFORM_LABELS,
} from '~/constants/distribution/distribution.constants';
import { Platform, SubmissionStatus } from '~/types/distribution/distribution.types';

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
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.STATUS.WARNING} variant="light" size="lg">
            <IconAlertTriangle size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={DIST_FONT_WEIGHTS.SEMIBOLD}>{conflict.resolution.title}</Text>
        </Group>
      }
      {...DIST_MODAL_PROPS.LARGE}
    >
      <Stack gap={DS_SPACING.LG}>
        {/* Current rollout info */}
        <Alert 
          {...DIST_ALERT_PROPS.INFO}
          icon={<IconInfoCircle size={DIALOG_ICON_SIZES.ALERT} />}
        >
          <Text size={DS_TYPOGRAPHY.SIZE.SM}>{currentReleaseInfo}</Text>
        </Alert>

        <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.SECONDARY}>
          {conflict.resolution.message}
        </Text>

        <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.MEDIUM} c={DS_COLORS.STATUS.WARNING}>
          {DIALOG_UI.EXPOSURE_CONTROL.IMPACT_LABEL} {conflict.resolution.impact}
        </Text>

        <Radio.Group
          value={selectedAction}
          onChange={handleActionChange}
          label={DIALOG_UI.EXPOSURE_CONTROL.ACTION_PROMPT}
        >
          <Stack gap={DS_SPACING.SM} mt={DS_SPACING.XS}>
            {conflict.resolution.options.map((option) => (
              <Radio
                key={option.action}
                value={option.action}
                label={
                  <Stack gap={2}>
                    <Group gap={DS_SPACING.XS}>
                      <Text size={DS_TYPOGRAPHY.SIZE.SM}>{option.label}</Text>
                      {option.recommended && (
                        <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.STATUS.SUCCESS} fw={DIST_FONT_WEIGHTS.MEDIUM}>
                          (Recommended)
                        </Text>
                      )}
                    </Group>
                    {option.warning && (
                      <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.STATUS.WARNING}>
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
          <Alert {...DIST_ALERT_PROPS.WARNING}>
            <Text size={DS_TYPOGRAPHY.SIZE.SM}>{selectedOption.warning}</Text>
          </Alert>
        )}

        <Group justify="flex-end" mt={DS_SPACING.XL}>
          <Button 
            {...DIST_BUTTON_PROPS.SUBTLE}
            onClick={handleClose} 
            disabled={isLoading}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button
            {...DIST_BUTTON_PROPS.PRIMARY}
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

