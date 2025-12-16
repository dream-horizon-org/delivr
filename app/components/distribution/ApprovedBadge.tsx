/**
 * ApprovedBadge - Badge showing PM approval status
 */

import { Badge } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { DISTRIBUTION_UI_LABELS } from '~/constants/distribution.constants';

export function ApprovedBadge() {
  return (
    <Badge 
      color="green" 
      variant="light" 
      leftSection={<IconCheck size={14} />}
      size="lg"
    >
      {DISTRIBUTION_UI_LABELS.APPROVED}
    </Badge>
  );
}

