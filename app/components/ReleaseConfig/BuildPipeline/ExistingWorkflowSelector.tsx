/**
 * Existing Workflow Selector Component
 * Allows user to select from existing workflows with preview
 */

import { Stack, Select } from '@mantine/core';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { FIELD_LABELS, PLACEHOLDERS } from '~/constants/release-config-ui';
import { WorkflowPreviewCard } from './WorkflowPreviewCard';

interface ExistingWorkflowSelectorProps {
  workflows: CICDWorkflow[];
  selectedWorkflowId?: string;
  onSelect: (workflowId: string | undefined) => void;
}

export function ExistingWorkflowSelector({
  workflows,
  selectedWorkflowId,
  onSelect,
}: ExistingWorkflowSelectorProps) {
  if (workflows.length === 0) {
    return null;
  }

  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);

  return (
    <Stack gap="sm">
      <Select
        label={FIELD_LABELS.SELECT_WORKFLOW}
        placeholder={PLACEHOLDERS.SELECT_WORKFLOW}
        data={workflows.map(w => ({
          value: w.id,
          label: w.displayName,
        }))}
        value={selectedWorkflowId}
        onChange={(val) => onSelect(val || undefined)}
        required
        searchable
      />

      {selectedWorkflow && (
        <WorkflowPreviewCard workflow={selectedWorkflow} />
      )}
    </Stack>
  );
}


