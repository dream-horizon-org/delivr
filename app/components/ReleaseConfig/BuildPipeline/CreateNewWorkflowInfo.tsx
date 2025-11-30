/**
 * Create New Workflow Info Component
 * Displays information about creating a new workflow
 */

import { Alert, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

export function CreateNewWorkflowInfo() {
  return (
    <Alert icon={<IconInfoCircle size={18} />} color="grape" variant="light">
      <Text size="sm">
        Click "Save" to create a new workflow. It will be saved as a reusable workflow for your tenant 
        and automatically attached to this release configuration.
      </Text>
    </Alert>
  );
}

