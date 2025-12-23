/**
 * GitHub Actions Configuration Form Component
 * Captures GitHub Actions-specific build configuration with dynamic parameter fetching
 */

import { useState, useEffect } from 'react';
import { TextInput, Select, Stack, Button, Text, Alert, LoadingOverlay, Card, Badge, Group } from '@mantine/core';
import { IconPlus, IconTrash, IconRefresh, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { apiPost, getApiErrorMessage } from '~/utils/api-client';
import type { GitHubActionsConfig } from '~/types/release-config';
import type { GitHubActionsConfigFormProps } from '~/types/release-config-props';
import type { WorkflowParameter } from '~/.server/services/ReleaseManagement/integrations';
import { FIELD_LABELS, PLACEHOLDERS, BUTTON_LABELS } from '~/constants/release-config-ui';

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
  const [fetchedParameters, setFetchedParameters] = useState<WorkflowParameter[]>([]);
  
  const inputs = config.inputs || {};
  
  // Auto-select integration if only one exists
  useEffect(() => {
    if (availableIntegrations.length === 1 && !config.integrationId) {
      onChange({
        ...config,
        integrationId: availableIntegrations[0].id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableIntegrations.length, availableIntegrations[0]?.id]);
  
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
    const workflowUrl = config.workflowUrl || config.workflowPath;
    if (!workflowUrl?.trim()) {
      setFetchError('Please enter a workflow URL first');
      return;
    }
    
    if (!tenantId) {
      setFetchError('No tenant ID provided');
      return;
    }
    
    setFetchingParams(true);
    setFetchError(null);
    
    if (!config.integrationId) {
      setFetchError('Please select a GitHub integration first');
      setFetchingParams(false);
      return;
    }
    
    try {
      const result = await apiPost<{ parameters: WorkflowParameter[] }>(
        `/api/v1/tenants/${tenantId}/workflows/job-parameters`,
        {
          providerType: 'GITHUB_ACTIONS',
          integrationId: config.integrationId,
          url: workflowUrl,
        }
      );
      
      if (result.success && result.data?.parameters) {
        const fetchedParams = result.data.parameters.map((param) => {
          const hasChoices = (param as any).choices && (param as any).choices.length > 0;
          const hasOptions = param.options && param.options.length > 0;
          const options = hasOptions ? param.options : (hasChoices ? (param as any).choices : undefined);
          
          return {
            ...param,
            options,
          };
        });
        
        setFetchedParameters(fetchedParams);
        
        const newInputs: Record<string, string> = {};
        fetchedParams.forEach((param) => {
          newInputs[param.name] = 
            inputs[param.name] || 
            param.defaultValue?.toString() || 
            '';
        });
        
        onChange({
          ...config,
          inputs: newInputs,
          parameterDefinitions: fetchedParams,
        } as any);
        
        setParametersFetched(true);
      } else {
        setFetchError('Failed to fetch workflow inputs');
      }
    } catch (error) {
      setFetchError(getApiErrorMessage(error, 'Failed to fetch workflow inputs'));
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
      {/* Only show integration selector if multiple integrations exist */}
      {availableIntegrations.length > 1 && (
        <Select
          label="GitHub Integration"
          placeholder="Select GitHub Actions integration"
          data={availableIntegrations.map(i => ({ value: i.id, label: i.name }))}
          value={config.integrationId}
          onChange={(val) => onChange({ ...config, integrationId: val || '' })}
          required
          description="Choose the connected GitHub Actions integration"
        />
      )}
      
      {/* Show integration name if only one exists */}
      {availableIntegrations.length === 1 && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">GitHub Integration:</span> {availableIntegrations[0].name}
        </div>
      )}
      
      <TextInput
        label="Workflow URL"
        placeholder="https://github.com/owner/repo/blob/main/.github/workflows/build.yml"
        value={config.workflowUrl || config.workflowPath || ''}
        onChange={(e) => {
          const url = e.target.value;
          onChange({ 
            ...config, 
            workflowUrl: url,
            // Keep workflowPath for backward compatibility
            workflowPath: url.startsWith('http') ? undefined : url,
          });
        }}
        required
        description="Full GitHub URL to the workflow file. Supports both formats: /blob/branch/path (recommended) or /actions/workflows/file.yml (uses default branch)"
      />
      
      {/* Fetch Parameters Button */}
      <div>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={handleFetchParameters}
          loading={fetchingParams}
          disabled={!config.workflowUrl?.trim() && !config.workflowPath?.trim()}
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
                  
                  {param.options && param.options.length > 0 ? (
                    <Select
                      placeholder="Select a value"
                      data={param.options.map((option) => ({
                        value: option,
                        label: option,
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

