/**
 * ActionButton - Rollout action button with optional tooltip
 */

import { Button, Tooltip } from '@mantine/core';

export type ActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
};

export function ActionButton({
  icon,
  label,
  color,
  onClick,
  disabled,
  loading,
  tooltip,
}: ActionButtonProps) {
  const button = (
    <Button
      variant="light"
      color={color}
      size="sm"
      leftSection={icon}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
    >
      {label}
    </Button>
  );

  if (tooltip && disabled) {
    return (
      <Tooltip label={tooltip} withArrow>
        <span>{button}</span>
      </Tooltip>
    );
  }

  return button;
}

