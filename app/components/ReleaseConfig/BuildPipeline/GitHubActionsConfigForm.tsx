/**
 * GitHub Actions Configuration Form Component
 * Captures GitHub Actions-specific build configuration
 */

import { useState } from 'react';
import { TextInput, Select, Stack, Button, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { GitHubActionsConfig } from '~/types/release-config';

interface GitHubActionsConfigFormProps {
  config: Partial<GitHubActionsConfig>;
  onChange: (config: Partial<GitHubActionsConfig>) => void;
  availableIntegrations: Array<{ id: string; name: string }>;
}

export function GitHubActionsConfigForm({
  config,
  onChange,
  availableIntegrations,
}: GitHubActionsConfigFormProps) {
  const [newInputKey, setNewInputKey] = useState('');
  const [newInputValue, setNewInputValue] = useState('');
  
  const inputs = config.inputs || {};
  
  const handleAddInput = () => {
    if (newInputKey && newInputValue) {
      onChange({
        ...config,
        inputs: {
          ...inputs,
          [newInputKey]: newInputValue,
        },
      });
      setNewInputKey('');
      setNewInputValue('');
    }
  };
  
  const handleRemoveInput = (key: string) => {
    const newInputs = { ...inputs };
    delete newInputs[key];
    onChange({
      ...config,
      inputs: newInputs,
    });
  };
  
  return (
    <Stack gap="md">
      <Select
        label="GitHub Repository"
        placeholder="Select GitHub repository"
        data={availableIntegrations.map(i => ({ value: i.id, label: i.name }))}
        value={config.integrationId}
        onChange={(val) => onChange({ ...config, integrationId: val || '' })}
        required
        description="Choose the connected GitHub repository"
      />
      
      <TextInput
        label="Workflow Path"
        placeholder=".github/workflows/build.yml"
        value={config.workflowPath || ''}
        onChange={(e) => onChange({ ...config, workflowPath: e.target.value })}
        required
        description="Path to the GitHub Actions workflow file"
      />
      
      <TextInput
        label="Workflow ID"
        placeholder="build.yml"
        value={config.workflowId || ''}
        onChange={(e) => onChange({ ...config, workflowId: e.target.value })}
        required
        description="Workflow file name"
      />
      
      <TextInput
        label="Branch"
        placeholder="main"
        value={config.branch || 'main'}
        onChange={(e) => onChange({ ...config, branch: e.target.value })}
        required
        description="Branch to run the workflow on"
      />
      
      <div>
        <Text size="sm" fw={500} className="mb-2">
          Workflow Inputs
        </Text>
        
        {Object.entries(inputs).length > 0 ? (
          <Stack gap="xs" className="mb-3">
            {Object.entries(inputs).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
              >
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Text size="sm" fw={500}>
                    {key}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {value}
                  </Text>
                </div>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={() => handleRemoveInput(key)}
                  leftSection={<IconTrash size={14} />}
                >
                  Remove
                </Button>
              </div>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" className="mb-3">
            No inputs added yet
          </Text>
        )}
        
        <div className="flex gap-2">
          <TextInput
            placeholder="Input name"
            value={newInputKey}
            onChange={(e) => setNewInputKey(e.target.value)}
            className="flex-1"
          />
          <TextInput
            placeholder="Input value"
            value={newInputValue}
            onChange={(e) => setNewInputValue(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={handleAddInput}
            disabled={!newInputKey || !newInputValue}
          >
            Add
          </Button>
        </div>
      </div>
    </Stack>
  );
}

