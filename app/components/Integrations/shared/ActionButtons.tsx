/**
 * Action Buttons Component
 * Reusable button group for integration flows
 */

import { Button, Group } from '@mantine/core';

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
  primaryClassName?: string;
  secondaryClassName?: string;
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
  primaryClassName = 'bg-blue-600 hover:bg-blue-700',
  secondaryClassName = 'bg-gray-600 hover:bg-gray-700'
}: ActionButtonsProps) {
  return (
    <Group justify="space-between" className="mt-6">
      <div>
        {onCancel && (
          <Button variant="subtle" onClick={onCancel} disabled={isCancelDisabled}>
            {cancelLabel}
          </Button>
        )}
        {onBack && (
          <Button variant="subtle" onClick={onBack}>
            {backLabel}
          </Button>
        )}
      </div>
      <Group>
        {onSecondary && secondaryLabel && (
          <Button
            variant="light"
            onClick={onSecondary}
            loading={isSecondaryLoading}
            disabled={isSecondaryDisabled || isSecondaryLoading}
            className={secondaryClassName}
          >
            {secondaryLabel}
          </Button>
        )}
        <Button
          onClick={onPrimary}
          loading={isPrimaryLoading}
          disabled={isPrimaryDisabled || isPrimaryLoading}
          className={primaryClassName}
        >
          {primaryLabel}
        </Button>
      </Group>
    </Group>
  );
}

