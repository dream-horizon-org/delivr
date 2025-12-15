/**
 * HaltConfirmationDialog - Confirmation dialog for emergency halt action
 * 
 * Features:
 * - Warning about irreversible action
 * - Required reason field with validation
 * - Character counter
 * - Explains consequences of halting
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
import { useForm } from '@mantine/form';
import { IconAlertOctagon, IconAlertTriangle, IconX } from '@tabler/icons-react';
import { useCallback } from 'react';
import {
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
  DIALOG_UI,
} from '~/constants/distribution.constants';

// ============================================================================
// TYPES
// ============================================================================

export type HaltConfirmationDialogProps = {
  opened: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  platform: string;
  version: string;
  isLoading?: boolean;
};

type HaltFormData = {
  reason: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 1000;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HaltConfirmationDialog({
  opened,
  onClose,
  onConfirm,
  platform,
  version,
  isLoading = false,
}: HaltConfirmationDialogProps) {
  const form = useForm<HaltFormData>({
    initialValues: {
      reason: '',
    },
    validate: {
      reason: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Reason is required';
        }
        if (value.trim().length < MIN_REASON_LENGTH) {
          return `Minimum ${MIN_REASON_LENGTH} characters required`;
        }
        if (value.length > MAX_REASON_LENGTH) {
          return `Maximum ${MAX_REASON_LENGTH} characters allowed`;
        }
        return null;
      },
    },
  });

  const handleSubmit = useCallback(
    (values: HaltFormData) => {
      onConfirm(values.reason.trim());
      form.reset();
    },
    [onConfirm, form]
  );

  const handleClose = useCallback(() => {
    form.reset();
    onClose();
  }, [form, onClose]);

  const characterCount = form.values.reason.length;
  const isNearLimit = characterCount > MAX_REASON_LENGTH * 0.9;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="red" variant="light" size="lg">
            <IconAlertOctagon size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={600} c="red.9">
            {DIALOG_UI.HALT.WARNING_TITLE}
          </Text>
        </Group>
      }
      size="lg"
      centered
      closeOnClickOutside={false}
      closeOnEscape={!isLoading}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {/* Warning Alert */}
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={DIALOG_ICON_SIZES.ALERT} />}
          >
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                {DIALOG_UI.HALT.WARNING_MESSAGE}
              </Text>
              <Text size="xs" c="dimmed">
                Platform: {platform} | Version: {version}
              </Text>
            </Stack>
          </Alert>

          {/* Consequences List */}
          <div>
            <Text size="sm" fw={600} mb="xs">
              {DIALOG_UI.HALT.CONSEQUENCE_TITLE}
            </Text>
            <List
              spacing="xs"
              size="sm"
              icon={
                <ThemeIcon color="red" size={20} radius="xl" variant="light">
                  <IconX size={12} />
                </ThemeIcon>
              }
            >
              {DIALOG_UI.HALT.CONSEQUENCE_ITEMS.map((item, index) => (
                <List.Item key={index}>
                  <Text size="sm">{item}</Text>
                </List.Item>
              ))}
            </List>
          </div>

          {/* Reason Field */}
          <Textarea
            label={DIALOG_UI.HALT.REASON_LABEL}
            placeholder={DIALOG_UI.HALT.REASON_PLACEHOLDER}
            description={`${characterCount} / ${MAX_REASON_LENGTH} characters ${
              characterCount < MIN_REASON_LENGTH
                ? `(minimum ${MIN_REASON_LENGTH})`
                : ''
            }`}
            required
            minRows={4}
            maxRows={8}
            disabled={isLoading}
            autoFocus
            {...form.getInputProps('reason')}
            styles={{
              description: {
                color: isNearLimit ? 'var(--mantine-color-orange-6)' : undefined,
              },
            }}
          />

          {/* Action Buttons */}
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={handleClose}
              disabled={isLoading}
            >
              {BUTTON_LABELS.CANCEL}
            </Button>
            <Button
              type="submit"
              color="red"
              loading={isLoading}
              leftSection={<IconAlertOctagon size={DIALOG_ICON_SIZES.ACTION} />}
            >
              {BUTTON_LABELS.HALT_ROLLOUT}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

