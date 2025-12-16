/**
 * ApprovedBadge - Badge showing PM approval status
 */

import { Badge } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import {
  DIST_BADGE_PROPS,
  DS_COLORS,
  DIST_ICON_SIZES,
} from '~/constants/distribution/distribution-design.constants';
import { DISTRIBUTION_UI_LABELS } from '~/constants/distribution/distribution.constants';

export function ApprovedBadge() {
  return (
    <Badge 
      {...DIST_BADGE_PROPS.LARGE}
      color={DS_COLORS.STATUS.SUCCESS}
      leftSection={<IconCheck size={DIST_ICON_SIZES.SM} />}
    >
      {DISTRIBUTION_UI_LABELS.APPROVED}
    </Badge>
  );
}

