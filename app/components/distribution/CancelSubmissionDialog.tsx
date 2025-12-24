/**
 * CancelSubmissionDialog - Confirmation dialog for cancelling a submission
 * 
 * Can only cancel submissions in:
 * - IN_REVIEW
 * - WAITING_FOR_REVIEW (iOS)
 * - APPROVED
 * - PENDING_DEVELOPER_RELEASE (iOS)
 * 
 * Cannot cancel LIVE submissions
 */

import {
  Alert,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { useFetcher } from '@remix-run/react';
import { IconAlertCircle, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_ROUTES } from '~/constants/distribution/distribution-api.constants';
import {
  DIST_ALERT_PROPS,
  DIST_BUTTON_PROPS,
  DIST_CARD_PROPS,
  DIST_FONT_WEIGHTS,
  DIST_INPUT_PROPS,
  DIST_MODAL_PROPS,
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DIALOG_TITLES,
  DIALOG_UI,
  PLATFORM_LABELS,
} from '~/constants/distribution/distribution.constants';
import { Platform } from '~/types/distribution/distribution.types';
import { formatStatus } from '~/utils/distribution/distribution-ui.utils';

export type CancelSubmissionDialogProps = {
  opened: boolean;
  onClose: () => void;
  tenantId: string;
  submissionId: string;
  platform: string;
  version: string;
  currentStatus: string;
  onCancelComplete?: () => void;
};

type CancelResponse = {
  success?: boolean;
  error?: { message: string };
};

export function CancelSubmissionDialog({
  opened,
  onClose,
  tenantId,
  submissionId,
  platform,
  version,
  currentStatus,
  onCancelComplete,
}: CancelSubmissionDialogProps) {
  const [reason, setReason] = useState('');
  const fetcher = useFetcher<CancelResponse>();
  const isSubmitting = fetcher.state === 'submitting';

  const confirmationText = useMemo(
    () => DIALOG_UI.CANCEL_SUBMISSION.CONFIRMATION(PLATFORM_LABELS[platform as Platform], version),
    [platform, version]
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.currentTarget.value);
    if (validationError) {
      setValidationError(null);
    }
  }, [validationError]);

  const handleCancel = useCallback(() => {
    const trimmedReason = reason.trim();
    
    // Validate: reason is mandatory
    if (!trimmedReason) {
      setValidationError(DIALOG_UI.CANCEL_SUBMISSION.REASON_REQUIRED);
      return;
    }

    const payload = {
      reason: trimmedReason,
    };

    fetcher.submit(JSON.stringify(payload), {
      method: 'delete',
      action: API_ROUTES.cancelSubmission(tenantId, submissionId, platform),
      encType: 'application/json',
    });
  }, [tenantId, submissionId, platform, reason, fetcher]);

  const handleClose = useCallback(() => {
    setReason('');
    setValidationError(null);
    onClose();
  }, [onClose]);

  // Handle successful submission
  useEffect(() => {
    if (fetcher.data?.success && onCancelComplete) {
      onCancelComplete();
      handleClose();
    }
  }, [fetcher.data, onCancelComplete, handleClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.STATUS.WARNING} variant="light" size="lg">
            <IconAlertCircle size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={DIST_FONT_WEIGHTS.SEMIBOLD}>{DIALOG_TITLES.CANCEL_SUBMISSION}</Text>
        </Group>
      }
      {...DIST_MODAL_PROPS.DEFAULT}
    >
      <Stack gap={DS_SPACING.MD}>
        <Alert {...DIST_ALERT_PROPS.WARNING}>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.MEDIUM}>
            {confirmationText}
          </Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} mt={DS_SPACING.SM} c={DS_COLORS.TEXT.SECONDARY}>
            {DIALOG_UI.CANCEL_SUBMISSION.DESCRIPTION}
          </Text>
        </Alert>

        <Paper {...DIST_CARD_PROPS.COMPACT} p={DS_SPACING.MD}>
          <Group justify="space-between">
            <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.SECONDARY}>
              Current Status
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.MEDIUM}>
              {formatStatus(currentStatus)}
            </Text>
          </Group>
        </Paper>

        <Textarea
          label={DIALOG_UI.CANCEL_SUBMISSION.REASON_LABEL}
          placeholder={DIALOG_UI.CANCEL_SUBMISSION.REASON_PLACEHOLDER}
          value={reason}
          onChange={handleReasonChange}
          minRows={3}
          maxRows={5}
          disabled={isSubmitting}
          required
          error={validationError}
          {...DIST_INPUT_PROPS.DEFAULT}
        />

        <Group justify="flex-end" mt={DS_SPACING.LG}>
          <Button
            {...DIST_BUTTON_PROPS.SUBTLE}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button
            {...DIST_BUTTON_PROPS.DANGER}
            onClick={handleCancel}
            loading={isSubmitting}
            leftSection={<IconX size={DIALOG_ICON_SIZES.ACTION} />}
          >
            {DIALOG_TITLES.CANCEL_SUBMISSION}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

