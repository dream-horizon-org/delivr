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
  BUTTON_LABELS,
  DIALOG_ICON_SIZES,
} from '~/constants/distribution.constants';

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
        <Group gap="sm">
          <ThemeIcon color="orange" variant="light" size="lg">
            <IconAlertTriangle size={DIALOG_ICON_SIZES.TITLE} />
          </ThemeIcon>
          <Text fw={600}>
            Complete Phased Release Early
          </Text>
        </Group>
      }
      size="md"
      centered
      closeOnClickOutside={false}
      closeOnEscape={!isLoading}
    >
      <Stack gap="md">
        {/* Warning Alert */}
        <Alert
          color="orange"
          variant="light"
          icon={<IconAlertTriangle size={DIALOG_ICON_SIZES.ALERT} />}
        >
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              Release to 100% of users immediately?
            </Text>
            <Text size="xs" c="dimmed">
              Currently on Day {currentDay} of 7 (~{currentPercentage.toFixed(0)}% of users)
            </Text>
          </Stack>
        </Alert>

        {/* Explanation */}
        <div>
          <Text size="sm" mb="xs">
            This action will skip the remaining days of the automatic phased release and 
            immediately release your app to <Text span fw={600}>100% of all users</Text>.
          </Text>
        </div>

        {/* What Happens List */}
        <div>
          <Text size="sm" fw={600} mb="xs">
            What happens next:
          </Text>
          <List
            spacing="xs"
            size="sm"
            icon={
              <ThemeIcon color="blue" size={20} radius="xl" variant="light">
                <IconTrendingUp size={12} />
              </ThemeIcon>
            }
          >
            <List.Item>
              <Text size="sm">Rollout jumps from {currentPercentage.toFixed(0)}% to 100% immediately</Text>
            </List.Item>
            <List.Item>
              <Text size="sm">All remaining users will receive the update</Text>
            </List.Item>
            <List.Item>
              <Text size="sm">This action cannot be undone</Text>
            </List.Item>
            <List.Item>
              <Text size="sm">You can still halt the release if critical issues arise</Text>
            </List.Item>
          </List>
        </div>

        {/* Info Note */}
        <Text size="xs" c="dimmed" fs="italic">
          💡 Use this if you're confident the release is stable and want to expedite the rollout.
        </Text>

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            onClick={onClose}
            disabled={isLoading}
          >
            {BUTTON_LABELS.CANCEL}
          </Button>
          <Button
            color="orange"
            loading={isLoading}
            onClick={handleConfirm}
            leftSection={<IconCheck size={DIALOG_ICON_SIZES.ACTION} />}
          >
            Release to 100%
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

