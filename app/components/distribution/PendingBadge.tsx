/**
 * PendingBadge - Badge showing pending approval status
 */

import { Badge } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import {
  DIST_BADGE_PROPS,
  DS_COLORS,
  DIST_ICON_SIZES,
} from '~/constants/distribution/distribution-design.constants';

export type PendingBadgeProps = {
  status: string;
};

export function PendingBadge({ status }: PendingBadgeProps) {
  return (
    <Badge 
      {...DIST_BADGE_PROPS.LARGE}
      color={DS_COLORS.STATUS.PENDING}
      leftSection={<IconClock size={DIST_ICON_SIZES.SM} />}
    >
      {status}
    </Badge>
  );
}

