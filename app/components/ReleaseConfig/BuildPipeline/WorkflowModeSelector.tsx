/**
 * Workflow Mode Selector Component
 * Allows user to choose between using existing workflow or creating new one
 */

import { SegmentedControl, Text } from '@mantine/core';
import { CONFIG_MODES } from '~/types/release-config-constants';

interface WorkflowModeSelectorProps {
  configMode: typeof CONFIG_MODES[keyof typeof CONFIG_MODES];
  onChange: (mode: typeof CONFIG_MODES[keyof typeof CONFIG_MODES]) => void;
  existingWorkflowCount: number;
}

export function WorkflowModeSelector({
  configMode,
  onChange,
  existingWorkflowCount,
}: WorkflowModeSelectorProps) {
  if (existingWorkflowCount === 0) {
    return null;
  }

  return (
    <div>
      <Text size="sm" fw={500} className="mb-2">
        Workflow Configuration
      </Text>
      <SegmentedControl
        value={configMode}
        onChange={(val) => onChange(val as typeof configMode)}
        data={[
          { value: CONFIG_MODES.EXISTING, label: `Use Existing (${existingWorkflowCount})` },
          { value: CONFIG_MODES.NEW, label: 'Create New' },
        ]}
        fullWidth
      />
    </div>
  );
}


