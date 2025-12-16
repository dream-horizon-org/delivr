/**
 * CIJobStatus - Displays CI/CD workflow status badge
 */

import { Badge, Group, Loader, Text } from '@mantine/core';
import { IconCheck, IconClock, IconX } from '@tabler/icons-react';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import { WorkflowStatus } from '~/types/distribution/distribution.types';
import type { Build } from '~/types/distribution/distribution.types';

export type CIJobStatusProps = {
  build: Build;
};

export function CIJobStatus({ build }: CIJobStatusProps) {
  const workflowStatus = build.workflowStatus;
  
  if (!workflowStatus) return null;
  
  const getStatusColor = (status: WorkflowStatus) => {
    switch (status) {
      case WorkflowStatus.COMPLETED: return DS_COLORS.STATUS.SUCCESS;
      case WorkflowStatus.RUNNING: return DS_COLORS.ACTION.PRIMARY;
      case WorkflowStatus.QUEUED: return DS_COLORS.STATUS.WARNING;
      case WorkflowStatus.FAILED: return DS_COLORS.STATUS.ERROR;
      default: return DS_COLORS.STATUS.MUTED;
    }
  };
  
  const getStatusIcon = (status: WorkflowStatus) => {
    switch (status) {
      case WorkflowStatus.COMPLETED: return <IconCheck size={12} />;
      case WorkflowStatus.RUNNING: return <Loader size={12} />;
      case WorkflowStatus.QUEUED: return <IconClock size={12} />;
      case WorkflowStatus.FAILED: return <IconX size={12} />;
      default: return null;
    }
  };
  
  return (
    <Group gap={DS_SPACING.XS}>
      <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>CI Status:</Text>
      <Badge 
        size="sm" 
        variant="light" 
        color={getStatusColor(workflowStatus)}
        leftSection={getStatusIcon(workflowStatus)}
      >
        {workflowStatus}
      </Badge>
    </Group>
  );
}

