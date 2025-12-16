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
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';

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
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.STATUS.ERROR} variant="light" size="lg" radius={DS_SPACING.BORDER_RADIUS}>
            <IconAlertOctagon size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} c={DS_COLORS.STATUS.ERROR}>
            {DIALOG_UI.HALT.WARNING_TITLE}
          </Text>
        </Group>
      }
      size="md"
      centered
      closeOnClickOutside={false}
      closeOnEscape={!isLoading}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap={DS_SPACING.MD}>
          {/* Warning Alert */}
          <Alert
            color={DS_COLORS.STATUS.ERROR}
            variant="light"
            icon={<IconAlertTriangle size={DIALOG_ICON_SIZES.ALERT} />}
            radius={DS_SPACING.BORDER_RADIUS}
          >
            <Stack gap={DS_SPACING.XS}>
              <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD}>
                {DIALOG_UI.HALT.WARNING_MESSAGE}
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                Platform: {platform} | Version: {version}
              </Text>
            </Stack>
          </Alert>

          {/* Consequences List */}
          <div>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} mb={DS_SPACING.XS}>
              {DIALOG_UI.HALT.CONSEQUENCE_TITLE}
            </Text>
            <List
              spacing={DS_SPACING.XS}
              size={DS_TYPOGRAPHY.SIZE.SM}
              icon={
                <ThemeIcon color={DS_COLORS.STATUS.ERROR} size={20} radius="xl" variant="light">
                  <IconX size={12} />
                </ThemeIcon>
              }
            >
              {DIALOG_UI.HALT.CONSEQUENCE_ITEMS.map((item, index) => (
                <List.Item key={index}>
                  <Text size={DS_TYPOGRAPHY.SIZE.SM}>{item}</Text>
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
          <Group justify="flex-end" mt={DS_SPACING.LG}>
            <Button
              variant="subtle"
              onClick={handleClose}
              disabled={isLoading}
              radius={DS_SPACING.BORDER_RADIUS}
            >
              {BUTTON_LABELS.CANCEL}
            </Button>
            <Button
              type="submit"
              color={DS_COLORS.STATUS.ERROR}
              loading={isLoading}
              leftSection={<IconAlertOctagon size={DIALOG_ICON_SIZES.ACTION} />}
              radius={DS_SPACING.BORDER_RADIUS}
            >
              {BUTTON_LABELS.HALT_ROLLOUT}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

