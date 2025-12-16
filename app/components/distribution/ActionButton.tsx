/**
 * ActionButton - Rollout action button with optional tooltip
 */

import { Button, Tooltip } from '@mantine/core';
import { DIST_BUTTON_PROPS } from '~/constants/distribution-design.constants';

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
      {...DIST_BUTTON_PROPS.SECONDARY}
      color={color}
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

