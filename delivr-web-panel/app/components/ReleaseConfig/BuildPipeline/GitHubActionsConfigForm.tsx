/**
 * GitHub Actions Configuration Form Component
 * Captures GitHub Actions-specific build configuration with dynamic parameter fetching
 */

import { useState, useEffect, useRef } from 'react';
import { TextInput, Select, Stack, Button, Text, Alert, LoadingOverlay, Card, Group } from '@mantine/core';
import { IconPlus, IconTrash, IconRefresh, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { apiPost } from '~/utils/api-client';
import { extractApiErrorWithResponse } from '~/utils/api-error-utils';
import type { GitHubActionsConfig } from '~/types/release-config';
import type { GitHubActionsConfigFormProps } from '~/types/release-config-props';
import type { WorkflowParameter } from '~/.server/services/ReleaseManagement/integrations';
import { FIELD_LABELS, PLACEHOLDERS, BUTTON_LABELS } from '~/constants/release-config-ui';
import { BUILD_PROVIDERS } from '~/types/release-config-constants';
import { AppBadge } from '~/components/Common/AppBadge';

export function GitHubActionsConfigForm({
  config,
  onChange,
  availableIntegrations,
  tenantId,
}: GitHubActionsConfigFormProps) {
  
  // Manual input entry state (legacy fallback) - DISABLED
  // const [newInputKey, setNewInputKey] = useState('');
  // const [newInputValue, setNewInputValue] = useState('');
  
  // Parameter fetching state
  const [fetchingParams, setFetchingParams] = useState(false);
  const [parametersFetched, setParametersFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedParameters, setFetchedParameters] = useState<WorkflowParameter[]>([]);
  
  const inputs = config.inputs || {};
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousUrlRef = useRef<string | undefined>(undefined);
  
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

  // Restore parameterDefinitions immediately if they exist
  useEffect(() => {
    if (config.parameterDefinitions && Array.isArray(config.parameterDefinitions)) {
      const restoredParams = config.parameterDefinitions.map((param: WorkflowParameter) => {
        const hasChoices = (param as any).choices && (param as any).choices.length > 0;
        const hasOptions = param.options && param.options.length > 0;
        const options = hasOptions ? param.options : (hasChoices ? (param as any).choices : undefined);
        
        return {
          ...param,
          options,
        };
      });
      
      setFetchedParameters(restoredParams);
      setParametersFetched(true);
    }
  }, [config.parameterDefinitions]);

  // Clear parameters and inputs when URL changes
  useEffect(() => {
    const workflowUrl = config.workflowUrl || config.workflowPath;
    
    // If URL changed (or became empty) and we have fetched parameters, clear them
    const urlChanged = previousUrlRef.current !== workflowUrl && previousUrlRef.current !== undefined;
    const urlCleared = !workflowUrl && previousUrlRef.current;
    
    if ((urlChanged || urlCleared) && (parametersFetched || config.parameterDefinitions)) {
      setFetchedParameters([]);
      setParametersFetched(false);
      setFetchError(null);
      
      // Clear inputs and parameterDefinitions
      onChange({
        ...config,
        inputs: {},
        parameterDefinitions: undefined,
      } as any);
    }
    
    previousUrlRef.current = workflowUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.workflowUrl, config.workflowPath]);

  // Manual input handlers - DISABLED
  // const handleAddInput = () => {
  //   if (newInputKey && newInputValue) {
  //     onChange({
  //       ...config,
  //       inputs: {
  //         ...inputs,
  //         [newInputKey]: newInputValue,
  //       },
  //     });
  //     setNewInputKey('');
  //     setNewInputValue('');
  //   }
  // };
  
  // Updated handleRemoveInput to work with fetched parameters
  const handleRemoveInput = (inputName: string) => {
    // If it's a fetched parameter, check if it's required
    if (parametersFetched) {
      const param = fetchedParameters.find(p => p.name === inputName);
      if (param?.required) {
        return; // Don't allow removing required parameters
      }
      
      // Remove from fetched parameters
      const updated = fetchedParameters.filter(p => p.name !== inputName);
      setFetchedParameters(updated);
      
      // Remove from inputs object
      const newInputs = { ...inputs };
      delete newInputs[inputName];
      
      onChange({
        ...config,
        inputs: newInputs,
        parameterDefinitions: updated,
      } as any);
    } else {
      // Fallback for non-fetched parameters (shouldn't happen now, but keeping for safety)
      const newInputs = { ...inputs };
      delete newInputs[inputName];
      onChange({
        ...config,
        inputs: newInputs,
      });
    }
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
          providerType: BUILD_PROVIDERS.GITHUB_ACTIONS,
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
        // Clear inputs and parameters on failure
        setFetchedParameters([]);
        setParametersFetched(false);
        onChange({
          ...config,
          inputs: {},
          parameterDefinitions: undefined,
        } as any);
      }
    } catch (error) {
      // Extract user-friendly error message using utility function
      const errorMessage = extractApiErrorWithResponse(error, 'Failed to fetch workflow inputs');
      setFetchError(errorMessage);
      // Clear inputs and parameters on failure
      setFetchedParameters([]);
      setParametersFetched(false);
      onChange({
        ...config,
        inputs: {},
        parameterDefinitions: undefined,
      } as any);
    } finally {
      setFetchingParams(false);
    }
  };

  // Debounced auto-fetch when URL/integrationId changes
  useEffect(() => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const workflowUrl = config.workflowUrl || config.workflowPath;
    // Only auto-fetch if we don't have parameterDefinitions and have required fields
    // The clear effect handles resetting state when URL changes, so we just need to check if we should fetch
    if (!config.parameterDefinitions && workflowUrl && config.integrationId && tenantId && !parametersFetched && !fetchingParams) {
      // Debounce the fetch by 1000ms
      debounceTimeoutRef.current = setTimeout(() => {
        handleFetchParameters();
      }, 1000);
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.workflowUrl, config.workflowPath, config.integrationId, config.parameterDefinitions, parametersFetched]);
  
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
          data={availableIntegrations.map(i => ({ value: i.id, label: i.displayName || i.name }))}
          value={config.integrationId}
          onChange={(val) => onChange({ ...config, integrationId: val || '' })}
          required
          description="Choose the connected GitHub Actions integration"
        />
      )}
      
      {/* Show integration name if only one exists */}
      {availableIntegrations.length === 1 && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">GitHub Integration:</span> {availableIntegrations[0].displayName || availableIntegrations[0].name}
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
                  <Group gap="xs" justify="space-between">
                    <Group gap="xs">
                      <Text size="sm" fw={600}>
                        {param.name}
                      </Text>
                      {param.required && (
                        <AppBadge
                          type="status"
                          value="error"
                          title="Required"
                          size="xs"
                        />
                      )}
                      <AppBadge
                        type="status"
                        value="neutral"
                        title={param.type}
                        size="xs"
                      />
                    </Group>
                    {!param.required && (
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        onClick={() => handleRemoveInput(param.name)}
                        leftSection={<IconTrash size={14} />}
                      >
                        Remove
                      </Button>
                    )}
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
      
      {/* Manual Input Entry (Fallback) - DISABLED */}
      {/* {!parametersFetched && (
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
      )} */}
      </Stack>
    </div>
  );
}

