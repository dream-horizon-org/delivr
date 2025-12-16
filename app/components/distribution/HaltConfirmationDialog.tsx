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
    DS_COLORS,
    DS_SPACING,
    DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import {
    BUTTON_LABELS,
    DIALOG_ICON_SIZES,
    DIALOG_UI,
    HALT_REASON_VALIDATION,
} from '~/constants/distribution/distribution.constants';

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
        if (value.trim().length < HALT_REASON_VALIDATION.MIN_LENGTH) {
          return `Minimum ${HALT_REASON_VALIDATION.MIN_LENGTH} characters required`;
        }
        if (value.length > HALT_REASON_VALIDATION.MAX_LENGTH) {
          return `Maximum ${HALT_REASON_VALIDATION.MAX_LENGTH} characters allowed`;
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
  const isNearLimit = characterCount > HALT_REASON_VALIDATION.MAX_LENGTH * 0.9;

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
            description={`${characterCount} / ${HALT_REASON_VALIDATION.MAX_LENGTH} characters ${
              characterCount < HALT_REASON_VALIDATION.MIN_LENGTH
                ? `(minimum ${HALT_REASON_VALIDATION.MIN_LENGTH})`
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

