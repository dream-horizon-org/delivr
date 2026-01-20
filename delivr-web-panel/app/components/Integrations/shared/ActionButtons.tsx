/**
 * Action Buttons Component
 * Reusable button group for integration flows
 */

import { Button, Group } from '@mantine/core';
import { IconArrowLeft, IconCheck, IconX } from '@tabler/icons-react';

interface ActionButtonsProps {
  onCancel?: () => void;
  onBack?: () => void;
  onSecondary?: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  secondaryLabel?: string;
  cancelLabel?: string;
  backLabel?: string;
  isPrimaryLoading?: boolean;
  isPrimaryDisabled?: boolean;
  isSecondaryLoading?: boolean;
  isSecondaryDisabled?: boolean;
  isCancelDisabled?: boolean;
}

export function ActionButtons({ 
  onCancel,
  onBack,
  onSecondary,
  onPrimary,
  primaryLabel,
  secondaryLabel,
  cancelLabel = 'Cancel',
  backLabel = 'Back',
  isPrimaryLoading = false,
  isPrimaryDisabled = false,
  isSecondaryLoading = false,
  isSecondaryDisabled = false,
  isCancelDisabled = false,
}: ActionButtonsProps) {
  return (
    <Group justify="space-between" mt="lg">
      <Group>
        {onCancel && (
          <Button 
            variant="default" 
            size="sm"
            onClick={onCancel} 
            disabled={isCancelDisabled}
            leftSection={<IconX size={14} />}
          >
            {cancelLabel}
          </Button>
        )}
        {onBack && (
          <Button 
            variant="default" 
            size="sm"
            onClick={onBack}
            leftSection={<IconArrowLeft size={14} />}
          >
            {backLabel}
          </Button>
        )}
      </Group>
      <Group gap="sm">
        {onSecondary && secondaryLabel && (
          <Button
            variant="light"
            color="gray"
            size="sm"
            onClick={onSecondary}
            loading={isSecondaryLoading}
            disabled={isSecondaryDisabled || isSecondaryLoading}
          >
            {secondaryLabel}
          </Button>
        )}
        <Button
          color="brand"
          size="sm"
          onClick={onPrimary}
          loading={isPrimaryLoading}
          disabled={isPrimaryDisabled || isPrimaryLoading}
          leftSection={!isPrimaryLoading ? <IconCheck size={14} /> : undefined}
        >
          {primaryLabel}
        </Button>
      </Group>
    </Group>
  );
}
