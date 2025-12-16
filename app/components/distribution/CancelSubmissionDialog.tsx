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
import { IconAlertCircle, IconX } from '@tabler/icons-react';
import { useFetcher } from '@remix-run/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DIALOG_TITLES,
  DIALOG_UI,
  PLATFORM_LABELS,
} from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';
import { formatStatus } from '~/utils/distribution-ui.utils';

type CancelSubmissionDialogProps = {
  opened: boolean;
  onClose: () => void;
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
      action: `/api/v1/submissions/${submissionId}/cancel?platform=${platform}`,
      encType: 'application/json',
    });
  }, [submissionId, platform, reason, fetcher]);

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
        <Group gap="sm">
          <ThemeIcon color="orange" variant="light" size="lg">
            <IconAlertCircle size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={600}>{DIALOG_TITLES.CANCEL_SUBMISSION}</Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        <Alert color="orange" variant="light">
          <Text size="sm" fw={500}>
            {confirmationText}
          </Text>
          <Text size="sm" mt="sm" c="dimmed">
            {DIALOG_UI.CANCEL_SUBMISSION.DESCRIPTION}
          </Text>
        </Alert>

        <Paper p="sm" withBorder>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Current Status
            </Text>
            <Text size="sm" fw={500}>
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
        />

        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Keep Submission
          </Button>
          <Button
            color="red"
            onClick={handleCancel}
            loading={isSubmitting}
          >
            Cancel Submission
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

