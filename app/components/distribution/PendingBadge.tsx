/**
 * PendingBadge - Badge showing pending approval status
 */

import { Badge } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';

type PendingBadgeProps = {
  status: string;
};

export function PendingBadge({ status }: PendingBadgeProps) {
  return (
    <Badge 
      color="yellow" 
      variant="light" 
      leftSection={<IconClock size={14} />}
      size="lg"
    >
      {status}
    </Badge>
  );
}

