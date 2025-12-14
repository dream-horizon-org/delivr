/**
 * HaltRolloutDialog - Emergency halt confirmation dialog
 * 
 * Features:
 * - Required reason field
 * - Clear warning about consequences
 * 
 * Note: Severity field removed per API spec (only reason required)
 */

import {
  Alert,
  Button,
  Group,
  List,
  Modal,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertOctagon, IconAlertTriangle } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DIALOG_TITLES,
  DIALOG_UI,
  PLATFORM_LABELS,
} from '~/constants/distribution.constants';
import type { HaltRolloutDialogProps } from './distribution.types';

export function HaltRolloutDialog({
  opened,
  submissionId,
  platform,
  isHalting,
  onHalt,
  onClose,
}: HaltRolloutDialogProps) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const platformLabel = PLATFORM_LABELS[platform];

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  }, [validationError]);

  const handleHalt = useCallback(() => {
    if (!reason.trim()) {
      setValidationError(DIALOG_UI.HALT.REASON_REQUIRED);
      return;
    }

    setValidationError(null);
    onHalt(reason.trim());
  }, [reason, onHalt]);

  const handleClose = useCallback(() => {
    setReason('');
    setValidationError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="red" variant="light" size="lg">
            <IconAlertOctagon size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={600}>{DIALOG_TITLES.HALT_ROLLOUT}</Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Warning Alert */}
        <Alert 
          icon={<IconAlertTriangle size={DIALOG_ICON_SIZES.ALERT} />} 
          color="red" 
          variant="light"
        >
          <Stack gap="xs">
            <Text size="sm" fw={500}>{DIALOG_UI.HALT.WARNING_TITLE}</Text>
            <Text size="sm">{DIALOG_UI.HALT.WARNING_MESSAGE}</Text>
          </Stack>
        </Alert>

        {/* Platform Info */}
        <div>
          <Text size="sm" c="dimmed">Platform</Text>
          <Text size="sm" fw={500}>{platformLabel}</Text>
        </div>

        {/* Reason Field */}
        <Textarea
          label={DIALOG_UI.HALT.REASON_LABEL}
          placeholder={DIALOG_UI.HALT.REASON_PLACEHOLDER}
          value={reason}
          onChange={handleReasonChange}
          minRows={3}
          required
          error={validationError}
          disabled={isHalting}
        />

        {/* Consequences */}
        <div>
          <Text size="sm" fw={500} mb="xs">{DIALOG_UI.HALT.CONSEQUENCE_TITLE}</Text>
          <List size="sm" spacing="xs">
            {DIALOG_UI.HALT.CONSEQUENCE_ITEMS.map((item, index) => (
              <List.Item key={index}>{item}</List.Item>
            ))}
          </List>
        </div>

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button 
            variant="subtle" 
            onClick={handleClose}
            disabled={isHalting}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button 
            color="red" 
            onClick={handleHalt}
            loading={isHalting}
            leftSection={<IconAlertOctagon size={DIALOG_ICON_SIZES.ACTION} />}
          >
            {BUTTON_LABELS.HALT_ROLLOUT}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

