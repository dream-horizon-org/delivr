/**
 * GitHub Actions Configuration Form Component
 * Captures GitHub Actions-specific build configuration with dynamic parameter fetching
 */

import { useState } from 'react';
import { TextInput, Select, Stack, Button, Text, Alert, LoadingOverlay, Card, Badge, Group } from '@mantine/core';
import { IconPlus, IconTrash, IconRefresh, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import type { GitHubActionsConfig } from '~/types/release-config';
import type { JobParameter } from '~/.server/services/ReleaseManagement/integrations';

interface GitHubActionsConfigFormProps {
  config: Partial<GitHubActionsConfig>;
  onChange: (config: Partial<GitHubActionsConfig>) => void;
  availableIntegrations: Array<{ id: string; name: string }>;
  tenantId: string;
}

export function GitHubActionsConfigForm({
  config,
  onChange,
  availableIntegrations,
  tenantId,
}: GitHubActionsConfigFormProps) {
  
  // Manual input entry state (legacy fallback)
  const [newInputKey, setNewInputKey] = useState('');
  const [newInputValue, setNewInputValue] = useState('');
  
  // Parameter fetching state
  const [fetchingParams, setFetchingParams] = useState(false);
  const [parametersFetched, setParametersFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedParameters, setFetchedParameters] = useState<JobParameter[]>([]);
  
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
  
  // Fetch workflow inputs from GitHub Actions
  const handleFetchParameters = async () => {
    if (!config.workflowPath?.trim()) {
      setFetchError('Please enter a workflow path first');
      return;
    }
    
    if (!tenantId) {
      setFetchError('No tenant ID provided');
      return;
    }
    
    setFetchingParams(true);
    setFetchError(null);
    
    try {
      const response = await fetch(
        `/api/v1/tenants/${tenantId}/workflows/job-parameters`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerType: 'GITHUB_ACTIONS',
            url: config.workflowPath,
          }),
        }
      );
      
      const result = await response.json();
      
      if (result.success && result.parameters) {
        setFetchedParameters(result.parameters);
        
        // Initialize parameter values with defaults or existing values
        const newInputs: Record<string, string> = {};
        result.parameters.forEach((param: JobParameter) => {
          newInputs[param.name] = 
            inputs[param.name] || 
            param.defaultValue?.toString() || 
            param.default?.toString() || 
            '';
        });
        
        onChange({
          ...config,
          inputs: newInputs,
        });
        
        setParametersFetched(true);
      } else {
        setFetchError(result.error || 'Failed to fetch workflow inputs');
      }
    } catch (error) {
      setFetchError('Network error while fetching workflow inputs');
      console.error('Error fetching workflow inputs:', error);
    } finally {
      setFetchingParams(false);
    }
  };
  
  const handleInputValueChange = (inputName: string, value: string) => {
    onChange({
      ...config,
      inputs: {
        ...inputs,
        [inputName]: value,
      },
    });
  };
  
  return (
    <div className="relative">
      <LoadingOverlay visible={fetchingParams} />
      
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
      
      {/* Fetch Parameters Button */}
      <div>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={handleFetchParameters}
          loading={fetchingParams}
          disabled={!config.workflowPath?.trim()}
          variant="light"
          fullWidth
        >
          Fetch Workflow Inputs
        </Button>
        
        {fetchError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" className="mt-2">
            {fetchError}
          </Alert>
        )}
        
        {parametersFetched && (
          <Alert icon={<IconCheck size={16} />} color="green" className="mt-2">
            Successfully fetched {fetchedParameters.length} input(s)
          </Alert>
        )}
      </div>
      
      {/* Fetched Parameters (Dynamic) */}
      {parametersFetched && fetchedParameters.length > 0 && (
        <div>
          <Text size="sm" fw={500} className="mb-2">
            Workflow Inputs
          </Text>
          
          <Stack gap="sm">
            {fetchedParameters.map((param) => (
              <Card key={param.name} withBorder className="bg-gray-50">
                <Stack gap="xs">
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      {param.name}
                    </Text>
                    {param.required && (
                      <Badge size="xs" color="red">
                        Required
                      </Badge>
                    )}
                    <Badge size="xs" color="gray">
                      {param.type}
                    </Badge>
                  </Group>
                  
                  {param.description && (
                    <Text size="xs" c="dimmed">
                      {param.description}
                    </Text>
                  )}
                  
                  {param.choices && param.choices.length > 0 ? (
                    <Select
                      placeholder="Select a value"
                      data={param.choices.map((choice) => ({
                        value: choice,
                        label: choice,
                      }))}
                      value={inputs[param.name] || ''}
                      onChange={(val) => handleInputValueChange(param.name, val || '')}
                    />
                  ) : (
                    <TextInput
                      placeholder={`Enter ${param.name}`}
                      value={inputs[param.name] || ''}
                      onChange={(e) => handleInputValueChange(param.name, e.target.value)}
                    />
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>
        </div>
      )}
      
      {/* Manual Input Entry (Fallback) */}
      {!parametersFetched && (
        <div>
          <Text size="sm" fw={500} className="mb-2">
            Workflow Inputs (Manual)
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
              No inputs added yet. Use "Fetch Workflow Inputs" or add manually.
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
      )}
      </Stack>
    </div>
  );
}

