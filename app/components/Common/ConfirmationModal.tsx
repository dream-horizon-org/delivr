import { Modal, Button, Group, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ConfirmationModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  isLoading?: boolean;
}

export function ConfirmationModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'red',
  isLoading = false,
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    // Don't auto-close - let the parent handle closing after action completes
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      title={
        <div className="flex items-center gap-2">
          <IconAlertTriangle size={24} className="text-yellow-500" />
          <span className="font-semibold">{title}</span>
        </div>
      }
      size="md"
    >
      <div className="space-y-4">
        <Text size="sm" c="dimmed">
          {message}
        </Text>

        <Group justify="flex-end" gap="sm">
          <Button
            variant="subtle"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            color={confirmColor}
            onClick={handleConfirm}
            loading={isLoading}
          >
            {confirmLabel}
          </Button>
        </Group>
      </div>
    </Modal>
  );
}

