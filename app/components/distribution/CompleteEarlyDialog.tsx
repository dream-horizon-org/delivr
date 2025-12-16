/**
 * CompleteEarlyDialog - Confirmation dialog for completing phased release early
 * 
 * Features:
 * - Warning about releasing to 100% immediately
 * - Explains action is irreversible
 * - Shows current day of 7-day rollout
 * - Cancel and Confirm buttons
 */

import {
  Alert,
  Button,
  Group,
  List,
  Modal,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconTrendingUp } from '@tabler/icons-react';
import { useCallback } from 'react';
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
} from '~/constants/distribution/distribution.constants';

// ============================================================================
// TYPES
// ============================================================================

export type CompleteEarlyDialogProps = {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentDay: number;
  currentPercentage: number;
  isLoading?: boolean;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CompleteEarlyDialog({
  opened,
  onClose,
  onConfirm,
  currentDay,
  currentPercentage,
  isLoading = false,
}: CompleteEarlyDialogProps) {
  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={DS_SPACING.SM}>
          <ThemeIcon color={DS_COLORS.STATUS.WARNING} variant="light" size="lg">
            <IconAlertTriangle size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={DIST_FONT_WEIGHTS.SEMIBOLD}>
            Complete Phased Release Early
          </Text>
        </Group>
      }
      {...DIST_MODAL_PROPS.DEFAULT}
      closeOnClickOutside={false}
      closeOnEscape={!isLoading}
    >
      <Stack gap={DS_SPACING.MD}>
        {/* Warning Alert */}
        <Alert
          {...DIST_ALERT_PROPS.WARNING}
          icon={<IconAlertTriangle size={DIALOG_ICON_SIZES.ALERT} />}
        >
          <Stack gap={DS_SPACING.XS}>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.SEMIBOLD}>
              Release to 100% of users immediately?
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}>
              Currently on Day {currentDay} of 7 (~{currentPercentage.toFixed(0)}% of users)
            </Text>
          </Stack>
        </Alert>

        {/* Explanation */}
        <div>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} mb={DS_SPACING.XS}>
            This action will skip the remaining days of the automatic phased release and 
            immediately release your app to <Text span fw={DIST_FONT_WEIGHTS.SEMIBOLD}>100% of all users</Text>.
          </Text>
        </div>

        {/* What Happens List */}
        <div>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DIST_FONT_WEIGHTS.SEMIBOLD} mb={DS_SPACING.XS}>
            What happens next:
          </Text>
          <List
            spacing={DS_SPACING.XS}
            size={DS_TYPOGRAPHY.SIZE.SM}
            icon={
              <ThemeIcon color={DS_COLORS.STATUS.INFO} size={20} radius="xl" variant="light">
                <IconTrendingUp size={12} />
              </ThemeIcon>
            }
          >
            <List.Item>
              <Text size={DS_TYPOGRAPHY.SIZE.SM}>Rollout jumps from {currentPercentage.toFixed(0)}% to 100% immediately</Text>
            </List.Item>
            <List.Item>
              <Text size={DS_TYPOGRAPHY.SIZE.SM}>All remaining users will receive the update</Text>
            </List.Item>
            <List.Item>
              <Text size={DS_TYPOGRAPHY.SIZE.SM}>This action cannot be undone</Text>
            </List.Item>
            <List.Item>
              <Text size={DS_TYPOGRAPHY.SIZE.SM}>You can still halt the release if critical issues arise</Text>
            </List.Item>
          </List>
        </div>

        {/* Info Note */}
        <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY} fs="italic">
          💡 Use this if you're confident the release is stable and want to expedite the rollout.
        </Text>

        {/* Action Buttons */}
        <Group justify="flex-end" mt={DS_SPACING.LG}>
          <Button
            {...DIST_BUTTON_PROPS.SUBTLE}
            onClick={onClose}
            disabled={isLoading}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button
            color={DS_COLORS.STATUS.WARNING}
            loading={isLoading}
            onClick={handleConfirm}
            leftSection={<IconCheck size={DIALOG_ICON_SIZES.ACTION} />}
            {...DIST_BUTTON_PROPS.PRIMARY}
          >
            Release to 100%
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

