/**
 * ManualApprovalDialog - Confirmation dialog for manual release approval
 * 
 * Features:
 * - Role-based access indicator
 * - Optional comments field
 * - Confirmation with acknowledgment
 */

import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertTriangle, IconUserCheck } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import {
  DIST_ALERT_PROPS,
  DIST_BUTTON_PROPS,
  DS_COLORS,
  DS_TYPOGRAPHY,
  DIST_FONT_WEIGHTS,
  DIST_INPUT_PROPS,
  DIST_MODAL_PROPS,
  DS_SPACING,
} from '~/constants/distribution/distribution-design.constants';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DIALOG_TITLES,
  DIALOG_UI,
} from '~/constants/distribution/distribution.constants';
import { ApproverRole } from '~/types/distribution/distribution.types';
import type { ManualApprovalDialogProps } from '~/types/distribution/distribution-component.types';

export function ManualApprovalDialog({
  opened,
  releaseId,
  approverRole,
  isApproving,
  onApprove,
  onClose,
}: ManualApprovalDialogProps) {
  const [comments, setComments] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const roleLabel = useMemo(
    () => (approverRole === ApproverRole.RELEASE_LEAD ? 'Release Lead' : 'Release Pilot'),
    [approverRole]
  );

  const warningMessage = useMemo(
    () => DIALOG_UI.MANUAL_APPROVAL.WARNING_MESSAGE(roleLabel),
    [roleLabel]
  );

  const handleCommentsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComments(e.target.value);
  }, []);

  const handleAcknowledgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAcknowledged(e.currentTarget.checked);
  }, []);

  const handleApprove = useCallback(() => {
    const trimmedComments = comments.trim();
    // Only pass comments if non-empty; function signature allows optional parameter
    if (trimmedComments.length > 0) {
      onApprove(trimmedComments);
    } else {
      onApprove();
    }
  }, [comments, onApprove]);

  const handleClose = useCallback(() => {
    setComments('');
    setAcknowledged(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.STATUS.WARNING} variant="light" size="lg">
            <IconUserCheck size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={DIST_FONT_WEIGHTS.SEMIBOLD}>{DIALOG_TITLES.PM_APPROVAL}</Text>
        </Group>
      }
      {...DIST_MODAL_PROPS.DEFAULT}
    >
      <Stack gap={DS_SPACING.MD}>
        {/* Warning Alert */}
        <Alert 
          {...DIST_ALERT_PROPS.WARNING}
          icon={<IconAlertTriangle size={DIALOG_ICON_SIZES.ALERT} />}
        >
          <Stack gap={DS_SPACING.XS}>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.MEDIUM}>
              {DIALOG_UI.MANUAL_APPROVAL.WARNING_TITLE}
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM}>{warningMessage}</Text>
          </Stack>
        </Alert>

        {/* Release Info */}
        <div>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.SECONDARY}>
            {DIALOG_UI.MANUAL_APPROVAL.RELEASE_ID_LABEL}
          </Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.MEDIUM}>
            {releaseId}
          </Text>
        </div>

        {/* Comments Field */}
        <Textarea
          label={DIALOG_UI.MANUAL_APPROVAL.COMMENTS_LABEL}
          placeholder={DIALOG_UI.MANUAL_APPROVAL.COMMENTS_PLACEHOLDER}
          value={comments}
          onChange={handleCommentsChange}
          minRows={3}
          disabled={isApproving}
          {...DIST_INPUT_PROPS.DEFAULT}
        />

        {/* Acknowledgment Checkbox */}
        <Checkbox
          label={DIALOG_UI.MANUAL_APPROVAL.ACKNOWLEDGMENT}
          checked={acknowledged}
          onChange={handleAcknowledgeChange}
          disabled={isApproving}
        />

        {/* Action Buttons */}
        <Group justify="flex-end" mt={DS_SPACING.LG}>
          <Button 
            {...DIST_BUTTON_PROPS.SUBTLE}
            onClick={handleClose}
            disabled={isApproving}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button 
            color={DS_COLORS.STATUS.WARNING}
            onClick={handleApprove}
            disabled={!acknowledged}
            loading={isApproving}
            leftSection={<IconUserCheck size={DIALOG_ICON_SIZES.ACTION} />}
            {...DIST_BUTTON_PROPS.PRIMARY}
          >
            {BUTTON_LABELS.APPROVE}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

