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
} from '~/constants/distribution.constants';

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
    () => DIALOG_UI.CANCEL_SUBMISSION.CONFIRMATION(platform, version),
    [platform, version]
  );

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.currentTarget.value);
  }, []);

  const handleCancel = useCallback(() => {
    const payload = {
      reason: reason.trim() || 'User cancelled submission',
    };

    fetcher.submit(JSON.stringify(payload), {
      method: 'delete',
      action: `/api/v1/submissions/${submissionId}/cancel`,
      encType: 'application/json',
    });
  }, [submissionId, reason, fetcher]);

  const handleClose = useCallback(() => {
    setReason('');
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
        <Alert
          icon={<IconAlertCircle size={DIALOG_ICON_SIZES.ALERT} />}
          color="orange"
          variant="light"
        >
          <Text size="sm">{confirmationText}</Text>
          <Text size="sm" mt="xs">
            {DIALOG_UI.CANCEL_SUBMISSION.DESCRIPTION}
          </Text>
        </Alert>

        <div>
          <Text size="sm" fw={600} mb={4}>
            Current Status
          </Text>
          <Text size="sm" c="dimmed">
            {currentStatus}
          </Text>
        </div>

        <Textarea
          label={DIALOG_UI.CANCEL_SUBMISSION.REASON_LABEL}
          placeholder={DIALOG_UI.CANCEL_SUBMISSION.REASON_PLACEHOLDER}
          value={reason}
          onChange={handleReasonChange}
          minRows={3}
          maxRows={5}
          disabled={isSubmitting}
        />

        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {BUTTON_LABELS.KEEP_SUBMISSION}
          </Button>
          <Button
            color="red"
            onClick={handleCancel}
            loading={isSubmitting}
            leftSection={<IconX size={DIALOG_ICON_SIZES.ACTION} />}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

