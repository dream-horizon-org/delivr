/**
 * CIJobStatus - Displays CI/CD workflow status badge
 */

import { Badge, Group, Loader, Text } from '@mantine/core';
import { IconCheck, IconClock, IconX } from '@tabler/icons-react';
import { WorkflowStatus } from '~/types/distribution.types';
import type { Build } from '~/types/distribution.types';

type CIJobStatusProps = {
  build: Build;
};

export function CIJobStatus({ build }: CIJobStatusProps) {
  const workflowStatus = build.workflowStatus;
  
  if (!workflowStatus) return null;
  
  const getStatusColor = (status: WorkflowStatus) => {
    switch (status) {
      case WorkflowStatus.COMPLETED: return 'green';
      case WorkflowStatus.RUNNING: return 'blue';
      case WorkflowStatus.QUEUED: return 'yellow';
      case WorkflowStatus.FAILED: return 'red';
      default: return 'gray';
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
    <Group gap="xs">
      <Text size="sm" c="dimmed">CI Status:</Text>
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

